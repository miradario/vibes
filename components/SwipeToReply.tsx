import React from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Icon } from ".";
import { vibesTheme } from "../src/theme/vibesTheme";

const THRESHOLD = 64;
const MAX_DRAG = 88;

const lightHaptic = () => {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

/** WhatsApp-style: drag a message to the right to reply to it. */
export default function SwipeToReply({
  enabled = true,
  onReply,
  children,
}: {
  enabled?: boolean;
  onReply: () => void;
  children: React.ReactNode;
}) {
  const translateX = useSharedValue(0);
  const armed = useSharedValue(false);

  const pan = Gesture.Pan()
    .enabled(enabled)
    // Only claim clear horizontal drags to the right; vertical scroll wins otherwise.
    .activeOffsetX(14)
    .failOffsetX(-14)
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      const x = Math.max(0, Math.min(MAX_DRAG, event.translationX * 0.75));
      translateX.value = x;
      if (x >= THRESHOLD && !armed.value) {
        armed.value = true;
        runOnJS(lightHaptic)();
      } else if (x < THRESHOLD && armed.value) {
        armed.value = false;
      }
    })
    .onFinalize(() => {
      if (armed.value) runOnJS(onReply)();
      armed.value = false;
      translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
    });

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [12, THRESHOLD], [0, 1], "clamp"),
    transform: [
      {
        scale: interpolate(translateX.value, [12, THRESHOLD], [0.5, 1], "clamp"),
      },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View>
        <Animated.View pointerEvents="none" style={[s.icon, iconStyle]}>
          <Icon
            name="arrow-undo"
            size={18}
            color={vibesTheme.colors.accentMustard}
          />
        </Animated.View>
        <Animated.View style={contentStyle}>{children}</Animated.View>
      </View>
    </GestureDetector>
  );
}

const s = StyleSheet.create({
  icon: {
    position: "absolute",
    left: 4,
    top: 0,
    bottom: 0,
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
