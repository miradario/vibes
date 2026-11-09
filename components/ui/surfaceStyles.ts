import * as ds from "../../src/theme/tokens";

/**
 * Variantes de componentes del DS que todavía no tienen su componente en `components/ui`
 * (Card, Banner, IconButton). Las pantallas las usan con spread para no divergir hasta el PR
 * de componentes. Valores: components-spec §2 (decisiones Agus 29/10).
 */

/** Card (§5.10): radio lg 16, padding `spacing/4`, gap `spacing/3`. */
export const cardStyles = {
  base: { borderRadius: ds.radii.lg, backgroundColor: ds.colors.bg.surface, borderWidth: 1, borderColor: ds.colors.border.subtle },
  /** `tone="info"`: infoBg + borde azul 24%. Sin glow (DUDA 17 ★). */
  info: { borderRadius: ds.radii.lg, backgroundColor: ds.colors.feedback.infoBg, borderWidth: 1, borderColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.medium) },
  /** `tone="accent"`: bg/selected + borde mostaza 24%. Sin glow (DUDA 17 ★). */
  accent: { borderRadius: ds.radii.lg, backgroundColor: ds.colors.bg.selected, borderWidth: 1, borderColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.medium) },
  padding: { padding: ds.spacing[4] },
  /** Card compacta (filas con miniatura, 30/10): vertical `spacing/3`, horizontal `spacing/4`. */
  paddingCompact: { paddingVertical: ds.spacing[3], paddingHorizontal: ds.spacing[4] },
  /** Vista previa de mapa (DUDA 19 ★): alto 168, sin padding. */
  mapPreview: { height: ds.componentSize.mapPreview, borderRadius: ds.radii.lg, overflow: "hidden", backgroundColor: ds.colors.bg.subtle, borderWidth: 1, borderColor: ds.colors.border.subtle },
} as const;

/** Banner (§5.21) `kind="warning"`: warningBg + 1 px `border/selected` (DUDA 15 ★). */
export const bannerStyles = {
  base: { borderRadius: ds.radii.md, paddingHorizontal: ds.spacing[4], paddingVertical: ds.spacing[3] },
  warning: { backgroundColor: ds.colors.feedback.warningBg, borderWidth: 1, borderColor: ds.colors.border.selected },
  info: { backgroundColor: ds.colors.feedback.infoBg },
} as const;

/** IconButton (§5.3) `type="floating"` (FAB): 56, pill, `action/primary`, `shadows.md`; ícono lg en `text/on-dark`. */
export const iconButtonFloating = {
  width: ds.componentSize.fab,
  height: ds.componentSize.fab,
  borderRadius: ds.radii.pill,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: ds.colors.action.primary,
  ...ds.shadows.md,
} as const;
export const iconButtonFloatingIconColor = ds.colors.text.onDark;

/** IconButton `type="filled"` (aprobado 30/10): círculo de `touchTarget` (44), pill, `action/primary`, sin sombra;
 *  ícono `iconSize.md` (20) en `text/on-dark`. Deshabilitado: sumar `buttonDisabled`. Uso: enviar en chats. */
export const iconButtonFilled = {
  width: ds.touchTarget,
  height: ds.touchTarget,
  borderRadius: ds.radii.pill,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: ds.colors.action.primary,
} as const;
export const iconButtonFilledIconColor = ds.colors.text.onDark;
export const iconButtonFilledIconSize = ds.iconSize.md;

/** Badge (§5.8) `count`: 18, pill, padding X `spacing/1`, `action/accent`, `text/micro` primary. */
export const badgeStyles = {
  count: { minWidth: ds.componentSize.badge, height: ds.componentSize.badge, borderRadius: ds.radii.pill, paddingHorizontal: ds.spacing[1], alignItems: "center", justifyContent: "center", backgroundColor: ds.colors.action.accent },
  countText: { ...ds.textStyles.micro, color: ds.colors.text.primary },
  /** `outlined` (components-spec §3): anillo de 2 px en `bg/screen`, para badges sobre íconos o avatares. */
  outlined: { borderWidth: 2, borderColor: ds.colors.bg.screen },
} as const;

/** Input password (components-spec §3): toggle de 44×44 en el borde derecho. */
export const passwordToggleStyle = {
  position: "absolute",
  right: ds.spacing[1],
  width: ds.touchTarget,
  height: "100%",
  alignItems: "center",
  justifyContent: "center",
} as const;
