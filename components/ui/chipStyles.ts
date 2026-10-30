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
  /** disabled (DS §5.7): `opacity/disabled` 0.44. */
  disabled: { opacity: ds.opacity.disabled },
} as const;

/** Chip removable (components-spec §3): × de `iconSize.sm` en `icon/default`; fondo de filtro aplicado. */
export const chipRemoveIcon = { size: ds.iconSize.sm, color: ds.colors.icon.default } as const;

/** Chip con ícono opcional (Agus 29/10, SelectablePill): ícono `iconSize.sm`; `icon/muted` sin
 * seleccionar y `border/selected` (mostaza) seleccionado. Va después del label con el gap del chip. */
export const chipIcon = { size: ds.iconSize.sm, color: ds.colors.icon.muted, selectedColor: ds.colors.border.selected } as const;
