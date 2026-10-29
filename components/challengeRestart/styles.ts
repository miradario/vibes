import { StyleSheet } from "react-native";
import { vibesTheme } from "../../src/theme/vibesTheme";
import * as ds from "../../src/theme/tokens";

const { colors, fonts, radii, spacing } = vibesTheme;

export const restartStyles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
    gap: spacing[4],
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.scrim),
  },
  sheetTitle: {
    color: colors.primaryText,
    ...ds.textStyles.title,
  },
  body: {
    color: colors.secondaryText,
    ...ds.textStyles.body,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    paddingVertical: spacing[2],
  },
  rowTitle: {
    flex: 1,
    color: colors.primaryText,
    ...ds.textStyles.body,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    paddingHorizontal: spacing[4],
    minHeight: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accentBlue,
    backgroundColor: colors.surface,
  },
  pillText: {
    color: colors.accentBlue,
    ...ds.textStyles.subtitle,
  },
  statusText: {
    color: colors.secondaryText,
    ...ds.textStyles.labelMedium,
  },
});
