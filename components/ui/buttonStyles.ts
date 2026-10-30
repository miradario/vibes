import * as ds from "../../src/theme/tokens";

/**
 * Button (DS §5.1). Mientras no exista `<Button>` en código, las pantallas usan estos
 * presets. Todas las variantes son pill. Tamaños: sm 36 / md 48 / lg 56.
 */
export type ButtonVariant = "primary" | "accent" | "secondary" | "secondary-blue" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

const heights = { sm: 36, md: 48, lg: 56 } as const;

export const buttonSize = {
  sm: { minHeight: heights.sm, paddingHorizontal: ds.spacing[3], gap: ds.spacing[2] },
  md: { minHeight: heights.md, paddingHorizontal: ds.spacing[4], gap: ds.spacing[2] },
  lg: { minHeight: heights.lg, paddingHorizontal: ds.spacing[5], gap: ds.spacing[2] },
} as const;

export const buttonBase = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: ds.radii.pill,
} as const;

export const buttonVariant = {
  primary: { backgroundColor: ds.colors.action.primary },
  accent: { backgroundColor: ds.colors.action.accent },
  secondary: { backgroundColor: ds.colors.bg.surface, borderWidth: 1, borderColor: ds.colors.border.default },
  "secondary-blue": { backgroundColor: ds.colors.bg.surface, borderWidth: 1, borderColor: ds.colors.action.secondaryBlueBorder },
  ghost: { backgroundColor: "transparent" },
  destructive: { backgroundColor: ds.colors.feedback.errorBg, borderWidth: 1, borderColor: ds.colors.border.error },
} as const;

/** Color de etiqueta e ícono por variante. */
export const buttonContentColor: Record<ButtonVariant, string> = {
  primary: ds.colors.text.onDark,
  accent: ds.colors.text.onAccent,
  secondary: ds.colors.text.primary,
  "secondary-blue": ds.colors.action.secondaryBlueText,
  ghost: ds.colors.text.primary,
  destructive: ds.colors.text.primary,
};

/** Tipografía de la etiqueta: sm `label`, md/lg `subtitle` (secondary-blue: variantes medium). */
export const buttonLabel = (size: ButtonSize, variant: ButtonVariant) => {
  const blue = variant === "secondary-blue";
  const type = size === "sm" ? (blue ? ds.textStyles.labelMedium : ds.textStyles.label) : blue ? ds.textStyles.subtitleMedium : ds.textStyles.subtitle;
  return { ...type, color: buttonContentColor[variant], textAlign: "center" } as const;
};

export const buttonStyle = (variant: ButtonVariant, size: ButtonSize = "md") => ({ ...buttonBase, ...buttonSize[size], ...buttonVariant[variant] });

export const buttonDisabled = { opacity: ds.opacity.disabled } as const;
