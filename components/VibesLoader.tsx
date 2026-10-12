/** @format */

import React, { useContext, useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { NavigationContext } from "@react-navigation/native";
import { VIBES_LOGO } from "../src/constants/brandAssets";
import { useVibiRuntime } from "../src/vibi/useMotionPreference";

type VibesLoaderProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
};

const VibesLoader = ({ size = 72, style }: VibesLoaderProps) => {
  const phase = useRef(new Animated.Value(0)).current;
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
    phase.setValue(0);
    if (!active || !focused || reducedMotion) return;
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(phase, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(phase, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    pulse.start();
    return () => { pulse.stop(); phase.setValue(0); };
  }, [active, focused, reducedMotion, phase]);

  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Cargando" accessibilityState={{ busy: true }}
      style={[styles.wrap, { width: size, height: size }, style]}>
      <Animated.Image
        source={VIBES_LOGO}
        resizeMode="contain"
        accessible={false}
        style={{
          width: size,
          height: size,
          opacity: phase.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }),
          transform: [
            { scale: phase.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) },
            { translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.025] }) },
          ],
        }}
      />
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
