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
