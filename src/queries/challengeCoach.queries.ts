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

    return `${input.title} puede empezar suave hoy. Elegí un gesto pequeño, presente y amable para volver al desafío.`;
  }

  if (checkedInToday) {
    return `Ya sembraste tu energía de hoy en ${input.title}. Sostené la calma y dejá que esa práctica te acompañe el resto del día.`;
  }

  if (streak > 0) {
    return `Seguís en ${input.title}${day ? `, día ${day}` : ""}. Regalate un momento simple hoy para cuidar la racha sin exigencia.`;
  }

  return `Hoy ${input.title} puede empezar suave. Elegí un gesto pequeño, presente y amable con vos para volver al desafío.`;
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

  const generatedBody = buildFallbackMessage(input);
  const model: string | null = null;

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
