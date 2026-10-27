import type { EventFeedItem } from "../queries/events.queries";
import { buildPublicContentUrl } from "./socialShare";
import { remainingUpcomingSessions } from "./eventSchedule";

function moreDates(event: EventFeedItem) {
  const more = remainingUpcomingSessions(event.schedule, event.startsAt);
  return more === 1 ? " (y 1 fecha más)" : more > 1 ? ` (y ${more} fechas más)` : "";
}

export function buildEventInvitation(event: EventFeedItem) {
  if (event.type !== "event" || !event.id)
    throw new Error("Evento no disponible");
  return [
    `Te invito a "${event.title}" en Vibes.`,
    event.date ? `${event.date}${moreDates(event)}` : null,
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
  const classId = getInvitedClassId(body);
  if (classId) return body.replace(`com.gurudevelopers.vibes://class/${classId}`, "").trim();
  const challengeId = getInvitedChallengeId(body);
  if (!challengeId) return body;
  return body.replace(new RegExp(`https://vibes\\.gurudevelopers\\.dev/challenge/${challengeId}`, "gi"), "").trim();
}

export type ClassInvitation = { id: string; title: string; date?: string; url: string | null };
export function buildClassInvitation(activity: ClassInvitation) {
  return [`Te invito a "${activity.title}" en Vibes.`, activity.date,
    `com.gurudevelopers.vibes://class/${encodeURIComponent(activity.id)}`, activity.url].filter(Boolean).join("\n");
}
export function getInvitedClassId(body: string) {
  return body.match(/com\.gurudevelopers\.vibes:\/\/class\/([A-Za-z0-9_-]{1,80})(?=$|[\s.,!?])/i)?.[1] ?? null;
}
