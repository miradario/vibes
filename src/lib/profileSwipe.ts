export const getProfileSwipeAction = (
  dx: number,
  dy: number,
  width: number,
  enableSwipe: boolean
): "details" | "like" | "pass" | null => {
  if (dy < -55 && Math.abs(dy) > Math.abs(dx) * 1.5) return "details";
  if (!enableSwipe || Math.abs(dx) <= Math.abs(dy) * 1.5) return null;
  const threshold = Math.min(110, width * 0.25);
  return dx > threshold ? "like" : dx < -threshold ? "pass" : null;
};
