import { StyleSheet } from "react-native";
import { vibesTheme } from "../src/theme/vibesTheme";

// Pill selector used for the screen-level tabs in Actividades and Desafíos.
export const pillTabStyles = StyleSheet.create({
  selector: { flexDirection: "row", padding: 4, borderRadius: 999, backgroundColor: `${vibesTheme.colors.secondaryText}0C` },
  tab: { flex: 1, minHeight: 44, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  selected: { backgroundColor: vibesTheme.colors.primaryText },
  label: { fontFamily: vibesTheme.fonts.semibold, fontSize: 16, lineHeight: 22, color: vibesTheme.colors.secondaryText },
  selectedLabel: { color: vibesTheme.colors.surface },
});
