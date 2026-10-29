import { StyleSheet } from "react-native";
import { vibesTheme } from "../src/theme/vibesTheme";
import * as ds from "../src/theme/tokens";

export const sectionTabStyles = StyleSheet.create({
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.scrim), marginTop: ds.spacing[1], marginBottom: ds.spacing[3] },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", minHeight: 48, paddingVertical: ds.spacing[3], paddingHorizontal: ds.spacing[1], gap: ds.spacing[2], borderBottomWidth: 2, borderBottomColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.subtle) },
  active: { borderBottomColor: vibesTheme.colors.accentMustard },
  text: { flexShrink: 1, color: vibesTheme.colors.secondaryText, ...ds.textStyles.subtitleMedium, textAlign: "center" },
  activeText: { color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.bold },
});
