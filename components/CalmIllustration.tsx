import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, G, LinearGradient, Path, Stop } from "react-native-svg";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import {
  welcomeSvgPaths,
  welcomeSvgLinearGradients,
} from "../src/illustrations/welcomeSvgPaths";

const hidden = new Set([
  0,
  1,
  2,
  10,
  11,
  ...Array.from({ length: 17 }, (_, i) => 98 + i),
]);
// The right butterfly is an independent set of SVG paths. The figure and the
// butterfly touching her hand remain fixed to preserve the original line art.
const butterfly = new Set([
  ...Array.from({ length: 26 }, (_, i) => 115 + i),
  145,
  147,
]);
const AnimatedG = Animated.createAnimatedComponent(G);
export default function CalmIllustration({ moving }: { moving: boolean }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(progress);
    progress.value = 0;
    if (moving)
      progress.value = withRepeat(
        withTiming(1, { duration: 6800, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    return () => cancelAnimation(progress);
  }, [moving, progress]);
  const motion = useAnimatedProps(() => ({
    opacity: 1,
    matrix: [1, 0, 0, 1, progress.value * 12, progress.value * -16],
  }));
  return (
    <View
      style={s.art}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 1588 2048"
        preserveAspectRatio="xMidYMid meet"
      >
        <Defs>
          {welcomeSvgLinearGradients.map((gradient) => (
            <LinearGradient
              key={gradient.id}
              id={gradient.id}
              x1={gradient.x1}
              y1={gradient.y1}
              x2={gradient.x2}
              y2={gradient.y2}
              gradientUnits="userSpaceOnUse"
            >
              {gradient.stops.map((stop, i) => (
                <Stop key={i} {...stop} />
              ))}
            </LinearGradient>
          ))}
        </Defs>
        {welcomeSvgPaths.map((path, index) =>
          hidden.has(index) || butterfly.has(index) ? null : (
            <Path key={index} {...path} />
          )
        )}
        <AnimatedG animatedProps={motion}>
          {[...butterfly].map((index) => (
            <Path key={index} {...welcomeSvgPaths[index]} />
          ))}
        </AnimatedG>
      </Svg>
    </View>
  );
}
const s = StyleSheet.create({ art: { width: "84%", height: "90%" } });
