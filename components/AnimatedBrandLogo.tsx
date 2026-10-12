import React, { useEffect, useRef } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, { cancelAnimation, Easing, useAnimatedProps, useSharedValue, withDelay, withTiming, type SharedValue } from "react-native-reanimated";
import { useIsFocused } from "@react-navigation/native";
import { useVibiRuntime } from "../src/vibi/useMotionPreference";
import { LOGO_MORPH_DURATION, logoMorphPath, logoMorphRenderShapes, type LogoMorphShape } from "../src/illustrations/logoMorph";
const AnimatedPath = Animated.createAnimatedComponent(Path);
function MorphPart({ shape, progress }: { shape: LogoMorphShape; progress: SharedValue<number> }) {
  const props = useAnimatedProps(() => ({ d: logoMorphPath(shape, progress.value) }));
  return <AnimatedPath animatedProps={props} fill={shape.color} fillRule="nonzero" />;
}
/** Real letter contours bend continuously into the brand mark, without particles. */
export default function AnimatedBrandLogo({ style }: { style?: StyleProp<ViewStyle> }) {
  const focused = useIsFocused();
  const { active, reducedMotion, motionReady } = useVibiRuntime();
  const progress = useSharedValue(0);
  const started = useRef(false);
  useEffect(() => {
    if (!motionReady) return;
    if (reducedMotion) {
      cancelAnimation(progress);
      progress.value = 1;
      started.current = true;
      return;
    }
    if (!focused || !active) {
      cancelAnimation(progress);
      return;
    }
    if (progress.value >= 1) return;
    const delay = started.current ? 0 : 450;
    started.current = true;
    progress.value = withDelay(delay, withTiming(1, {
      duration: LOGO_MORPH_DURATION * (1 - progress.value),
      easing: Easing.inOut(Easing.cubic),
    }));
    return () => cancelAnimation(progress);
  }, [motionReady, reducedMotion, focused, active, progress]);
  return (
    <View style={style} accessible accessibilityLabel="Vibes" pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 1254 1254" preserveAspectRatio="xMidYMid meet">
        {logoMorphRenderShapes.map(shape => <MorphPart key={shape.letter} shape={shape} progress={progress} />)}
      </Svg>
    </View>
  );
}
