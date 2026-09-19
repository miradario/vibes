import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, StyleSheet, View } from "react-native";

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
              width: 18 + (i % 3) * 10,
              height: 18 + (i % 3) * 10,
              borderRadius: 30,
              borderWidth: 2,
              borderColor: i % 2 ? "#E4B76E" : "#7F98B7",
              backgroundColor: i % 2 ? "#E4B76E44" : "#7F98B744",
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
          />
        );
      })}
    </View>
  );
}
