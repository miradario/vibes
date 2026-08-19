import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type DailyGuruMessage = {
  title: string;
  body: string;
};

const dailyGuruKeys = {
  all: ["daily-guru"] as const,
  daily: (dateKey: string) => [...dailyGuruKeys.all, dateKey] as const,
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const getStorageKey = (dateKey: string) => `vibes:home-guru-message:${dateKey}`;

const getOpenAIModel = () =>
  process.env.EXPO_PUBLIC_OPENAI_MODEL?.trim() || "gpt-4o-mini";

const getOpenAIAPIKey = () => process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim();

export const DAILY_GURU_FALLBACK: DailyGuruMessage = {
  title: "Toma una respiración profunda.",
  body:
    "Tu energía ya sabe hacia dónde abrirse. Elegí desde la calma y dejá que Vibes acerque lo que hoy resuena con vos.",
};

const GURU_PROMPT = [
  "Sos Guru Vibes, una guía breve y cálida dentro de una app de bienestar llamada Vibes.",
  "Respondé esta pregunta para la persona que abre la app hoy: ¿cómo tener un gran día?",
  "Escribí en español rioplatense, humano, sereno, espiritual y concreto.",
  "No uses listas, no uses comillas, no uses markdown, no uses hashtags.",
  "Devolvé un JSON con dos claves: title y body.",
  "title es una invitación corta de máximo 45 caracteres, en una sola oración.",
  "body desarrolla el gesto concreto para tener un gran día, máximo 180 caracteres.",
  "Que se sienta alentador, íntimo y distinto cada día.",
].join(" ");

const sanitize = (value: unknown) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

const generateWithOpenAI = async (): Promise<DailyGuruMessage> => {
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
            "Respond only with a JSON object shaped as {\"title\": string, \"body\": string}. No markdown, no alternatives.",
        },
        {
          role: "user",
          content: GURU_PROMPT,
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

  const parsed = JSON.parse(content) as { title?: unknown; body?: unknown };
  const title = sanitize(parsed.title);
  const body = sanitize(parsed.body);

  if (!title || !body) {
    throw new Error("OpenAI devolvió un mensaje incompleto");
  }

  return { title, body };
};

async function fetchOrCreateDailyGuruMessage(
  dateKey: string
): Promise<DailyGuruMessage> {
  const storageKey = getStorageKey(dateKey);

  try {
    const cached = await AsyncStorage.getItem(storageKey);
    if (cached) {
      const parsed = JSON.parse(cached) as DailyGuruMessage;
      const title = sanitize(parsed.title);
      const body = sanitize(parsed.body);
      if (title && body) return { title, body };
    }
  } catch (error) {
    console.warn("daily_guru:cache_read_failed", error);
  }

  let message = DAILY_GURU_FALLBACK;
  let generated = false;

  try {
    message = await generateWithOpenAI();
    generated = true;
  } catch (error) {
    console.warn("daily_guru:openai_fallback", error);
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

export const useDailyGuruMessageQuery = () => {
  const todayKey = getTodayKey();

  return useQuery<DailyGuruMessage>({
    queryKey: dailyGuruKeys.daily(todayKey),
    queryFn: () => fetchOrCreateDailyGuruMessage(todayKey),
    staleTime: 60_000,
  });
};
