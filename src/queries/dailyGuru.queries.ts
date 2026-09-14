import { useQuery } from "@tanstack/react-query";
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
  all: ["daily-guru-local"] as const,
  daily: (dateKey: string, userId?: string, locale?: Locale) =>
    [...dailyGuruKeys.all, dateKey, userId ?? "anonymous", locale ?? "es-AR"] as const,
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);

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

export const useDailyGuruMessageQuery = (context: DailyGuruContext) => {
  const todayKey = getTodayKey();

  return useQuery<DailyGuruMessage>({
    queryKey: dailyGuruKeys.daily(todayKey, context.userId, context.locale),
    queryFn: () => getDailyGuruFallback(context.locale),
    enabled: Boolean(context.userId && context.ready),
    staleTime: Infinity,
  });
};
