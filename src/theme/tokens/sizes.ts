/** Tamaños (DESIGN_SYSTEM.md §3.8). */
export const iconSize = { sm: 16, md: 20, lg: 24, xl: 32, xxl: 48 } as const;
/** Grosor de trazo de íconos lucide (bottom bar 2/11): activo en la burbuja y default. */
export const strokeWidth = { active: 2.25, default: 2.05 } as const;
export const touchTarget = 44;
export const avatarSize = { sm: 32, md: 48, lg: 88 } as const;

/** Medidas de componentes (components-spec 29/10). Solo las usan components/ui/*. */
export const componentSize = {
  progressBar: { sm: 4, md: 8 },
  /**
   * TabBarItem (2/11): burbuja elevada del tab activo, su halo, separación desde el
   * borde superior de la barra, anillo de la guía FTUX y posición del badge de no leídos.
   */
  tabBubble: 48,
  tabBubbleHalo: 56,
  tabBubbleRise: 6,
  tabFtuxRing: { size: 66, border: 3 },
  tabBadgeOffset: { top: -7, right: -13 },
  /** Miniaturas de cards (30/10): desafío cuadrada, evento apaisada. Radio `radii.md`. */
  cardThumb: 76,
  /** PersonCard (30/10): ancho y alto de foto; blur de foto bloqueada. */
  personCard: 96,
  personCardBlur: 24,
  cardThumbWide: { width: 112, height: 76 },
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

export const sizes = { iconSize, strokeWidth, touchTarget, avatarSize, componentSize } as const;
export type IconSizeToken = keyof typeof iconSize;
