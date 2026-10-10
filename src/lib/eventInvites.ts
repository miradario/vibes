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
