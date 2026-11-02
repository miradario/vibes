import { colors } from "./colors";

/** Movimiento (antes `vibesTheme.motion`). */
export const motion = {
  modal: {
    backdropColor: colors.scrim,
    offsetY: 320,
    backdropInDuration: 120,
    backdropOutDuration: 110,
    sheetInDuration: 220,
    sheetOutDuration: 170,
    sheetInDelay: 50,
    sheetInOpacityDuration: 190,
    sheetOutOpacityDuration: 130,
  },
} as const;
