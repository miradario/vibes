/** Count people once even when both legacy and current participation tables contain them. */
export function participantCounts(ids: string[], rows: Array<{ eventId: string; userId: string }>) {
  const usersByActivity = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!row.userId || row.userId === "null" || row.userId === "undefined") continue;
    const users = usersByActivity.get(row.eventId) ?? new Set<string>();
    users.add(row.userId);
    usersByActivity.set(row.eventId, users);
  }
  return Object.fromEntries(ids.map(id => [id, usersByActivity.get(id)?.size ?? 0]));
}
