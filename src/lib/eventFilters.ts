export const normalizeEventSearch = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export function matchesEventDateAndLocation(
  item: { startsAt?: string | null; location?: string | null },
  from: Date | null,
  to: Date | null,
  location: string
) {
  if (
    location.trim() &&
    !normalizeEventSearch(item.location).includes(
      normalizeEventSearch(location)
    )
  )
    return false;
  if (!from && !to) return true;
  const time = item.startsAt ? new Date(item.startsAt).getTime() : NaN;
  if (!Number.isFinite(time)) return false;
  if (from) {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    if (time < start.getTime()) return false;
  }
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (time > end.getTime()) return false;
  }
  return true;
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
