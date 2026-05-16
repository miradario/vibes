export const vibesTheme = {
  fonts: {
    primary: "JosefinSans-ExtraLight",
    regular: "JosefinSans-ExtraLight",
    medium: "JosefinSans-Light",
    semibold: "JosefinSans-Light",
    bold: "JosefinSans-Light",
  },
  colors: {
    background: "#FFF5EA",
    surface: "#FFF5EA",
    primaryText: "#2B2B2B",
    secondaryText: "#6E6E6E",
    muted: "#6E6E6E",
    accentBlue: "#7F98B7",
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
  motion: {
    modal: {
      backdropColor: "rgba(17, 17, 17, 0.28)",
      offsetY: 320,
      backdropInDuration: 120,
      backdropOutDuration: 110,
      sheetInDuration: 220,
      sheetOutDuration: 170,
      sheetInDelay: 50,
      sheetInOpacityDuration: 190,
      sheetOutOpacityDuration: 130,
    },
  },
} as const;

export type VibesTheme = typeof vibesTheme;
