export const vibesTheme = {
  colors: {
    background: "#F6F6F4",
    surface: "#F6F6F4",
    primaryText: "#2B2B2B",
    secondaryText: "#6E6E6E",
    muted: "#6E6E6E",
    accentBlue: "#AEBFD1",
    accentMustard: "#E4B76E",
    accentCoral: "#D88C7A",
    lineArt: "#2B2B2B",
    borderSoft: "rgba(43, 43, 43, 0.06)",
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
