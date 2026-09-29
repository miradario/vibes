import React, { useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  type StyleProp,
  type ViewStyle,
} from "react-native";

/** Animate local outgoing messages once, without animating loaded history. */
export default function MessageEntrance({
  sending,
  children,
  style,
}: {
  sending: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const animateOnMount = useRef(sending).current;
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animateOnMount) return;
    let disposed = false;
    let animation: Animated.CompositeAnimation | undefined;
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        if (enabled) {
          disposed = true;
          animation?.stop();
          progress.setValue(1);
        }
      }
    );

    void AccessibilityInfo.isReduceMotionEnabled()
      .then((reduceMotion) => {
        if (disposed || reduceMotion) return;
        progress.setValue(0);
        animation = Animated.timing(progress, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        });
        animation.start();
      })
      .catch(() => {
        // Keep the message visible if accessibility settings are unavailable.
      });

    return () => {
      disposed = true;
      animation?.stop();
      subscription.remove();
    };
  }, [animateOnMount, progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.4, 1],
          }),
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
