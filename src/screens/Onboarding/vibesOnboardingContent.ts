import { COMMUNITY_OPTIONS } from "../../lib/communities";
export const VIBES_ONBOARDING_STEPS = [
  "profileText",
  "profile",
  "continueChoice",
  "purpose",
  "location",
  "practices",
  "identity",
  "interests",
  "completion",
] as const;

export type VibesOnboardingStep = (typeof VIBES_ONBOARDING_STEPS)[number];

export type OnboardingOption = {
  id: string;
  label: string;
  icon: string;
  tone: "mustard" | "coral" | "blue" | "sage" | "lavender" | "cream";
  /** Texto visible cuando difiere del valor guardado en `label`. */
  displayLabel?: string;
};

export const PURPOSE_OPTIONS: OnboardingOption[] = [
  { id: "service", label: "Hacer servicio", displayLabel: "Ayudar", icon: "heart-outline", tone: "coral" },
  { id: "challenges", label: "Desafíos", icon: "trophy-outline", tone: "mustard" },
  { id: "discover", label: "Conocer Gente (Descubrir)", displayLabel: "Conocer Gente", icon: "people-outline", tone: "blue" },
  { id: "dating", label: "Citas", icon: "heart-outline", tone: "coral" },
  { id: "events", label: "Eventos", icon: "calendar-outline", tone: "mustard" },
  { id: "classes", label: "Clases", icon: "school-outline", tone: "blue" },
  { id: "all", label: "¡Todas!", icon: "sparkles-outline", tone: "coral" },
];

// `label` se guarda en open_to; se mantiene "Hacer servicio" para no romper perfiles existentes.
export const getPurposeDisplayLabel = (label: string): string =>
  PURPOSE_OPTIONS.find(option => option.label === label)?.displayLabel ?? label;

export const togglePurposeSelection = (selected: string[], id: string): string[] => {
  const options = PURPOSE_OPTIONS.map(option => option.id);
  if (id === "all") return selected.includes("all") ? [] : options;
  const next = selected.filter(value => value !== "all" && value !== id);
  if (!selected.includes(id)) next.push(id);
  return options.filter(value => value !== "all").every(value => next.includes(value)) ? [...next, "all"] : next;
};

export const ENERGY_OPTIONS: OnboardingOption[] = [
  { id: "calm", label: "Calmado", icon: "water-outline", tone: "lavender" },
  { id: "open", label: "Abierto", icon: "heart-outline", tone: "sage" },
  {
    id: "reflective",
    label: "Reflexivo",
    icon: "radio-button-on-outline",
    tone: "blue",
  },
  { id: "curious", label: "Curioso", icon: "search-outline", tone: "mustard" },
  { id: "social", label: "Social", icon: "people-outline", tone: "coral" },
  { id: "healing", label: "Óptimo", icon: "leaf-outline", tone: "lavender" },
];

export const AGE_RANGES = ["18-24", "25-34", "35-44", "45-54", "55+"] as const;

export const PRACTICE_OPTIONS: readonly string[] = COMMUNITY_OPTIONS;

export const STEP_COPY: Record<
  VibesOnboardingStep,
  { title: string; subtitle: string; button: string }
> = {
  purpose: {
    title: "¿Qué te trae a Vibes?",
    subtitle: "Elegí lo que más resuene con vos",
    button: "Siguiente",
  },
  continueChoice: {
    title: "¿Querés seguir completando tu perfil?",
    subtitle: "Ya tenés lo necesario para entrar. Podés completar el resto ahora o más adelante desde tu perfil.",
    button: "Seguir completando",
  },
  profile: {
    title: "Tu foto de perfil",
    subtitle: "Podés agregar una foto ahora o hacerlo más adelante",
    button: "Siguiente",
  },
  profileText: {
    title: "Contanos sobre vos",
    subtitle: "Completá tu nombre y apellido. La descripción es opcional",
    button: "Siguiente",
  },
  location: {
    title: "¿De dónde sos?",
    subtitle: "Ingresá tu ciudad o usá tu ubicación una sola vez",
    button: "Siguiente",
  },
  practices: {
    title: "Tus comunidades",
    subtitle: "Elegí una o varias. Serán tus filtros por defecto en la app",
    button: "Siguiente",
  },
  identity: {
    title: "Un poco más sobre vos",
    subtitle: "Todo es opcional",
    button: "Siguiente",
  },
  interests: {
    title: "Lo que disfrutás",
    subtitle: "Todo es opcional",
    button: "Siguiente",
  },

  completion: {
    title: "Tu vibe está listo.",
    subtitle: "Empecemos este viaje juntos.",
    button: "Entrar a Vibes",
  },
};
