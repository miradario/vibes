import React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Avatar from "./Avatar";
import { vibesTheme } from "../src/theme/vibesTheme";

type AvatarGroupItem = {
  id: string | number;
  uri?: string | null;
  version?: string | number | null;
};

type AvatarGroupProps = {
  items: AvatarGroupItem[];
  size: number;
  max?: number;
  overlap?: number;
  style?: StyleProp<ViewStyle>;
  showOverflowCount?: boolean;
};

const AvatarGroup = ({
  items,
  size,
  max = 3,
  overlap = 10,
  style,
  showOverflowCount = false,
}: AvatarGroupProps) => {
  const visibleItems = items.slice(0, Math.max(1, max));
  const overflow = Math.max(0, items.length - visibleItems.length);

  return (
    <View style={[styles.row, style]}>
      {visibleItems.map((item, index) => (
        <Avatar
          key={String(item.id)}
          uri={item.uri}
          version={item.version}
          size={size}
          style={{ marginLeft: index === 0 ? 0 : -overlap, zIndex: visibleItems.length - index }}
        />
      ))}
      {showOverflowCount && overflow > 0 ? (
        <View
          style={[
            styles.more,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: visibleItems.length > 0 ? -overlap : 0,
            },
          ]}
        >
          <Text style={styles.moreText}>{`+${overflow}`}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  more: {
    backgroundColor: "#EFE8DE",
    borderWidth: 1,
    borderColor: "rgba(95, 86, 76, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  moreText: {
    color: "#6A6259",
    fontSize: 11,
    fontFamily: vibesTheme.fonts.bold,
  },
});

export default AvatarGroup;
