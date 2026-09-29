export const EVENT_MODALITIES = [
  { id: "in_person", label: "Presencial" },
  { id: "online", label: "Online" },
] as const;

export const EVENT_CATEGORIES = [
  { id: "party", label: "Fiesta" },
  { id: "music", label: "Música" },
  { id: "wellness", label: "Meditación y bienestar" },
  { id: "arts", label: "Arte y cultura" },
  { id: "food", label: "Gastronomía" },
  { id: "movement", label: "Deporte y movimiento" },
  { id: "learning", label: "Talleres y aprendizaje" },
  { id: "community", label: "Networking y comunidad" },
  { id: "volunteering", label: "Voluntariado" },
  { id: "spirituality", label: "Espiritualidad" },
] as const;

export const EVENT_PARTICIPATION_TYPES = [
  { id: "interactive", label: "Interactivo", description: "Los asistentes participan." },
  { id: "show", label: "Show", description: "El público mira o escucha." },
  { id: "workshop", label: "Taller", description: "Aprenden y practican." },
  { id: "meetup", label: "Encuentro", description: "Socializan y conectan." },
  { id: "guided", label: "Experiencia guiada", description: "Una persona conduce la actividad." },
  { id: "talk", label: "Clase o charla", description: "Un referente enseña o presenta." },
  { id: "fair", label: "Feria", description: "Recorren distintos puestos o propuestas." },
] as const;

export type EventCategory = typeof EVENT_CATEGORIES[number]["id"];
export type EventParticipationType = typeof EVENT_PARTICIPATION_TYPES[number]["id"];
export const parseEventCategory = (value: unknown): EventCategory | null =>
  EVENT_CATEGORIES.find((option) => option.id === value)?.id ?? null;
export const parseEventParticipationType = (value: unknown): EventParticipationType | null =>
  EVENT_PARTICIPATION_TYPES.find((option) => option.id === value)?.id ?? null;
export const getEventCategoryLabel = (value: unknown) =>
  EVENT_CATEGORIES.find((option) => option.id === value)?.label ?? "";
export const getEventParticipationLabel = (value: unknown) =>
  EVENT_PARTICIPATION_TYPES.find((option) => option.id === value)?.label ?? "";

export const matchesEventClassification = (
  event: { category?: EventCategory | null; participationType?: EventParticipationType | null; modality?: "in_person" | "online" | null },
  category: EventCategory | null,
  participationType: EventParticipationType | null,
  modality: "in_person" | "online" | null = null,
) => (!category || event.category === category) && (!participationType || event.participationType === participationType) && (!modality || event.modality === modality);
