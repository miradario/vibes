export const GENDERS = [
  { id: 1, labelKey: "lookups.woman" },
  { id: 2, labelKey: "lookups.man" },
  { id: 3, labelKey: "lookups.more" },
] as const;

export const INTENTS = [
  { id: 1, labelKey: "lookups.women" },
  { id: 2, labelKey: "lookups.men" },
  { id: 3, labelKey: "lookups.everyone" },
] as const;

const translations = {
  es: {
    "lookups.woman": "Mujer",
    "lookups.man": "Hombre",
    "lookups.more": "Más",
    "lookups.women": "Mujeres",
    "lookups.men": "Hombres",
    "lookups.everyone": "Todos",
  },
  en: {
    "lookups.woman": "Woman",
    "lookups.man": "Man",
    "lookups.more": "More",
    "lookups.women": "Women",
    "lookups.men": "Men",
    "lookups.everyone": "Everyone",
  },
} as const;

export const getGenderLabel = (id?: number | null, locale: "es" | "en" = "en") => {
  const key = GENDERS.find((item) => item.id === id)?.labelKey;
  return key ? translations[locale][key] : null;
};

export const getIntentLabel = (id?: number | null, locale: "es" | "en" = "en") => {
  const key = INTENTS.find((item) => item.id === id)?.labelKey;
  return key ? translations[locale][key] : null;
};
