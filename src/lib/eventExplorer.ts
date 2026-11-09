import { normalizeSchedule } from "./eventSchedule";

type ScheduledEvent = { id: string; startsAt?: string | null; schedule?: unknown };
export function eventDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function calendarOccurrences<T extends ScheduledEvent>(events: T[]) {
  return events.flatMap(event => normalizeSchedule(event.schedule, event.startsAt).map(session => ({
    event, startsAt: session.startsAt, day: eventDayKey(new Date(session.startsAt)),
  }))).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}
export function hasEventCoordinates(event: { modality?: string | null; locationLatitude?: number | null; locationLongitude?: number | null }) {
  return event.modality !== "online" && typeof event.locationLatitude === "number" &&
    Number.isFinite(event.locationLatitude) && Math.abs(event.locationLatitude) <= 90 &&
    typeof event.locationLongitude === "number" && Number.isFinite(event.locationLongitude) && Math.abs(event.locationLongitude) <= 180;
}
