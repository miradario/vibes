import { vibesTheme } from "../src/theme/vibesTheme";
import React from "react";
import { View } from "react-native";
import { Text } from "./Typography";
export default function UnreadBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <View
      accessibilityLabel={`${count} mensajes sin leer`}
      style={{
        minWidth: 22,
        minHeight: 22,
        paddingVertical: 2,
        borderRadius: 11,
        paddingHorizontal: 5,
        backgroundColor: vibesTheme.colors.accentMustard,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: vibesTheme.colors.primaryText, fontSize: 12, fontWeight: "600" }}>
        {count > 99 ? "99+" : count}
      </Text>
    </View>
  );
}
