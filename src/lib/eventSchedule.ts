export type EventRecurrence = { frequency: "weekly" | "monthly"; count: number; weekdays: number[] };
export type EventSession = { startsAt: string; endsAt?: string; recurrence?: EventRecurrence };

export function parseEventRecurrence(value: unknown): EventRecurrence | null {
  if (!value || typeof value !== "object") return null;
  const rule = value as Partial<EventRecurrence>;
  if ((rule.frequency !== "weekly" && rule.frequency !== "monthly") || !Number.isInteger(rule.count) || rule.count! < 2 || rule.count! > 52) return null;
  const weekdays = Array.isArray(rule.weekdays) ? [...new Set(rule.weekdays.filter(day => Number.isInteger(day) && day >= 0 && day <= 6))] : [];
  if (rule.frequency === "weekly" && !weekdays.length) return null;
  return { frequency: rule.frequency, count: rule.count!, weekdays };
}

export function getEventRecurrence(schedule: unknown): EventRecurrence | null {
  if (!Array.isArray(schedule)) return null;
  return schedule.map(entry => parseEventRecurrence(entry?.recurrence)).find(Boolean) ?? null;
}
export type EventScheduleDraft = { date: string; time: string; endDate?: string; endTime?: string };
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
  const recurrence = getEventRecurrence(values);
  return [...new Set(timestamps)].sort().map((startsAt, index) => {
    const entry = values.find((value) => typeof value?.startsAt === "string" && Date.parse(value.startsAt) === Date.parse(startsAt));
    const endsAt = entry?.endsAt;
    return { startsAt, ...(index === 0 && recurrence ? { recurrence } : {}), ...(typeof endsAt === "string" && Date.parse(endsAt) > Date.parse(startsAt) ? { endsAt: new Date(endsAt).toISOString() } : {}) };
  });
}

export function serializeSchedule(drafts: EventScheduleDraft[]): EventSession[] | null {
  const dates = drafts.map(parseSession);
  if (!dates.length || dates.some((date) => !date)) return null;
  const sessions: EventSession[] = [];
  for (let index = 0; index < drafts.length; index++) {
    const draft = drafts[index];
    const end = draft.endDate || draft.endTime ? parseSession({ date: draft.endDate ?? "", time: draft.endTime ?? "" }) : null;
    if ((draft.endDate || draft.endTime) && (!end || end.getTime() <= dates[index]!.getTime())) return null;
    sessions.push({ startsAt: dates[index]!.toISOString(), ...(end ? { endsAt: end.toISOString() } : {}) });
  }
  return normalizeSchedule(sessions);
}

/** A session without an end time stays current until 23:59 local on its day. */
export function sessionEndTime(session: EventSession): number {
  const end = new Date(session.endsAt ?? session.startsAt);
  if (!session.endsAt) end.setHours(23, 59, 59, 999);
  return end.getTime();
}

export function eventHasExpired(schedule: unknown, startsAt?: string | null, now = Date.now()): boolean {
  const sessions = normalizeSchedule(schedule, startsAt);
  if (!sessions.length) return false;
  return sessions.every((session) => sessionEndTime(session) < now);
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
  return normalizeSchedule(schedule, startsAt).find((entry) => sessionEndTime(entry) >= now) ?? null;
}

export function sortEventsByDate<T extends { schedule?: unknown; startsAt?: string | null }>(items: T[], now = Date.now()): T[] {
  const timestamp = (item: T) => {
    const sessions = normalizeSchedule(item.schedule, item.startsAt);
    const session = nextEventSession(sessions, null, now) ?? sessions[sessions.length - 1];
    return session ? Date.parse(session.startsAt) : Number.POSITIVE_INFINITY;
  };
  return items.map((item) => ({ item, time: timestamp(item) }))
    .sort((left, right) => left.time - right.time)
    .map(({ item }) => item);
}

/** Generate a finite series at the same local time, preserving month-end anchors. */
export function buildRecurringSchedule(draft: EventScheduleDraft, rule: EventRecurrence): EventSession[] | null {
  const recurrence = parseEventRecurrence(rule);
  const seed = serializeSchedule([draft])?.[0];
  if (!recurrence || !seed) return null;
  const start = new Date(seed.startsAt);
  const duration = seed.endsAt ? Date.parse(seed.endsAt) - start.getTime() : null;
  const sessions: EventSession[] = [];
  for (let offset = 0; sessions.length < recurrence.count && offset < 370; offset++) {
    let date: Date;
    if (recurrence.frequency === "monthly") {
      const lastDay = new Date(start.getFullYear(), start.getMonth() + offset + 1, 0).getDate();
      date = new Date(start.getFullYear(), start.getMonth() + offset, Math.min(start.getDate(), lastDay), 12);
    } else {
      date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset, 12);
      if (!recurrence.weekdays.includes(date.getDay())) continue;
    }
    const local = parseSession({ date: sessionDraft(date.toISOString()).date, time: draft.time });
    if (!local) return null;
    sessions.push({ startsAt: local.toISOString(), ...(duration !== null ? { endsAt: new Date(local.getTime() + duration).toISOString() } : {}) });
  }
  if (sessions.length !== recurrence.count) return null;
  sessions[0].recurrence = recurrence;
  return sessions;
}

export function formatEventRecurrence(schedule: unknown): string | null {
  const recurrence = getEventRecurrence(schedule);
  if (!recurrence) return null;
  const first = normalizeSchedule(schedule)[0];
  if (!first) return null;
  const date = new Date(first.startsAt);
  const time = date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
  if (recurrence.frequency === "monthly") return `Cada mes · ${time}`;
  const names = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"];
  const days = [...recurrence.weekdays].sort((a, b) => (a || 7) - (b || 7)).map(day => names[day]);
  return `Todos los ${days.join(" y ")} · ${time}`;
}

/** Session to display for an event: the next upcoming one, or the last one if all already passed. */
export function displayEventSession(schedule: unknown, startsAt?: string | null, now = Date.now()): EventSession | null {
  const sessions = normalizeSchedule(schedule, startsAt);
  return nextEventSession(sessions, null, now) ?? sessions[sessions.length - 1] ?? null;
}

/** How many sessions are still upcoming after the displayed one. */
export function remainingUpcomingSessions(schedule: unknown, startsAt?: string | null, now = Date.now()): number {
  const upcoming = normalizeSchedule(schedule, startsAt).filter((entry) => Date.parse(entry.endsAt ?? entry.startsAt) > now);
  return Math.max(upcoming.length - 1, 0);
}

export type ScheduleDraftIssue = { error?: string; warning?: string };

/**
 * Inline validation per draft. Blocks new or changed starts in the past; sessions that
 * were already saved (same start as before) are allowed so old events stay editable.
 * Warns when the end is more than a day after the start.
 */
export function validateScheduleDrafts(drafts: EventScheduleDraft[], savedStarts: string[] = [], now = Date.now()): ScheduleDraftIssue[] {
  const saved = new Set(savedStarts.flatMap((value) => Number.isFinite(Date.parse(value)) ? [new Date(value).toISOString()] : []));
  return drafts.map((draft) => {
    const start = parseSession(draft);
    if (!start) return {};
    const issue: ScheduleDraftIssue = {};
    if (start.getTime() < now && !saved.has(start.toISOString())) issue.error = "La fecha de inicio ya pasó";
    const end = draft.endDate || draft.endTime ? parseSession({ date: draft.endDate ?? "", time: draft.endTime ?? "" }) : null;
    if (end && end.getTime() - start.getTime() > 24 * 60 * 60 * 1000) issue.warning = "El fin es más de un día después del inicio, ¿es correcto?";
    return issue;
  });
}
