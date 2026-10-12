/** @format */

import React, { useContext, useEffect, useState } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, { cancelAnimation, Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from "react-native-reanimated";
import { NavigationContext } from "@react-navigation/native";
import { logoLoaderFrame, logoLoaderPath, logoLoaderShapes } from "../src/illustrations/logoLoader";
import { useVibiRuntime } from "../src/vibi/useMotionPreference";

type VibesLoaderProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const AnimatedPath = Animated.createAnimatedComponent(Path);
function LoaderPiece({ shape, phase }: { shape: typeof logoLoaderShapes[number]; phase: SharedValue<number> }) {
  const props = useAnimatedProps(() => ({ d: logoLoaderPath(shape, logoLoaderFrame(phase.value).morph) }));
  return <AnimatedPath animatedProps={props} fill={shape.color} fillRule="nonzero" />;
}

const VibesLoader = ({ size = 32, style, accessibilityLabel = "Cargando" }: VibesLoaderProps) => {
  const phase = useSharedValue(0);
  const { active, reducedMotion } = useVibiRuntime();
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => navigation?.isFocused() ?? true);

  useEffect(() => {
    setFocused(navigation?.isFocused() ?? true);
    if (!navigation) return;
    const onFocus = navigation.addListener("focus", () => setFocused(true));
    const onBlur = navigation.addListener("blur", () => setFocused(false));
    return () => { onFocus(); onBlur(); };
  }, [navigation]);

  useEffect(() => {
    phase.value = 0;
    if (!active || !focused || reducedMotion) return;
    phase.value = withRepeat(withTiming(1, { duration: 4400, easing: Easing.linear }), -1, false);
    return () => { cancelAnimation(phase); phase.value = 0; };
  }, [active, focused, reducedMotion, phase]);

  const rotation = useAnimatedStyle(() => ({ transform: [{ rotate: `${logoLoaderFrame(phase.value).rotation}deg` }] }));

  return (
    <View accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel} accessibilityState={{ busy: true }}
      style={[styles.wrap, { width: size, height: size }, style]}>
      <Animated.View style={[{ width: size, height: size }, rotation]}>
        <Svg width={size} height={size} viewBox="0 0 1254 1254" accessible={false}>
          {logoLoaderShapes.map(shape => <LoaderPiece key={shape.key} shape={shape} phase={phase} />)}
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default VibesLoader;
