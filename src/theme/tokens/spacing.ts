/** Escala de 4 pt (DESIGN_SYSTEM.md §3.3). No se agregan valores. */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  12: 48,
} as const;

export type SpaceToken = keyof typeof spacing;
