/** @format */

/**
 * ConexionReveal
 *
 * Renders conexion.png revealed progressively from top to bottom,
 * like it's being painted on screen.
 *
 * Uses only React Native Animated (no Skia dependency).
 */

import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";

type Props = {
  width: number;
  height: number;
  durationMs?: number;
};

const ConexionReveal = ({ width, height, durationMs = 3200 }: Props) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: durationMs,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false, // height animation can't use native driver
    }).start();
  }, [durationMs, progress]);

  // Clip mask height grows from 0 → full height
  const clipHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, height],
  });

  // Slight opacity fade-in at the start
  const opacity = progress.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 1, 1],
  });

  if (width === 0 || height === 0) return null;

  return (
    <View style={{ width, height }}>
      <Animated.View
        style={[
          styles.clipContainer,
          { width, height: clipHeight, opacity },
        ]}
      >
        <Image
          source={require("../assets/images/conexion.png")}
          style={{ width, height }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  clipContainer: {
    overflow: "hidden",
    position: "absolute",
    top: 0,
    left: 0,
  },
});

export default ConexionReveal;
