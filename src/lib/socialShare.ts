import { Share } from "react-native";
import type { EventFeedItem } from "../queries/events.queries";

export const VIBES_PUBLIC_ORIGIN = "https://vibes.gurudevelopers.dev";

const formatVisibilityLabel = (visibility?: string | null) => {
  if (visibility === "friends") return "Solo amigos";
  if (visibility === "private") return "Privado";
  return "Público";
};

export const buildPublicContentUrl = (
  content: Pick<EventFeedItem, "id" | "type">,
) =>
  content.id
    ? `${VIBES_PUBLIC_ORIGIN}/${content.type}/${encodeURIComponent(content.id)}`
    : null;

export const shareChallengeInvite = async (challenge: EventFeedItem) => {
  const challengeUrl = buildPublicContentUrl(challenge);
  const message = [
    `Te invito a sumarte a "${challenge.title}" en Vibes.`,
    challenge.subtitle || challenge.description || "Un ritual compartido para sostener en comunidad.",
    `Visibilidad: ${formatVisibilityLabel(challenge.visibility)}`,
    challenge.durationDays ? `${challenge.durationDays} días de práctica.` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return Share.share({ message, url: challengeUrl ?? undefined });
};

export const shareChallengeProgress = async (
  challenge: EventFeedItem,
  input: { currentDay: number; totalDays: number; streak: number },
) => {
  const challengeUrl = buildPublicContentUrl(challenge);
  const message = [
    `Hoy sigo presente en "${challenge.title}" en Vibes.`,
    `Día ${input.currentDay}/${input.totalDays}.`,
    input.streak > 0 ? `Racha actual: ${input.streak} días.` : null,
    "Volver a uno mismo también se comparte.",
  ]
    .filter(Boolean)
    .join("\n");

  return Share.share({ message, url: challengeUrl ?? undefined });
};

export const shareEventInvite = async (event: EventFeedItem) => {
  const eventUrl = buildPublicContentUrl(event);
  const message = [
    `Te invito a este evento en Vibes: "${event.title}".`,
    event.subtitle || event.description || "Un espacio para conectar con calma.",
    event.date || null,
    event.location || event.onlineLink || null,
  ]
    .filter(Boolean)
    .join("\n");

  return Share.share({ message, url: eventUrl ?? undefined });
};
