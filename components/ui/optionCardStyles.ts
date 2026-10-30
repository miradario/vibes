import { iconCircleIconSize, iconCircleStyle } from "./IconCircle";
import * as ds from "../../src/theme/tokens";

/**
 * OptionCard (DS §5.23, D10 aprobado 29/10; presets 30/10, Agus t899u). Opción seleccionable de
 * ancho completo: alto mínimo 64, `radius/lg`, padding `spacing/4`×`spacing/3`, fila con gap `spacing/3`.
 * default: `bg/surface` + `border/default`. selected: `bg/selected` + `border/selected` + check
 * (`checkmark-circle` `iconSize.md` en `border/selected`). disabled: `opacity/disabled`.
 * Label `text/subtitle` `text/primary`; descripción opcional `text/body-small` `text/secondary`.
 * Ícono inicial opcional: IconCircle sm (`iconCircleStyle("sm", selected ? "accent" : "neutral")`).
 */
export const optionCardStyles = {
  base: {
    minHeight: ds.componentSize.optionCard,
    borderRadius: ds.radii.lg,
    borderWidth: 1,
    borderColor: ds.colors.border.default,
    backgroundColor: ds.colors.bg.surface,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[3],
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
  },
  selected: { backgroundColor: ds.colors.bg.selected, borderColor: ds.colors.border.selected },
  disabled: { opacity: ds.opacity.disabled },
  copy: { flex: 1, gap: ds.spacing[1] },
  label: { ...ds.textStyles.subtitle, color: ds.colors.text.primary },
  description: { ...ds.textStyles.bodySmall, color: ds.colors.text.secondary },
} as const;

export const optionCardCheck = { name: "checkmark-circle", size: ds.iconSize.md, color: ds.colors.border.selected } as const;

/** Leading icon de OptionCard: IconCircle sm (32, `bg/subtle`; `bg/selected` si está elegida) con ícono 16 en `icon/default`. */
export const optionCardLeading = (selected = false) => iconCircleStyle("sm", selected ? "accent" : "neutral");
export const optionCardLeadingIcon = { size: iconCircleIconSize.sm, color: ds.colors.icon.default } as const;
