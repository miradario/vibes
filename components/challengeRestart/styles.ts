import { StyleSheet } from "react-native";
import { vibesTheme } from "../../src/theme/vibesTheme";

const { colors, fonts, radii, spacing } = vibesTheme;

export const restartStyles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: "rgba(110, 110, 110, 0.3)",
  },
  sheetTitle: {
    color: colors.primaryText,
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
  },
  body: {
    color: colors.secondaryText,
    fontFamily: fonts.primary,
    fontSize: 16,
    lineHeight: 22,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowTitle: {
    flex: 1,
    color: colors.primaryText,
    fontFamily: fonts.primary,
    fontSize: 17,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accentBlue,
    backgroundColor: colors.surface,
  },
  pillText: {
    color: colors.accentBlue,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  statusText: {
    color: colors.secondaryText,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
});
