export const vibesTheme = {
  colors: {
    background: "#E9E3F4",
    surface: "#FEFEFE",
    primaryText: "#243D8E",
    secondaryText: "#7680BE",
    muted: "#8B97CF",
    accentBlue: "#C1D5FF",
    accentMustard: "#FFE2C8",
    accentCoral: "#EC6C56",
    lineArt: "#243D8E",
    borderSoft: "rgba(255, 255, 255, 0.42)",
  },
  radii: {
    sm: 8,
    md: 16,
    lg: 24,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
} as const;

export type VibesTheme = typeof vibesTheme;
