export function moveRangeThumb(minimum: number, maximum: number, lower: number, upper: number, thumb: "lower" | "upper", value: number) {
  const next = Math.max(minimum, Math.min(maximum, Math.round(value)));
  return thumb === "lower" ? [Math.min(next, upper), upper] as const : [lower, Math.max(next, lower)] as const;
}
// The endpoints represent the unrestricted range, rather than active filters.
export function normalizeRangeBounds(lower: number | null, upper: number | null, minimum: number, maximum: number) {
  return [lower === minimum ? null : lower, upper === maximum ? null : upper] as const;
}
