import { vibesTheme } from "../src/theme/vibesTheme";
import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, StyleSheet, View, useWindowDimensions } from "react-native";
import { Text } from "./Typography";
import * as ds from "../src/theme/tokens";

export default function LikeBubbles({ trigger, showConfirmation = false }: { trigger: number; showConfirmation?: boolean }) {
  const { width } = useWindowDimensions();
  const radius = Math.min(130, width * 0.32);
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let active = true;
    if (!trigger) progress.setValue(1);
    if (trigger)
      void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
        if (!active || reduced) return;
        progress.setValue(0);
        Animated.timing(progress, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }).start();
      });
    return () => {
      active = false;
      progress.stopAnimation();
    };
  }, [trigger, progress]);
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        { zIndex: 20, alignItems: "center", justifyContent: "center" },
      ]}
    >
      {showConfirmation ? <Animated.View style={{
        width: 80, height: 80, borderRadius: ds.radii.pill,
        alignItems: "center", justifyContent: "center",
        backgroundColor: vibesTheme.colors.background,
        borderWidth: 2, borderColor: vibesTheme.colors.accentMustard,
        opacity: progress.interpolate({ inputRange: [0, 0.15, 0.65, 1], outputRange: [0, 1, 1, 0] }),
        transform: [{ scale: progress.interpolate({ inputRange: [0, 0.22, 0.4, 1], outputRange: [0.6, 1.12, 1, 0.95] }) }],
      }}><Text style={{ color: vibesTheme.colors.accentBlue, fontSize: /* ds-lint-allow DS-TODO: fontSize 40 (peso 400) sin mapeo claro en §3.5.1 */ 40 }}>✓</Text></Animated.View> : null}
      {Array.from({ length: 9 }, (_, i) => {
        const angle = (i * Math.PI * 2) / 9;
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              width: 24 + (i % 3) * 8,
              height: 24 + (i % 3) * 8,
              borderRadius: ds.radii.xl,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: i % 2 ? vibesTheme.colors.accentMustard : ds.withAlpha(ds.colors.base.blue, ds.opacity.medium),
              opacity: progress.interpolate({
                inputRange: [0, 0.65, 1],
                outputRange: [0, 1, 0],
              }),
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Math.cos(angle) * radius],
                  }),
                },
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Math.sin(angle) * radius],
                  }),
                },
                {
                  scale: progress.interpolate({
                    inputRange: [0, 0.3, 1],
                    outputRange: [0.2, 1, 1.3],
                  }),
                },
              ],
            }}
          >
            <Text
              style={{
                color: i % 2 ? vibesTheme.colors.primaryText : vibesTheme.colors.primaryText,
                ...ds.textStyles.bodySmall,
              }}
            >
              {i % 3 === 0 ? "✓" : i % 3 === 1 ? "✦" : "♡"}
            </Text>
          </Animated.View>
        );
      })}
    </View>
  );
}
