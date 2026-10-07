// Compare calendar dates rather than elapsed hours (days can span 23/25 hours).
export const localDayKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const calendarDayNumber = (date: Date) =>
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;

export const getChallengeDay = (startsAt: string | null | undefined, now = new Date()) => {
  if (!startsAt) return 1;
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return 1;
  return calendarDayNumber(now) - calendarDayNumber(start) + 1;
};

export const completedChallengeDays = (
  checkins: string[], startsAt: string | null | undefined, totalDays: number,
) => {
  if (!startsAt) return [];
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return [];
  return [...new Set(checkins.map(key => {
    const date = new Date(`${key}T00:00:00`);
    return calendarDayNumber(date) - calendarDayNumber(start) + 1;
  }).filter(day => Number.isInteger(day) && day >= 1 && day <= totalDays))]
    .sort((a, b) => a - b);
};

export const getChallengeStreaks = (completedDays: number[], currentDay: number, totalDays: number) => {
  const days = [...new Set(completedDays.filter(day =>
    Number.isInteger(day) && day >= 1 && day <= Math.min(currentDay, totalDays)
  ))].sort((a, b) => a - b);
  const completed = new Set(days);
  let bestStreak = 0;
  let run = 0;
  let previous = -1;
  for (const day of days) {
    run = day === previous + 1 ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    previous = day;
  }
  let cursor = Math.min(currentDay, totalDays);
  // Today remains available. A finished challenge is evaluated at its last day,
  // with no grace period for an uncompleted final day.
  if (currentDay <= totalDays && !completed.has(cursor)) cursor -= 1;
  let streak = 0;
  while (completed.has(cursor)) { streak += 1; cursor -= 1; }
  return { streak, bestStreak };
};
