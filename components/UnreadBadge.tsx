import React from "react";
import { Text, View } from "react-native";
export default function UnreadBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <View
      accessibilityLabel={`${count} mensajes sin leer`}
      style={{
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        paddingHorizontal: 5,
        backgroundColor: "#E4B76E",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#2B2B2B", fontSize: 12, fontWeight: "600" }}>
        {count > 99 ? "99+" : count}
      </Text>
    </View>
  );
}
