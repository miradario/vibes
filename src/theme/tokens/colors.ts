import { opacity, withAlpha } from "./opacity";
import { palette } from "./palette";

/** Colores semánticos (DESIGN_SYSTEM.md §3.2, modo Light). */
export const colors = {
  bg: {
    screen: palette.paper,
    surface: palette.paper,
    surfaceTranslucent: withAlpha(palette.paper, opacity.translucent),
    subtle: withAlpha(palette.ink, opacity.subtle),
    selected: withAlpha(palette.mustard, opacity.soft),
    /** D1: fondo de iniciales del Avatar (mustard-27). */
    avatarInitials: withAlpha(palette.mustard, 0.27),
  },
  text: {
    primary: palette.ink,
    secondary: palette.inkSoft,
    onDark: palette.paper,
    onAccent: palette.ink,
    link: palette.ink,
  },
  border: {
    subtle: withAlpha(palette.ink, opacity.subtle),
    default: withAlpha(palette.ink, opacity.soft),
    focus: palette.blue,
    selected: palette.mustard,
    error: palette.coral,
  },
  action: {
    primary: palette.ink,
    accent: palette.mustard,
    secondaryBlueText: palette.blue,
    secondaryBlueBorder: palette.blue,
    destructive: palette.coral,
  },
  feedback: {
    errorBg: withAlpha(palette.coral, opacity.soft),
    infoBg: withAlpha(palette.blue, opacity.soft),
    successBg: withAlpha(palette.mustard, opacity.soft),
    /** Banner warning (spec 29/10, DUDA 15): mustard 24% + borde `border/selected`; success es 12% sin borde. */
    warningBg: withAlpha(palette.mustard, opacity.medium),
  },
  scrim: withAlpha(palette.ink, opacity.scrim),
  icon: {
    default: palette.ink,
    muted: palette.inkSoft,
  },
  /**
   * Colores base de cada familia, para combinar con `withAlpha(…, opacity.*)`
   * cuando no hay un semántico exacto. Mismo valor que su primitivo.
   */
  base: {
    ink: palette.ink,
    inkSoft: palette.inkSoft,
    paper: palette.paper,
    mustard: palette.mustard,
    blue: palette.blue,
    coral: palette.coral,
  },
  /** Excepción registrada (DS §1.10): solo UserProfileSheet (visor de fotos). */
  exception: {
    photoViewerBlack: palette.photoViewerBlack,
  },
} as const;

export type Colors = typeof colors;
