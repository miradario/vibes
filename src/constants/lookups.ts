export const INTENTS = [
  { id: 1, labelKey: "lookups.women" },
  { id: 2, labelKey: "lookups.men" },
  { id: 3, labelKey: "lookups.everyone" },
] as const;

const translations = {
  es: {
    "lookups.women": "Mujeres",
    "lookups.men": "Hombres",
    "lookups.everyone": "Todos",
  },
  en: {
    "lookups.women": "Women",
    "lookups.men": "Men",
    "lookups.everyone": "Everyone",
  },
} as const;

export const getIntentLabel = (id?: number | null, locale: "es" | "en" = "en") => {
  const key = INTENTS.find((item) => item.id === id)?.labelKey;
  return key ? translations[locale][key] : null;
};
