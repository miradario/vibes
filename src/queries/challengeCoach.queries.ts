import { Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { ChallengeParticipant } from "./events.queries";
import type { Locale } from "../i18n/translations";

export type ChallengeCoachMessage = {
  id: string;
  challengeId: string;
  userId: string;
  messageDate: string;
  body: string;
  model: string | null;
  createdAt: string;
};

type DailyChallengeCoachInput = {
  challengeId: string;
  title: string;
  subtitle?: string | null;
  durationDays?: number | null;
  startsAt?: string | null;
  participant?: ChallengeParticipant | null;
  locale?: Locale;
};

const challengeCoachKeys = {
  all: ["challenge-coach"] as const,
  daily: (challengeId?: string, userId?: string, dateKey?: string) =>
    [...challengeCoachKeys.all, challengeId ?? "none", userId ?? "anon", dateKey ?? "today"] as const,
  list: (challengeId?: string, userId?: string) =>
    [...challengeCoachKeys.all, "list", challengeId ?? "none", userId ?? "anon"] as const,
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const getOllamaBaseUrl = () => {
  const fromEnv = process.env.EXPO_PUBLIC_OLLAMA_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return Platform.OS === "android"
    ? "http://10.0.2.2:11434"
    : "http://127.0.0.1:11434";
};

const getOllamaModel = () =>
  process.env.EXPO_PUBLIC_OLLAMA_MODEL?.trim() || "minimax-m2.5:cloud";

const getChallengeDay = (startsAt?: string | null) => {
  if (!startsAt) return null;
  const startDate = new Date(startsAt);
  if (Number.isNaN(startDate.getTime())) return null;
  const today = new Date();
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.floor((current.getTime() - start.getTime()) / 86_400_000);
  return diffDays >= 0 ? diffDays + 1 : null;
};

const buildFallbackMessage = (input: DailyChallengeCoachInput) => {
  const streak = input.participant?.streak ?? 0;
  const checkedInToday = Boolean(input.participant?.checkedInToday);
  const day = getChallengeDay(input.startsAt);
  const locale = input.locale ?? "es";

  if (locale === "en") {
    if (checkedInToday) {
      return `You already showed up for ${input.title} today. Stay gentle with yourself and let this practice keep holding you through the rest of the day.`;
    }

    if (streak > 0) {
      return `You're still with ${input.title}${day ? `, day ${day}` : ""}. Give yourself one simple moment today to protect your rhythm without pressure.`;
    }

    return `${input.title} can begin softly today. Choose one small, present and kind gesture to come back to the challenge.`;
  }

  if (checkedInToday) {
    return `Ya sembraste tu energía de hoy en ${input.title}. Sostené la calma y dejá que esa práctica te acompañe el resto del día.`;
  }

  if (streak > 0) {
    return `Seguís en ${input.title}${day ? `, día ${day}` : ""}. Regalate un momento simple hoy para cuidar la racha sin exigencia.`;
  }

  return `Hoy ${input.title} puede empezar suave. Elegí un gesto pequeño, presente y amable con vos para volver al desafío.`;
};

const buildPrompt = (input: DailyChallengeCoachInput) => {
  const streak = input.participant?.streak ?? 0;
  const totalCheckins = input.participant?.totalCheckins ?? 0;
  const challengeDay = getChallengeDay(input.startsAt);
  const locale = input.locale ?? "es";

  if (locale === "en") {
    const checkedInToday = input.participant?.checkedInToday ? "yes" : "no";

    return [
      "You are a brief, warm guide for a wellbeing challenge inside an app called Vibes.",
      "Write ONLY one short message in English, human, calm, spiritual and concrete.",
      "Do not use lists, quotes, markdown or hashtags.",
      "Maximum 220 characters.",
      "It should feel encouraging, serene and intimate.",
      `Challenge: ${input.title}.`,
      input.subtitle ? `Context: ${input.subtitle}.` : null,
      input.durationDays ? `Total duration: ${input.durationDays} days.` : null,
      challengeDay ? `Current challenge day: ${challengeDay}.` : null,
      `Current streak: ${streak}.`,
      `Total check-ins: ${totalCheckins}.`,
      `Checked in today: ${checkedInToday}.`,
      "Invite the user to come back to themselves or sustain today's practice with a soft and beautiful tone.",
    ]
      .filter(Boolean)
      .join(" ");
  }

  const checkedInToday = input.participant?.checkedInToday ? "sí" : "no";

  return [
    "Sos una guia breve y calida para un challenge de bienestar dentro de una app llamada Vibes.",
    "Escribí SOLO un mensaje corto en español rioplatense, humano, espiritual y concreto.",
    "No uses listas, no uses comillas, no uses markdown, no uses hashtags.",
    "Máximo 220 caracteres.",
    "Tiene que sonar alentador, sereno y íntimo.",
    `Challenge: ${input.title}.`,
    input.subtitle ? `Contexto: ${input.subtitle}.` : null,
    input.durationDays ? `Duración total: ${input.durationDays} días.` : null,
    challengeDay ? `Día actual del challenge: ${challengeDay}.` : null,
    `Racha actual del usuario: ${streak}.`,
    `Check-ins totales: ${totalCheckins}.`,
    `¿Ya hizo check-in hoy?: ${checkedInToday}.`,
    "Invitalo a volver a sí mismo o sostener su práctica hoy, con un tono suave y lindo.",
  ]
    .filter(Boolean)
    .join(" ");
};

const generateWithOllama = async (input: DailyChallengeCoachInput) => {
  const response = await fetch(`${getOllamaBaseUrl()}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getOllamaModel(),
      prompt: buildPrompt(input),
      stream: false,
      options: {
        temperature: 0.85,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama respondió ${response.status}`);
  }

  const data = (await response.json()) as { response?: string };
  const message = typeof data.response === "string" ? data.response.trim() : "";
  if (!message) {
    throw new Error("Ollama no devolvió contenido");
  }

  return {
    body: message.replace(/\s+/g, " ").trim(),
    model: getOllamaModel(),
  };
};

const mapRow = (row: any): ChallengeCoachMessage => ({
  id: String(row.id),
  challengeId: String(row.challenge_id),
  userId: String(row.user_id),
  messageDate: String(row.message_date),
  body: String(row.body),
  model: typeof row.model === "string" ? row.model : null,
  createdAt: String(row.created_at),
});

async function fetchOrCreateDailyChallengeCoachMessage(
  input: DailyChallengeCoachInput,
  userId: string,
): Promise<ChallengeCoachMessage | null> {
  const todayKey = getTodayKey();

  const { data: existing, error: existingError } = await supabase
    .from("challenge_ai_messages")
    .select("*")
    .eq("challenge_id", input.challengeId)
    .eq("user_id", userId)
    .eq("message_date", todayKey)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return mapRow(existing);

  let generatedBody = buildFallbackMessage(input);
  let model: string | null = null;

  try {
    const generated = await generateWithOllama(input);
    generatedBody = generated.body;
    model = generated.model;
  } catch (error) {
    console.warn("challenge_coach:ollama_fallback", error);
  }

  const { data: inserted, error: insertError } = await supabase
    .from("challenge_ai_messages")
    .upsert(
      {
        challenge_id: input.challengeId,
        user_id: userId,
        message_date: todayKey,
        body: generatedBody,
        model,
      },
      { onConflict: "challenge_id,user_id,message_date" },
    )
    .select("*")
    .single();

  if (insertError) throw insertError;
  return inserted ? mapRow(inserted) : null;
}

export const useDailyChallengeCoachMessageQuery = (
  input: DailyChallengeCoachInput | null,
  userId?: string,
) => {
  const todayKey = getTodayKey();

  return useQuery<ChallengeCoachMessage | null>({
    queryKey: challengeCoachKeys.daily(
      input?.challengeId,
      userId,
      `${todayKey}:${input?.locale ?? "es"}`,
    ),
    queryFn: () => fetchOrCreateDailyChallengeCoachMessage(input!, userId!),
    enabled: Boolean(input?.challengeId && userId),
    staleTime: 60_000,
  });
};

export const useChallengeCoachMessagesQuery = (
  challengeId?: string,
  userId?: string,
) => {
  return useQuery<ChallengeCoachMessage[]>({
    queryKey: challengeCoachKeys.list(challengeId, userId),
    queryFn: async () => {
      if (!challengeId || !userId) return [];

      const { data, error } = await supabase
        .from("challenge_ai_messages")
        .select("*")
        .eq("challenge_id", challengeId)
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return (data ?? []).map(mapRow);
    },
    enabled: Boolean(challengeId && userId),
    staleTime: 60_000,
  });
};
