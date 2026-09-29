export const getProfileSwipeAction = (
  dx: number,
  dy: number,
  width: number,
  enableSwipe: boolean,
  canAdvance = false
): "details" | "like" | "pass" | "next" | null => {
  if (dy < -30 && Math.abs(dy) > Math.abs(dx) * 1.5) return "details";
  if (Math.abs(dx) <= Math.abs(dy) * 1.5) return null;
  const threshold = Math.min(110, width * 0.25);
  if (!enableSwipe) return canAdvance && Math.abs(dx) > threshold ? "next" : null;
  return dx > threshold ? "like" : dx < -threshold ? "pass" : null;
};

export function getNextProfile<T extends { id: string | number }>(
  profiles: T[],
  selectedId: string | number,
  pending?: { fromId: string; next: T | null } | null,
): T | null {
  if (pending?.fromId === String(selectedId)) return pending.next;
  const index = profiles.findIndex((profile) => String(profile.id) === String(selectedId));
  // An optimistic removal or refetch must not reveal an unrelated first card.
  if (index < 0) return null;
  return profiles[index + 1] ?? profiles.find((profile) => String(profile.id) !== String(selectedId)) ?? null;
}
