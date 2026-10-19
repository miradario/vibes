import type { EventFeedItem } from "../queries/events.queries";
import { buildPublicContentUrl } from "./socialShare";

export function buildEventInvitation(event: EventFeedItem) {
  if (event.type !== "event" || !event.id)
    throw new Error("Evento no disponible");
  return [
    `Te invito a "${event.title}" en Vibes.`,
    event.date || null,
    buildPublicContentUrl(event),
  ]
    .filter(Boolean)
    .join("\n");
}

export function getInvitedEventId(body: string) {
  const match = body.match(
    /https:\/\/vibes\.gurudevelopers\.dev\/event\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?=$|[\s.,!?])/i
  );
  return match?.[1] ?? null;
}

export function buildChallengeInvitation(challenge: EventFeedItem) {
  if (challenge.type !== "challenge" || !challenge.id) throw new Error("Desafío no disponible");
  return [
    `Te invito a sumarte a "${challenge.title}" en Vibes.`,
    challenge.durationDays ? `${challenge.durationDays} días para compartir.` : null,
    buildPublicContentUrl(challenge),
  ].filter(Boolean).join("\n");
}

export function getInvitedChallengeId(body: string) {
  const match = body.match(/https:\/\/vibes\.gurudevelopers\.dev\/challenge\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?=$|[\s.,!?])/i);
  return match?.[1] ?? null;
}

// Keep the destination in the stored message for navigation, but hide it in chat.
export function getInvitationDisplayText(body: string) {
  const challengeId = getInvitedChallengeId(body);
  if (!challengeId) return body;
  return body.replace(new RegExp(`https://vibes\\.gurudevelopers\\.dev/challenge/${challengeId}`, "gi"), "").trim();
}
