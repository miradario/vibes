import React, { useEffect, useRef } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Heart } from "lucide-react-native";
import { Text } from "./Typography";
import { vibesTheme } from "../src/theme/vibesTheme";

export default function HeartMessageBubble({
  children,
  style,
  onLongPress,
  onSinglePress,
  count = 0,
  liked = false,
  onHeart,
}: {
  children: (
    press: (singleAction?: () => void) => void,
    longPress: () => void
  ) => React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onLongPress?: () => void;
  onSinglePress?: () => void;
  count?: number;
  liked?: boolean;
  onHeart: (remove?: boolean) => void;
}) {
  const lastTap = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    lastTap.current = null;
  };
  const longPress = () => {
    clear();
    onLongPress?.();
  };
  const { maxWidth, alignSelf, ...bubbleStyle } =
    StyleSheet.flatten(style) ?? {};
  useEffect(() => clear, []);
  const press = (singleAction = onSinglePress) => {
    const now = Date.now();
    if (lastTap.current !== null && now - lastTap.current <= 300) {
      clear();
      onHeart(false);
      return;
    }
    clear();
    lastTap.current = now;
    timer.current = setTimeout(() => {
      clear();
      singleAction?.();
    }, 300);
  };
  return (
    <View style={[s.container, { maxWidth, alignSelf }]}>
      <Pressable
        style={bubbleStyle}
        onPress={() => press()}
        onLongPress={longPress}
        accessibilityHint="Tocá dos veces para poner un corazón"
        accessibilityActions={[{ name: "heart", label: "Poner un corazón" }]}
        onAccessibilityAction={({ nativeEvent }) => {
          if (nativeEvent.actionName === "heart") onHeart(false);
        }}
      >
        {children(press, longPress)}
      </Pressable>
      {count > 0 && (
        <Pressable
          style={[s.badge, liked && s.liked]}
          accessibilityRole="button"
          accessibilityLabel={`${count} corazones. ${
            liked ? "Quitar mi corazón" : "Poner un corazón"
          }`}
          hitSlop={8}
          onPress={() => onHeart(liked)}
        >
          <Heart
            size={15}
            color={vibesTheme.colors.primaryText}
            fill={vibesTheme.colors.accentCoral}
          />
          {count > 1 && <Text style={s.count}>{count}</Text>}
        </Pressable>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  container: { marginBottom: 12, flexShrink: 1 },
  badge: {
    position: "absolute",
    bottom: -10,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: vibesTheme.colors.surface,
    borderWidth: 1,
    borderColor: vibesTheme.colors.secondaryText,
  },
  liked: { borderColor: vibesTheme.colors.accentCoral },
  count: { color: vibesTheme.colors.primaryText, fontSize: 12 },
});
