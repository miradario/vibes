/** Letter spacing 0 en todos (default de RN). Tipografía Inter (DESIGN_SYSTEM.md §3.5). La familia define el peso: no usar `fontWeight`. */
export const fontFamilies = {
  regular: "Inter-Regular",
  medium: "Inter-Medium",
  semibold: "Inter-SemiBold",
  bold: "Inter-Bold",
  extraBold: "Inter-ExtraBold",
} as const;

const style = (fontFamily: string, fontSize: number, lineHeight: number) =>
  ({ fontFamily, fontSize, lineHeight }) as const;

export const textStyles = {
  display: style(fontFamilies.extraBold, 34, 42),
  title: style(fontFamilies.bold, 24, 32),
  heading: style(fontFamilies.semibold, 20, 26),
  subtitle: style(fontFamilies.semibold, 16, 22),
  subtitleMedium: style(fontFamilies.medium, 16, 22),
  body: style(fontFamilies.regular, 16, 24),
  bodySmall: style(fontFamilies.regular, 14, 20),
  label: style(fontFamilies.semibold, 14, 20),
  labelMedium: style(fontFamilies.medium, 14, 20),
  caption: style(fontFamilies.medium, 12, 16),
  /** Solo contadores (Badge). */
  micro: style(fontFamilies.bold, 11, 14),
} as const;

export type TextVariant = keyof typeof textStyles;
