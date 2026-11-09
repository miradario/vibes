import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Text } from "./Typography";
import Icon from "./Icon";
import { useVibesSummary } from "../src/queries/vibesPoints.queries";
import { vibesTheme } from "../src/theme/vibesTheme";
import { iconCircleStyle } from "./ui/IconCircle";
import * as ds from "../src/theme/tokens";
export default function VibesPointsBadge() {
  const navigation = useNavigation();
  const query = useVibesSummary();
  const value = query.data ? query.data.total.toLocaleString("es-AR") : "—";
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Tus Vibes: ${value}. Ver puntaje e historial`}
      onPress={() => navigation.navigate("VibesPoints" as never)}
      activeOpacity={0.85}
      style={s.badge}
    >
      <View style={s.symbol}>
        <Icon name="pulse-outline" size={ds.iconSize.md} color={vibesTheme.colors.primaryText} />
      </View>
      <Text style={s.value}>{value}</Text>
    </TouchableOpacity>
  );
}
const s = StyleSheet.create({
  badge: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[2],
    minHeight: 44,
    paddingLeft: ds.spacing[2],
    paddingRight: ds.spacing[3],
    paddingVertical: ds.spacing[2],
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.strong),
    borderRadius: ds.radii.xl,
    backgroundColor: ds.colors.bg.selected,
  },
  symbol: {
    ...iconCircleStyle("sm", "accent"),
  },
  value: {
    ...ds.textStyles.subtitle,
    color: vibesTheme.colors.primaryText,
  },
});
