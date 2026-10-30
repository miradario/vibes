/** Tamaños (DESIGN_SYSTEM.md §3.8). */
export const iconSize = { sm: 16, md: 20, lg: 24, xl: 32, xxl: 48 } as const;
export const touchTarget = 44;
export const avatarSize = { sm: 32, md: 48, lg: 88 } as const;

/** Medidas de componentes (components-spec 29/10). Solo las usan components/ui/*. */
export const componentSize = {
  progressBar: { sm: 4, md: 8 },
  swipeToConfirm: { md: 56, lg: 72 },
  dayPill: { sm: 28, md: 40 },
  overlayBadge: 32,
  button: { sm: 36, md: 48, lg: 56 },
  chip: 32,
  segmentedOption: 36,
  badge: 18,
  fab: 56,
  iconCircle: { sm: 32, md: 48, lg: 64 },
  slider: { track: 4, thumb: 24 },
  divider: 1,
  mapPreview: 168,
  optionCard: 64,
  listItem: { md: 56, lg: 72, leading: 36 },
} as const;

export const sizes = { iconSize, touchTarget, avatarSize, componentSize } as const;
export type IconSizeToken = keyof typeof iconSize;
