/** Opacidades (DESIGN_SYSTEM.md §3.7). */
export const opacity = {
  subtle: 0.06,
  soft: 0.12,
  medium: 0.24,
  scrim: 0.28,
  strong: 0.45,
  high: 0.64,
  higher: 0.8,
  /** Solo para `bg/surface-translucent` (paper-92). */
  translucent: 0.92,
  /** D3: estado pressed de todo control. */
  pressed: 0.8,
  /** D3: estado disabled de todo control. */
  disabled: 0.44,
} as const;

export type OpacityToken = keyof typeof opacity;

/** Devuelve `rgba(...)` de un color hex `#RRGGBB` con la opacidad dada. */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
