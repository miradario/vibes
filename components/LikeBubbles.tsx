import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, StyleSheet, View } from "react-native";
import { Text } from "./Typography";

export default function LikeBubbles({ trigger }: { trigger: number }) {
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let active = true;
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
      {Array.from({ length: 9 }, (_, i) => {
        const angle = (i * Math.PI * 2) / 9;
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              width: 24 + (i % 3) * 8,
              height: 24 + (i % 3) * 8,
              borderRadius: 30,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: i % 2 ? "#E4B76E" : "#DCE6F0",
              opacity: progress.interpolate({
                inputRange: [0, 0.65, 1],
                outputRange: [0, 1, 0],
              }),
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Math.cos(angle) * 155],
                  }),
                },
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, Math.sin(angle) * 155 - 70],
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
                color: i % 2 ? "#3B3328" : "#56708D",
                fontSize: 14,
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
