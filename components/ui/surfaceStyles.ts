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
