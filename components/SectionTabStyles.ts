import { StyleSheet } from "react-native";
import { vibesTheme } from "../src/theme/vibesTheme";

export const sectionTabStyles = StyleSheet.create({
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: `${vibesTheme.colors.secondaryText}4D`, marginTop: 4, marginBottom: 10 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", minHeight: 48, paddingVertical: 10, paddingHorizontal: 4, gap: 6, borderBottomWidth: 2, borderBottomColor: `${vibesTheme.colors.accentMustard}00` },
  active: { borderBottomColor: vibesTheme.colors.accentMustard },
  text: { flexShrink: 1, color: vibesTheme.colors.secondaryText, fontSize: 16, fontFamily: vibesTheme.fonts.medium, textAlign: "center" },
  activeText: { color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.bold },
});
