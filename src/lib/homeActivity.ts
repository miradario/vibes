export const getNewConnections = <T extends { id: string; isActive: boolean }>(
  matches: T[],
  openedIds: string[]
): T[] => {
  const opened = new Set(openedIds);
  return matches.filter((match) => match.isActive && !opened.has(match.id));
};

export const getHomeUnreadSummary = (
  rows: Array<{ kind: string; unread_count: number | string }>
) => {
  let direct = 0;
  let groups = 0;
  for (const row of rows) {
    const count = Number(row.unread_count);
    if (!Number.isFinite(count) || count <= 0) continue;
    if (row.kind === "direct") direct += count;
    else if (["group", "event", "challenge"].includes(row.kind))
      groups += count;
  }
  return { total: direct + groups, direct, groups };
};
