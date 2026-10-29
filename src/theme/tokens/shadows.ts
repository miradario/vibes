import { palette } from "./palette";

/** Elevaciones (DESIGN_SYSTEM.md §3.6): iOS shadow* + Android elevation. */
export const shadows = {
  none: {
    shadowColor: palette.ink,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  sm: {
    shadowColor: palette.ink,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: palette.ink,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: palette.ink,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} as const;

export type ShadowToken = keyof typeof shadows;

const glowBase = {
  shadowOpacity: 0.18,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
} as const;

/**
 * `glow/accent` (+ variantes coral y azul): sombra de color de marca para CTAs y
 * elementos destacados. Solo iOS: en Android se combina con `shadows.*.elevation`.
 */
export const glow = {
  accent: { shadowColor: palette.mustard, ...glowBase },
  coral: { shadowColor: palette.coral, ...glowBase },
  blue: { shadowColor: palette.blue, ...glowBase },
} as const;

export type GlowToken = keyof typeof glow;
