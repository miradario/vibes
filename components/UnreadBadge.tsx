import { vibesTheme } from "../src/theme/vibesTheme";
import React from "react";
import { View } from "react-native";
import { Text } from "./Typography";
import * as ds from "../src/theme/tokens";
export default function UnreadBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <View
      accessibilityLabel={`${count} mensajes sin leer`}
      style={{
        minWidth: 22,
        minHeight: 22,
        paddingVertical: ds.spacing[1],
        borderRadius: ds.radii.md,
        paddingHorizontal: ds.spacing[1],
        backgroundColor: vibesTheme.colors.accentMustard,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: vibesTheme.colors.primaryText, ...ds.textStyles.caption }}>
        {count > 99 ? "99+" : count}
      </Text>
    </View>
  );
}
