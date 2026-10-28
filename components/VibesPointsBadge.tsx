import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Text } from "./Typography";
import Icon from "./Icon";
import { useVibesSummary } from "../src/queries/vibesPoints.queries";
import { vibesTheme } from "../src/theme/vibesTheme";
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
        <Icon name="pulse-outline" size={20} color={vibesTheme.colors.primaryText} />
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
    gap: 8,
    minHeight: 44,
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: `${vibesTheme.colors.accentMustard}66`,
    borderRadius: 24,
    backgroundColor: `${vibesTheme.colors.accentMustard}24`,
  },
  symbol: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.accentMustard,
  },
  value: {
    fontFamily: vibesTheme.fonts.bold,
    fontSize: 17,
    lineHeight: 23,
    color: vibesTheme.colors.primaryText,
  },
});
