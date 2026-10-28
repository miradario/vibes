/**
 * Local (per device, per user) visibility rules for the "Nuevas conexiones" strip:
 * - a new connection stops showing after it was seen MAX_CONNECTION_VIEWS times
 *   (one "view" = the strip rendered it while its screen was focused);
 * - the X hides the whole strip until a connection/request created after the dismiss.
 */
export const MAX_CONNECTION_VIEWS = 2;

export type ConnectionStripState = { views: Record<string, number>; dismissedAt: number | null };

export const emptyConnectionStripState = (): ConnectionStripState => ({ views: {}, dismissedAt: null });

export const parseConnectionStripState = (raw: string | null): ConnectionStripState => {
  try {
    const value = raw ? JSON.parse(raw) : null;
    const views: Record<string, number> = {};
    if (value && typeof value.views === "object" && value.views) {
      for (const [id, count] of Object.entries(value.views)) {
        if (typeof count === "number" && Number.isFinite(count) && count > 0) views[id] = count;
      }
    }
    const dismissedAt = typeof value?.dismissedAt === "number" && Number.isFinite(value.dismissedAt) ? value.dismissedAt : null;
    return { views, dismissedAt };
  } catch {
    return emptyConnectionStripState();
  }
};

const createdAfter = (createdAt: string | undefined, dismissedAt: number | null) =>
  dismissedAt == null || (Date.parse(createdAt ?? "") || 0) > dismissedAt;

/** `countedNow` = ids already counted during the current focus, so they don't vanish mid-view. */
export const filterNewConnections = <T extends { id: string; createdAt?: string }>(
  connections: T[],
  state: ConnectionStripState,
  countedNow: ReadonlySet<string> = new Set()
): T[] =>
  connections.filter((item) => {
    const previous = (state.views[item.id] ?? 0) - (countedNow.has(item.id) ? 1 : 0);
    return previous < MAX_CONNECTION_VIEWS && createdAfter(item.createdAt, state.dismissedAt);
  });

export const filterRequestsAfterDismiss = <T extends { createdAt?: string }>(requests: T[], state: ConnectionStripState): T[] =>
  requests.filter((item) => createdAfter(item.createdAt, state.dismissedAt));

export const recordConnectionViews = (state: ConnectionStripState, ids: string[]): ConnectionStripState => {
  if (!ids.length) return state;
  const views = { ...state.views };
  for (const id of ids) views[id] = (views[id] ?? 0) + 1;
  return { ...state, views };
};

export const dismissConnectionStrip = (state: ConnectionStripState, now: number): ConnectionStripState => ({ ...state, dismissedAt: now });
