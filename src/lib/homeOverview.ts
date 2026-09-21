import type { EventFeedItem } from "../queries/events.queries";

export const getUpcomingHomeEvents = (events: EventFeedItem[], now: number) =>
  events
    .filter(
      (event) =>
        event.type === "event" &&
        event.startsAt &&
        new Date(event.startsAt).getTime() > now
    )
    .sort(
      (a, b) =>
        new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime()
    )
    .slice(0, 3);

export const getHomeChallengeProgress = (
  checkins: string[],
  startsAt: string | null | undefined,
  totalDays: number
) => {
  const total = Math.max(1, totalDays);
  const start = startsAt ? new Date(startsAt) : null;
  if (!start || !Number.isFinite(start.getTime())) return null;
  const startDay = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );
  const days = new Set(
    checkins
      .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
      .filter((date) => {
        const day = (Date.parse(`${date}T00:00:00Z`) - startDay) / 86400000;
        return Number.isFinite(day) && day >= 0 && day < total;
      })
  );
  return {
    completed: days.size,
    total,
    percent: Math.round((days.size / total) * 100),
  };
};
