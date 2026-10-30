import * as ds from "../../src/theme/tokens";

/**
 * Estilos del Chip (DS §5.7 + components-spec §2.1, decisión Agus 29/10): alto 32 con área
 * táctil 44 (`chipHitSlop`), padding X `spacing/3`, pill, `text/label`.
 * default: `bg/surface` + `border/default`. selected: `bg/selected` + `border/selected`.
 * Mientras no exista `<Chip>`, las pantallas usan estos estilos para no divergir.
 */
const vertical = (ds.touchTarget - ds.componentSize.chip) / 2;
export const chipHitSlop = { top: vertical, bottom: vertical, left: 0, right: 0 } as const;

export const chipStyles = {
  base: {
    minHeight: ds.componentSize.chip,
    paddingHorizontal: ds.spacing[3],
    borderRadius: ds.radii.pill,
    borderWidth: 1,
    borderColor: ds.colors.border.default,
    backgroundColor: ds.colors.bg.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ds.spacing[2],
  },
  selected: {
    backgroundColor: ds.colors.bg.selected,
    borderColor: ds.colors.border.selected,
  },
  /** Chip `fullWidth` (DUDA 13 ★): opciones de ancho igual. */
  fullWidth: { flex: 1 },
  label: { ...ds.textStyles.label, color: ds.colors.text.primary },
  labelSelected: { color: ds.colors.text.primary },
} as const;
