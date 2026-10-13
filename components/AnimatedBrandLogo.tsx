import React, { useEffect, useRef } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, { cancelAnimation, runOnJS, Easing, useAnimatedProps, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import { useIsFocused } from "@react-navigation/native";
import { useVibiRuntime } from "../src/vibi/useMotionPreference";
import { LOGO_MORPH_DURATION, logoMorphPath, logoMorphRenderShapes, type LogoMorphShape } from "../src/illustrations/logoMorph";
const AnimatedPath = Animated.createAnimatedComponent(Path);
function MorphPart({ shape, progress }: { shape: LogoMorphShape; progress: SharedValue<number> }) {
  const props = useAnimatedProps(() => ({ d: logoMorphPath(shape, progress.value) }));
  return <AnimatedPath animatedProps={props} fill={shape.color} fillRule="nonzero" />;
}
/** Real letter contours bend continuously into the brand mark, without particles. */
export default function AnimatedBrandLogo({ style, onComplete, direction = "word-to-logo", loop = false }: { style?: StyleProp<ViewStyle>; onComplete?: () => void; direction?: "word-to-logo" | "logo-to-word"; loop?: boolean }) {
  const target = direction === "logo-to-word" ? 0 : 1;
  const focused = useIsFocused();
  const { active, reducedMotion, motionReady } = useVibiRuntime();
  const progress = useSharedValue(direction === "logo-to-word" ? 1 : 0);
  const started = useRef(false);
  const completed = useRef(false);
  const completionRef = useRef(onComplete);
  completionRef.current = onComplete;
  const finish = React.useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    completionRef.current?.();
  }, []);
  useEffect(() => {
    if (!motionReady) return;
    if (reducedMotion) {
      cancelAnimation(progress);
      progress.value = target;
      started.current = true;
      finish();
      return;
    }
    if (!focused || !active) {
      cancelAnimation(progress);
      return;
    }
    if (loop) {
      progress.value = 1 - target;
      const timing = { duration: LOGO_MORPH_DURATION * 1.6, easing: Easing.inOut(Easing.cubic) };
      progress.value = withRepeat(withSequence(
        withDelay(900, withTiming(target, timing)),
        withDelay(900, withTiming(1 - target, timing)),
      ), -1, false);
      return () => cancelAnimation(progress);
    }
    if (Math.abs(progress.value - target) < 0.001) { finish(); return; }
    const delay = started.current ? 0 : 450;
    started.current = true;
    progress.value = withDelay(delay, withTiming(target, {
      duration: LOGO_MORPH_DURATION * Math.abs(target - progress.value),
      easing: Easing.inOut(Easing.cubic),
    }, (finished) => { if (finished) runOnJS(finish)(); }));
    return () => cancelAnimation(progress);
  }, [motionReady, reducedMotion, focused, active, progress, finish, target, loop]);
  return (
    <View style={style} accessible accessibilityLabel="Vibes" pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 1254 1254" preserveAspectRatio="xMidYMid meet">
        {logoMorphRenderShapes.map(shape => <MorphPart key={shape.letter} shape={shape} progress={progress} />)}
      </Svg>
    </View>
  );
}
