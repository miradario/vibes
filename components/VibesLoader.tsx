/** @format */

import React, { useContext, useEffect, useState } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, { cancelAnimation, Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import { NavigationContext } from "@react-navigation/native";
import { logoMorphPath, logoMorphRenderShapes, type LogoMorphShape } from "../src/illustrations/logoMorph";
import { useVibiRuntime } from "../src/vibi/useMotionPreference";
import { INHALE_MS, EXHALE_MS } from "../src/lib/calmPause";

type VibesLoaderProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const AnimatedPath = Animated.createAnimatedComponent(Path);
function LoaderPiece({ shape, phase }: { shape: LogoMorphShape; phase: SharedValue<number> }) {
  const props = useAnimatedProps(() => ({ d: logoMorphPath(shape, phase.value) }));
  return <AnimatedPath animatedProps={props} fill={shape.color} fillRule="nonzero" />;
}

const VibesLoader = ({ size = 32, style, accessibilityLabel = "Cargando" }: VibesLoaderProps) => {
  const phase = useSharedValue(1);
  const { active, reducedMotion, motionReady } = useVibiRuntime();
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
    cancelAnimation(phase);
    if (!motionReady || reducedMotion) { phase.value = 1; return; }
    if (!active || !focused) return;
    phase.value = 1;
    const easing = Easing.inOut(Easing.sin);
    phase.value = withRepeat(withSequence(
      withTiming(0, { duration: INHALE_MS, easing }),
      withTiming(1, { duration: EXHALE_MS, easing }),
    ), -1, false);
    return () => cancelAnimation(phase);
  }, [active, focused, reducedMotion, motionReady, phase]);
  const breathingStyle = useAnimatedStyle(() => ({ transform: [{ scale: reducedMotion ? 1 : 1 + 0.04 * (1 - phase.value) }] }));

  return (
    <View accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel} accessibilityState={{ busy: true }}
      style={[styles.wrap, { width: size, height: size }, style]}>
      <Animated.View style={[{ width: size, height: size }, breathingStyle]}>
        <Svg width={size} height={size} viewBox="0 0 1254 1254" accessible={false}>
          {logoMorphRenderShapes.map(shape => <LoaderPiece key={shape.letter} shape={shape} phase={phase} />)}
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
