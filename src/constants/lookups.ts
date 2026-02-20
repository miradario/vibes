export const GENDERS = [
  { id: 1, label: "Woman" },
  { id: 2, label: "Man" },
  { id: 3, label: "More" },
] as const;

export const INTENTS = [
  { id: 1, label: "Women" },
  { id: 2, label: "Man" },
  { id: 3, label: "Everyone" },
] as const;

export const getGenderLabel = (id?: number | null) =>
  GENDERS.find((item) => item.id === id)?.label ?? null;

export const getIntentLabel = (id?: number | null) =>
  INTENTS.find((item) => item.id === id)?.label ?? null;
