export const VIBES_ONBOARDING_STEPS = [
  "purpose",
  "energy",
  "profile",
  "practices",
  "completion",
] as const;

export type VibesOnboardingStep = (typeof VIBES_ONBOARDING_STEPS)[number];

export type OnboardingOption = {
  id: string;
  label: string;
  icon: string;
  tone: "mustard" | "coral" | "blue" | "sage" | "lavender" | "cream";
};

export const PURPOSE_OPTIONS: OnboardingOption[] = [
  {
    id: "deep_conversations",
    label: "Conversaciones profundas",
    icon: "chatbubble-ellipses-outline",
    tone: "lavender",
  },
  {
    id: "personal_growth",
    label: "Crecimiento personal",
    icon: "leaf-outline",
    tone: "sage",
  },
  {
    id: "friendship",
    label: "Amistad",
    icon: "people-outline",
    tone: "blue",
  },
  {
    id: "events",
    label: "Eventos",
    icon: "calendar-outline",
    tone: "mustard",
  },
  {
    id: "spirituality",
    label: "Espiritualidad",
    icon: "flower-outline",
    tone: "lavender",
  },
  {
    id: "inspiration",
    label: "Inspiración",
    icon: "sunny-outline",
    tone: "blue",
  },
];

export const ENERGY_OPTIONS: OnboardingOption[] = [
  { id: "calm", label: "Calmado", icon: "water-outline", tone: "lavender" },
  { id: "open", label: "Abierto", icon: "heart-outline", tone: "sage" },
  { id: "reflective", label: "Reflexivo", icon: "radio-button-on-outline", tone: "blue" },
  { id: "curious", label: "Curioso", icon: "search-outline", tone: "mustard" },
  { id: "social", label: "Social", icon: "people-outline", tone: "coral" },
  { id: "healing", label: "Sanando", icon: "leaf-outline", tone: "lavender" },
];

export const AGE_RANGES = [
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55+",
] as const;

export const PRACTICE_OPTIONS = [
  "Meditación",
  "Yoga",
  "Art of Living",
  "Mindfulness",
  "Running",
  "Bikram",
  "Vipassana",
  "Ashtanga",
  "Baile",
  "Canto",
  "Tantra",
  "Música",
  "Otras",
] as const;

export const STEP_COPY: Record<
  VibesOnboardingStep,
  { title: string; subtitle: string; button: string }
> = {
  purpose: {
    title: "¿Qué te trae a Vibes?",
    subtitle: "Elegí lo que más resuene con vos",
    button: "Siguiente",
  },
  energy: {
    title: "¿Cómo te sentís hoy?",
    subtitle: "Tu energía nos ayuda a crear mejores conexiones",
    button: "Siguiente",
  },
  profile: {
    title: "Contanos sobre vos",
    subtitle: "Así vas a poder mostrarte tal como sos",
    button: "Siguiente",
  },
  practices: {
    title: "Prácticas que te inspiran",
    subtitle: "Seleccioná las que forman parte de tu camino",
    button: "Siguiente",
  },
  completion: {
    title: "Tu vibe está listo.",
    subtitle: "Empecemos este viaje juntos.",
    button: "Entrar a Vibes",
  },
};
