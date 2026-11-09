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
  /** Bottom bar (2/11): burbuja del tab activo. */
  tabBar: {
    /** Desplazamiento horizontal de la burbuja y salida del ícono del tab. */
    bubbleDuration: 520,
    /** Entrada del ícono dentro de la burbuja. */
    iconInDuration: 360,
    /** Fade-in del anillo de la guía FTUX. */
    ftuxRingInDuration: 240,
    /** El ícono del tab sube hacia la burbuja al seleccionarse. */
    selectedRise: -18,
    selectedScale: 0.84,
    /** El ícono entra en la burbuja desde abajo y más chico. */
    iconInOffsetY: 12,
    iconInScale: 0.76,
  },
} as const;
