/** @format */

import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";

type GradientPosition = "top" | "bottom" | "center";

type GradientProps = {
  position?: GradientPosition;
  isSpeaking: boolean;
  sizeMultiplier?: number;
  colors?: {
    halo?: string;
    core?: string;
    ember?: string;
  };
};

const { width, height } = Dimensions.get("window");

const getCenterY = (position: GradientPosition) => {
  if (position === "top") return height * 0.2;
  if (position === "bottom") return height * 0.8;
  return height * 0.5;
};

export function Gradient({
  position = "center",
  isSpeaking,
  sizeMultiplier = 1,
  colors,
}: GradientProps) {
  const safeSize = Math.max(0.2, sizeMultiplier);
  const centerY = getCenterY(position);
  const haloSize = width * 1.7 * safeSize;
  const coreSize = width * 1.2 * safeSize;
  const emberSize = width * 0.76 * safeSize;
  const haloTop = centerY - haloSize * 0.5;
  const coreTop = centerY - coreSize * 0.5;
  const emberTop = centerY - emberSize * 0.5;
  const haloLeft = -width * 0.35 + (width * 1.7 - haloSize) * 0.5;
  const coreLeft = -width * 0.08 + (width * 1.2 - coreSize) * 0.5;
  const emberLeft = width * 0.12 + (width * 0.76 - emberSize) * 0.5;
  const baseOpacity = isSpeaking ? 0.38 : 0.28;
  const pulse = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isSpeaking) {
      pulse.stopAnimation();
      drift.stopAnimation();
      pulse.setValue(0);
      drift.setValue(0);
      return;
    }

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    driftLoop.start();

    return () => {
      pulseLoop.stop();
      driftLoop.stop();
    };
  }, [drift, isSpeaking, pulse]);

  const motion = useMemo(() => {
    const driftY = drift.interpolate({
      inputRange: [0, 1],
      outputRange: [6, -6],
    });
    const haloScale = pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.98, isSpeaking ? 1.09 : 1.04],
    });
    const coreScale = pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.97, isSpeaking ? 1.12 : 1.06],
    });
    const emberScale = pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.96, isSpeaking ? 1.15 : 1.08],
    });
    const alpha = pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [baseOpacity * 0.9, baseOpacity * 1.05],
    });

    return { driftY, haloScale, coreScale, emberScale, alpha };
  }, [baseOpacity, drift, isSpeaking, pulse]);

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <Animated.View
        style={[
          styles.halo,
          {
            backgroundColor: colors?.halo ?? styles.halo.backgroundColor,
            left: haloLeft,
            width: haloSize,
            height: haloSize,
            borderRadius: haloSize,
            top: haloTop,
            opacity: motion.alpha,
            transform: [{ translateY: motion.driftY }, { scale: motion.haloScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.core,
          {
            backgroundColor: colors?.core ?? styles.core.backgroundColor,
            left: coreLeft,
            width: coreSize,
            height: coreSize,
            borderRadius: coreSize,
            top: coreTop,
            opacity: Animated.multiply(motion.alpha, 0.8),
            transform: [{ translateY: motion.driftY }, { scale: motion.coreScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ember,
          {
            backgroundColor: colors?.ember ?? styles.ember.backgroundColor,
            left: emberLeft,
            width: emberSize,
            height: emberSize,
            borderRadius: emberSize,
            top: emberTop,
            opacity: Animated.multiply(motion.alpha, 0.72),
            transform: [{ translateY: motion.driftY }, { scale: motion.emberScale }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  halo: {
    position: "absolute",
    left: -width * 0.35,
    width: width * 1.7,
    height: width * 1.7,
    borderRadius: width,
    backgroundColor: "#FFA85C",
  },
  core: {
    position: "absolute",
    left: -width * 0.08,
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width,
    backgroundColor: "#FF7A1A",
  },
  ember: {
    position: "absolute",
    left: width * 0.12,
    width: width * 0.76,
    height: width * 0.76,
    borderRadius: width,
    backgroundColor: "#FFD3A8",
  },
});

export default Gradient;
