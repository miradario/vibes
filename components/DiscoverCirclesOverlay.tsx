/** @format */

import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

type AnimatedCircleLayerProps = {
  left: string;
  top: string;
  size: number;
  color: string;
  opacity: number;
  durationMs: number;
  phase?: number;
  amplitudeX?: number;
  amplitudeY?: number;
};

const AnimatedCircleLayer = ({
  left,
  top,
  size,
  color,
  opacity,
  durationMs,
  phase = 0,
  amplitudeX = 4,
  amplitudeY = 7,
}: AnimatedCircleLayerProps) => {
  const loop = useSharedValue(phase);

  useEffect(() => {
    loop.value = withRepeat(
      withTiming(phase + 1, { duration: durationMs, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [durationMs, loop, phase]);

  const style = useAnimatedStyle(() => {
    const t = (loop.value % 1 + 1) % 1;
    const dx = Math.sin(t * Math.PI * 2) * amplitudeX;
    const dy = Math.cos((t + 0.1) * Math.PI * 2) * amplitudeY;
    const scale = 0.99 + Math.sin((t + 0.2) * Math.PI * 2) * 0.03;
    const layerOpacity = opacity + Math.sin((t + 0.3) * Math.PI * 2) * 0.04;

    return {
      opacity: layerOpacity,
      transform: [{ translateX: dx }, { translateY: dy }, { scale }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.layer, { left, top, width: size, height: size }, style]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={color} />
      </Svg>
    </Animated.View>
  );
};

const DiscoverCirclesOverlay = () => {
  return (
    <View pointerEvents="none" style={styles.container}>
      <AnimatedCircleLayer
        left="-3%"
        top="26%"
        size={164}
        color="#9EB7D7"
        opacity={0.38}
        durationMs={3200}
        phase={0.1}
        amplitudeX={3}
        amplitudeY={7}
      />
      <AnimatedCircleLayer
        left="66%"
        top="52%"
        size={128}
        color="#E8C47E"
        opacity={0.34}
        durationMs={3800}
        phase={0.35}
        amplitudeX={4}
        amplitudeY={6}
      />
      <AnimatedCircleLayer
        left="72%"
        top="11%"
        size={74}
        color="#AEBFD1"
        opacity={0.28}
        durationMs={4400}
        phase={0.6}
        amplitudeX={2}
        amplitudeY={5}
      />
      <AnimatedCircleLayer
        left="76%"
        top="34%"
        size={136}
        color="#E1A17E"
        opacity={0.46}
        durationMs={4000}
        phase={0.48}
        amplitudeX={4}
        amplitudeY={7}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  layer: {
    position: "absolute",
  },
});

export default DiscoverCirclesOverlay;
