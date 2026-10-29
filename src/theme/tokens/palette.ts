/**
 * Primitivos de color (DESIGN_SYSTEM.md §3.1). Solo se importan desde
 * `src/theme/tokens/*`: pantallas y componentes usan `colors` (semánticos).
 */
export const palette = {
  ink: "#2B2B2B",
  inkSoft: "#6E6E6E",
  paper: "#FEFEFD",
  mustard: "#F4A340",
  blue: "#3978B8",
  coral: "#D88C7A",
  /** Excepción registrada (DS §1.10): solo el visor de fotos de UserProfileSheet. */
  photoViewerBlack: "#000000",
} as const;

export type PaletteColor = keyof typeof palette;
