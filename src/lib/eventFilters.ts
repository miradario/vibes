import { normalizeSchedule } from "./eventSchedule";
export const normalizeEventSearch = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export function matchesEventDateAndLocation(
  item: { startsAt?: string | null; schedule?: unknown; location?: string | null },
  from: Date | null,
  to: Date | null,
  location: string
) {
  if (
    location.trim() &&
    normalizeEventSearch(item.location) !== normalizeEventSearch(location)
  )
    return false;
  if (!from && !to) return true;
  const start = from ? new Date(from) : null;
  start?.setHours(0, 0, 0, 0);
  const end = to ? new Date(to) : null;
  end?.setHours(23, 59, 59, 999);
  return normalizeSchedule(item.schedule, item.startsAt).some(({ startsAt }) => {
    const time = Date.parse(startsAt);
    return (!start || time >= start.getTime()) && (!end || time <= end.getTime());
  });
}

export type EventDatePreset = "today" | "tomorrow" | "week" | "month";

export function getEventDatePreset(preset: EventDatePreset, now = new Date()) {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  if (preset === "tomorrow") {
    from.setDate(from.getDate() + 1);
    to.setDate(to.getDate() + 1);
  } else if (preset === "week") {
    to.setDate(to.getDate() + (7 - to.getDay()) % 7);
  } else if (preset === "month") {
    to.setMonth(to.getMonth() + 1, 0);
  }
  return { from, to };
}

export function formatEventFilterDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

export function getEventLocationOptions(items: { location?: string | null }[]) {
  const locations = new Map<string, string>();
  for (const item of items) {
    const label = item.location?.trim();
    if (!label) continue;
    const id = normalizeEventSearch(label);
    if (!locations.has(id)) locations.set(id, label);
  }
  return Array.from(locations, ([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}
