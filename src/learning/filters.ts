/** Filter by locality only. A bare street address must never become a city chip. */
export function learningLocality(address: string) {
  const parts = address.split(",").map(part => part.trim()).filter(Boolean);
  const candidates = parts.filter(part => !/\d|^(av\.?|avenida|calle|piso|https?|online|argentina|presencial)\b/i.test(part));
  const locality = candidates.find(part => /caba|capital federal|ciudad aut[oó]noma/i.test(part)) ?? candidates[0] ?? "";
  return /^(caba|capital federal|ciudad aut[oó]noma de buenos aires)$/i.test(locality) ? "CABA" : locality;
}
export function matchesLearningDateRange(dates: string[], from: string, to: string) {
  return (!from && !to) || dates.some(date => (!from || date.slice(0, 10) >= from) && (!to || date.slice(0, 10) <= to));
}
/** Weekly references have no individual sessions: check weekdays within the chosen range. */
export function weeklyRangeMatches(days: number[], from: string, to: string, today: string) {
  if (!from && !to) return true;
  const start = new Date(`${from || today}T12:00:00Z`);
  const end = to ? new Date(`${to}T12:00:00Z`) : new Date(start.getTime() + 7 * 86400000);
  for (let index = 0; index < 7 && start <= end; index++, start.setUTCDate(start.getUTCDate() + 1)) {
    if (days.includes(start.getUTCDay())) return true;
  }
  return false;
}
