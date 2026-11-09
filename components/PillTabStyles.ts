import { StyleSheet } from "react-native";
import { vibesTheme } from "../src/theme/vibesTheme";
import * as ds from "../src/theme/tokens";

// Pill selector used for the screen-level tabs in Actividades and Desafíos.
export const pillTabStyles = StyleSheet.create({
  selector: { flexDirection: "row", padding: ds.spacing[1], borderRadius: ds.radii.pill, backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.subtle) },
  tab: { flex: 1, minHeight: 44, borderRadius: ds.radii.pill, alignItems: "center", justifyContent: "center" },
  selected: { backgroundColor: vibesTheme.colors.primaryText },
  label: { ...ds.textStyles.subtitle, color: vibesTheme.colors.secondaryText },
  selectedLabel: { color: vibesTheme.colors.surface },
});
