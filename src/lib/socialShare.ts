import { Share } from "react-native";
import type { EventFeedItem } from "../queries/events.queries";

const formatVisibilityLabel = (visibility?: string | null) => {
  if (visibility === "friends") return "Solo amigos";
  if (visibility === "private") return "Privado";
  return "Público";
};

export const shareChallengeInvite = async (challenge: EventFeedItem) => {
  const message = [
    `Te invito a sumarte a "${challenge.title}" en Vibes.`,
    challenge.subtitle || challenge.description || "Un ritual compartido para sostener en comunidad.",
    `Visibilidad: ${formatVisibilityLabel(challenge.visibility)}`,
    challenge.durationDays ? `${challenge.durationDays} días de práctica.` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return Share.share({ message });
};

export const shareChallengeProgress = async (
  challenge: EventFeedItem,
  input: { currentDay: number; totalDays: number; streak: number },
) => {
  const message = [
    `Hoy sigo presente en "${challenge.title}" en Vibes.`,
    `Día ${input.currentDay}/${input.totalDays}.`,
    input.streak > 0 ? `Racha actual: ${input.streak} días.` : null,
    "Volver a uno mismo también se comparte.",
  ]
    .filter(Boolean)
    .join("\n");

  return Share.share({ message });
};

export const shareEventInvite = async (event: EventFeedItem) => {
  const message = [
    `Te invito a este evento en Vibes: "${event.title}".`,
    event.subtitle || event.description || "Un espacio para conectar con calma.",
    event.date || null,
    event.location || event.onlineLink || null,
  ]
    .filter(Boolean)
    .join("\n");

  return Share.share({ message });
};

export const shareMeditationMilestone = async (input: {
  durationMinutes: number;
  meditationType: "silent" | "guided";
}) => {
  const typeLabel =
    input.meditationType === "silent" ? "meditación en silencio" : "meditación guiada";
  const message = [
    `Hoy elegí volver a mí con ${input.durationMinutes} minutos de ${typeLabel} en Vibes.`,
    "Respirar también es avanzar.",
  ].join("\n");

  return Share.share({ message });
};
