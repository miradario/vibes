// Logo oficial (desde 25/10/2026): wordmark de texto "Vibes", no el lobo.
// Colores por letra y formas: assets/branding/OFFICIAL_LOGO.md
//
// Compatibilidad: los valores salen de `src/theme/tokens/` (fuente única de verdad,
// DESIGN_SYSTEM.md §2). `radii` y `spacing` usan los nombres nuevos (D6):
// radii xs/sm/md/lg/xl/pill = 4/8/12/16/24/999 y spacing[0…12] en escala de 4.
import { palette } from "./tokens/palette";
import { colors as semanticColors } from "./tokens/colors";
import { fontFamilies } from "./tokens/typography";
import { radii } from "./tokens/radii";
import { spacing } from "./tokens/spacing";
import { motion } from "./tokens/motion";

export const vibesTheme = {
  fonts: {
    subtitle: fontFamilies.medium,
    primary: fontFamilies.regular,
    ...fontFamilies,
  },
  colors: {
    background: semanticColors.bg.screen,
    surface: semanticColors.bg.surface,
    primaryText: semanticColors.text.primary,
    secondaryText: semanticColors.text.secondary,
    muted: semanticColors.text.secondary,
    accentBlue: palette.blue,
    accentMustard: palette.mustard,
    accentCoral: palette.coral,
    lineArt: palette.ink,
    borderSoft: semanticColors.border.subtle,
  },
  radii,
  spacing,
  motion,
} as const;

export type VibesTheme = typeof vibesTheme;
