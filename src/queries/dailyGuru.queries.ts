import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import type { Locale } from "../i18n/translations";

export type DailyGuruMessage = {
  title: string;
  body: string;
  detail: string;
  actions: string[];
};

export type DailyGuruContext = {
  userId?: string;
  ready?: boolean;
  locale?: Locale;
  firstName?: string;
  age?: string;
  location?: string;
  preferences?: string[];
};

const dailyGuruKeys = {
  all: ["daily-guru"] as const,
  daily: (dateKey: string, userId?: string, contextKey?: string) =>
    [...dailyGuruKeys.all, dateKey, userId ?? "anonymous", contextKey ?? ""] as const,
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const getStorageKey = (dateKey: string, userId?: string, locale?: Locale) =>
  `vibes:home-guru-message:${userId ?? "anonymous"}:${locale ?? "es-AR"}:${dateKey}:v2`;

const getOpenAIModel = () =>
  process.env.EXPO_PUBLIC_OPENAI_MODEL?.trim() || "gpt-4o-mini";

const getOpenAIAPIKey = () => process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim();

const getGuideTitle = (locale?: Locale) =>
  locale === "en" ? "How to have a great day" : "Cómo tener un gran día";

export const getDailyGuruFallback = (locale?: Locale): DailyGuruMessage =>
  locale === "en"
    ? {
        title: getGuideTitle(locale),
        body:
          "Start with a simple intention: protect your energy and choose one action that moves you toward what you need today.",
        detail:
          "Everything does not have to go perfectly for this to be a great day. Notice how you want to feel, choose a realistic pace, and make room for one thing that genuinely supports you.",
        actions: [
          "Set an intention before looking at your task list.",
          "Start with one small task that gives you momentum.",
          "End the day by noticing something you enjoyed or learned.",
        ],
      }
    : {
        title: getGuideTitle(locale),
        body:
          "Empezá con una intención simple: cuidá tu energía y elegí una acción que te acerque a lo que hoy necesitás.",
        detail:
          "No hace falta que todo salga perfecto para que sea un gran día. Prestá atención a cómo querés sentirte, elegí un ritmo posible y reservá un momento para algo que te haga bien.",
        actions: [
          "Definí una intención para hoy antes de mirar tus pendientes.",
          "Hacé primero una tarea pequeña que te dé impulso.",
          "Cerrá el día reconociendo algo que disfrutaste o aprendiste.",
        ],
      };

const buildGuruPrompt = (context: DailyGuruContext) => {
  const personalContext = [
    context.firstName ? `Nombre: ${context.firstName}` : null,
    context.age ? `Edad: ${context.age}` : null,
    context.location ? `Lugar: ${context.location}` : null,
    context.preferences?.length
      ? `Intereses y preferencias: ${context.preferences.slice(0, 8).join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join(". ");

  return [
    "Sos Guru Vibes, una guía cálida dentro de una app de bienestar llamada Vibes.",
    "Creá una guía personal para responder: ¿cómo puede esta persona tener un gran día hoy?",
    personalContext ? `Contexto de la persona: ${personalContext}.` : null,
    "Usá el contexto con sutileza; no repitas datos personales ni hagas diagnósticos.",
    "Escribí en español rioplatense, humano, sereno, concreto y sin frases vacías.",
    "Devolvé JSON con body, detail y actions.",
    "body es el adelanto para una tarjeta, máximo 160 caracteres.",
    "detail desarrolla el consejo en un párrafo de 300 a 550 caracteres.",
    "actions contiene exactamente tres acciones breves, realistas y diferentes para hoy.",
    "No uses markdown, hashtags ni comillas decorativas.",
    context.locale === "en"
      ? "Write the entire response in natural English."
      : "Escribí toda la respuesta en español rioplatense.",
  ]
    .filter(Boolean)
    .join(" ");
};

const sanitize = (value: unknown) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

const parseGeneratedMessage = (
  value: unknown,
  locale?: Locale,
): DailyGuruMessage => {
  const parsed = value as {
    body?: unknown;
    detail?: unknown;
    actions?: unknown;
  };
  const body = sanitize(parsed?.body);
  const detail = sanitize(parsed?.detail);
  const actions = Array.isArray(parsed?.actions)
    ? parsed.actions.map(sanitize).filter(Boolean).slice(0, 3)
    : [];
  if (!body || !detail || actions.length !== 3) {
    throw new Error("La guía generada está incompleta");
  }
  return { title: getGuideTitle(locale), body, detail, actions };
};

const generateWithEdgeFunction = async (
  context: DailyGuruContext,
): Promise<DailyGuruMessage> => {
  const { data, error } = await supabase.functions.invoke("daily-guide", {
    body: {
      firstName: context.firstName,
      age: context.age,
      location: context.location,
      preferences: context.preferences,
      locale: context.locale,
    },
  });
  if (error) throw error;
  return parseGeneratedMessage(data, context.locale);
};

const generateWithOpenAI = async (
  context: DailyGuruContext,
): Promise<DailyGuruMessage> => {
  const apiKey = getOpenAIAPIKey();
  const model = getOpenAIModel();

  if (!apiKey) {
    throw new Error("Falta EXPO_PUBLIC_OPENAI_API_KEY");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Respond only with a JSON object shaped as {\"body\": string, \"detail\": string, \"actions\": string[]}. No markdown, no alternatives.",
        },
        {
          role: "user",
          content: buildGuruPrompt(context),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI respondió ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!content) {
    throw new Error("OpenAI no devolvió contenido");
  }

  const parsed = JSON.parse(content) as {
    body?: unknown;
    detail?: unknown;
    actions?: unknown;
  };
  const body = sanitize(parsed.body);
  const detail = sanitize(parsed.detail);
  const actions = Array.isArray(parsed.actions)
    ? parsed.actions.map(sanitize).filter(Boolean).slice(0, 3)
    : [];

  if (!body || !detail || actions.length !== 3) {
    throw new Error("OpenAI devolvió un mensaje incompleto");
  }

  return {
    title: getGuideTitle(context.locale),
    body,
    detail,
    actions,
  };
};

async function fetchOrCreateDailyGuruMessage(
  dateKey: string,
  context: DailyGuruContext,
): Promise<DailyGuruMessage> {
  const storageKey = getStorageKey(dateKey, context.userId, context.locale);

  try {
    const cached = await AsyncStorage.getItem(storageKey);
    if (cached) {
      const parsed = JSON.parse(cached) as DailyGuruMessage;
      const title = sanitize(parsed.title);
      const body = sanitize(parsed.body);
      const detail = sanitize(parsed.detail);
      const actions = Array.isArray(parsed.actions)
        ? parsed.actions.map(sanitize).filter(Boolean).slice(0, 3)
        : [];
      if (title && body && detail && actions.length === 3) {
        return { title, body, detail, actions };
      }
    }
  } catch (error) {
    console.warn("daily_guru:cache_read_failed", error);
  }

  let message = getDailyGuruFallback(context.locale);
  let generated = false;

  try {
    message = await generateWithEdgeFunction(context);
    generated = true;
  } catch (edgeError) {
    try {
      message = await generateWithOpenAI(context);
      generated = true;
    } catch (openAIError) {
      console.warn("daily_guru:ai_fallback", { edgeError, openAIError });
    }
  }

  if (generated) {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(message));
    } catch (error) {
      console.warn("daily_guru:cache_write_failed", error);
    }
  }

  return message;
}

export const useDailyGuruMessageQuery = (context: DailyGuruContext) => {
  const todayKey = getTodayKey();
  const contextKey = JSON.stringify({
    firstName: context.firstName,
    age: context.age,
    location: context.location,
    preferences: context.preferences,
    locale: context.locale,
  });

  return useQuery<DailyGuruMessage>({
    queryKey: dailyGuruKeys.daily(todayKey, context.userId, contextKey),
    queryFn: () => fetchOrCreateDailyGuruMessage(todayKey, context),
    enabled: Boolean(context.userId && context.ready),
    staleTime: 60_000,
  });
};
