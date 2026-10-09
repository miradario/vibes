export type EventSession = { startsAt: string };
export type EventScheduleDraft = { date: string; time: string };
const pad = (n: number) => String(n).padStart(2, "0");

export function sessionDraft(startsAt?: string | null): EventScheduleDraft {
  const date = startsAt ? new Date(startsAt) : null;
  if (!date || !Number.isFinite(date.getTime())) return { date: "", time: "" };
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

export function parseSession(draft: EventScheduleDraft): Date | null {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(draft.date);
  const time = /^(\d{1,2}):(\d{2})$/.exec(draft.time);
  if (!day || !time) return null;
  const [, y, m, d] = day.map(Number);
  const [, h, min] = time.map(Number);
  if (h > 23 || min > 59) return null;
  const date = new Date(y, m - 1, d, h, min, 0, 0);
  // Reject rolled-over dates and nonexistent local times (DST).
  return date.getFullYear() === y && date.getMonth() === m - 1 &&
    date.getDate() === d && date.getHours() === h && date.getMinutes() === min
    ? date : null;
}

export function normalizeSchedule(value: unknown, fallback?: string | null): EventSession[] {
  const values = Array.isArray(value) ? value : [];
  const timestamps = values.flatMap((entry) => {
    const startsAt = entry?.startsAt;
    return typeof startsAt === "string" && Number.isFinite(Date.parse(startsAt))
      ? [new Date(startsAt).toISOString()] : [];
  });
  if (!timestamps.length && fallback && Number.isFinite(Date.parse(fallback))) {
    timestamps.push(new Date(fallback).toISOString());
  }
  return [...new Set(timestamps)].sort().map((startsAt) => ({ startsAt }));
}

export function serializeSchedule(drafts: EventScheduleDraft[]): EventSession[] | null {
  const dates = drafts.map(parseSession);
  if (!dates.length || dates.some((date) => !date)) return null;
  return normalizeSchedule(dates.map((date) => ({ startsAt: date!.toISOString() })));
}

export function eventHasExpired(schedule: unknown, startsAt?: string | null, now = Date.now()): boolean {
  const sessions = normalizeSchedule(schedule, startsAt);
  if (!sessions.length) return false;
  const end = new Date(sessions[sessions.length - 1].startsAt);
  end.setHours(23, 59, 59, 999);
  return end.getTime() < now;
}

export function formatSession(startsAt: string): string {
  return new Date(startsAt).toLocaleString("es-AR", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

export const formatAttendees = (count: number, capacity?: number | null) =>
  capacity && capacity > 0 ? `${count}/${capacity}` : `${count} · sin límite`;

export function nextEventSession(schedule: unknown, startsAt?: string | null, now = Date.now()): EventSession | null {
  return normalizeSchedule(schedule, startsAt).find((entry) => Date.parse(entry.startsAt) > now) ?? null;
}
