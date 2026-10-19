import React, { useEffect, useRef } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Text } from "./Typography";
import { vibesTheme } from "../src/theme/vibesTheme";

export default function HeartMessageBubble({
  children,
  style,
  onLongPress,
  onSinglePress,
  count = 0,
  liked = false,
  canReact = true,
  onHeart,
}: {
  children: (
    press: (singleAction?: () => void) => void,
    longPress: () => void,
    reaction: React.ReactNode
  ) => React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onLongPress?: () => void;
  onSinglePress?: () => void;
  count?: number;
  liked?: boolean;
  canReact?: boolean;
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
    if (!canReact) { singleAction?.(); return; }
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
  const reaction = count > 0 ? (
    <Text
      style={[s.reaction, liked && s.liked]}
      accessibilityRole={canReact ? "button" : "text"}
      accessibilityLabel={canReact ? `${count} corazones. ${liked ? "Quitar mi corazón" : "Poner un corazón"}` : `${count} corazones`}
      onPress={canReact ? event => { event.stopPropagation(); onHeart(liked); } : undefined}
    >{`♥${count > 1 ? ` ${count}` : ""}`}</Text>
  ) : null;
  return (
    <View style={[s.container, { maxWidth, alignSelf }]}>
      <Pressable
        style={bubbleStyle}
        onPress={() => press()}
        onLongPress={longPress}
        accessibilityHint={canReact ? "Tocá dos veces para poner un corazón" : undefined}
        accessibilityActions={canReact ? [{ name: "heart", label: "Poner un corazón" }] : []}
        onAccessibilityAction={({ nativeEvent }) => {
          if (canReact && nativeEvent.actionName === "heart") onHeart(false);
        }}
      >
        {children(press, longPress, reaction)}
      </Pressable>
    </View>
  );
}
// User-requested exception: stronger red only for message-heart reactions.
const MESSAGE_HEART_RED = "#C62828";
const s = StyleSheet.create({
  container: { marginBottom: 12, flexShrink: 1 },
  reaction: {
    alignSelf: "flex-end", marginTop: 9, marginBottom: -23,
    paddingHorizontal: 5, borderRadius: 10, overflow: "hidden",
    backgroundColor: vibesTheme.colors.surface,
    borderWidth: 1, borderColor: MESSAGE_HEART_RED,
    color: MESSAGE_HEART_RED, fontSize: 14, lineHeight: 18,
  },
  liked: { fontWeight: "700" },
});
