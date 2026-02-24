/** @format */

import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { vibesTheme } from "../../theme/vibesTheme";
import Icon from "../../../components/Icon";
import { firstSvgPaths } from "./firstSvgPaths";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

type DrawStrokePathProps = {
  d: string;
  dash: number;
  startAt: number;
  span: number;
  progress: SharedValue<number>;
};

const DrawStrokePath = ({
  d,
  dash,
  startAt,
  span,
  progress,
}: DrawStrokePathProps) => {
  const animatedProps = useAnimatedProps(() => {
    "worklet";
    const local = Math.min(Math.max((progress.value - startAt) / span, 0), 1);
    return {
      strokeDashoffset: dash * (1 - local),
      opacity: local > 0 ? 0.95 : 0,
    };
  });

  return (
    <AnimatedPath
      d={d}
      fill="none"
      stroke={vibesTheme.colors.lineArt}
      strokeWidth={2.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dash}
      animatedProps={animatedProps}
    />
  );
};

type ButterflyProps = {
  phase: number;
  amplitudeX: number;
  amplitudeY: number;
  scale: number;
  progress: SharedValue<number>;
  x: number;
  y: number;
  size: number;
};

const butterflyParts = [firstSvgPaths[47], firstSvgPaths[48], firstSvgPaths[53]];

const FlyingButterfly = ({
  phase,
  amplitudeX,
  amplitudeY,
  scale,
  progress,
  x,
  y,
  size,
}: ButterflyProps) => {
  const butterflyStyle = useAnimatedStyle(() => {
    "worklet";
    const t = Math.min(Math.max(progress.value, 0), 1);
    const lateral = Math.sin((t + phase) * Math.PI * 2.4);
    const lift = Math.cos((t + phase) * Math.PI * 2.1);
    const tx = t * amplitudeX * 1.7 + lateral * amplitudeX * 0.34;
    const ty = -t * amplitudeY * 2.7 + lift * amplitudeY * 0.3;
    const rot = lateral * 10;
    const flutter = 1 + Math.sin((t + phase) * Math.PI * 5.2) * 0.04;
    const opacity = interpolate(
      t,
      [0, 0.08, 0.58, 0.84, 1],
      [0, 0.96, 0.92, 0.48, 0],
    );

    return {
      opacity,
      transform: [
        { translateX: tx },
        { translateY: ty },
        { rotate: `${rot}deg` },
        { scale: scale * flutter },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.butterflyLayer,
        { left: x, top: y, width: size, height: size },
        butterflyStyle,
      ]}
    >
      <Svg width="100%" height="100%" viewBox="880 145 150 120">
        {butterflyParts.map((part, index) => (
          <Path key={`butterfly-${index}`} d={part.d} fill={part.fill} />
        ))}
      </Svg>
    </Animated.View>
  );
};

const butterflyPathIndexes = new Set([47, 48, 53]);
const hiddenStaticPathIndexes = new Set([2, 49, 50, 51, 52]);

const basePaths = firstSvgPaths.filter(
  (_, index) =>
    index !== 0 &&
    !butterflyPathIndexes.has(index) &&
    !hiddenStaticPathIndexes.has(index),
);

const drawPaths = [
  { d: firstSvgPaths[45].d, dash: 12000, startAt: 0.0, span: 0.22 },
  { d: firstSvgPaths[3].d, dash: 26000, startAt: 0.22, span: 0.26 },
  { d: firstSvgPaths[8].d, dash: 13000, startAt: 0.48, span: 0.18 },
  { d: firstSvgPaths[7].d, dash: 28000, startAt: 0.66, span: 0.22 },
  { d: firstSvgPaths[44].d, dash: 10000, startAt: 0.88, span: 0.12 },
] as const;

const VibesMinimalOnboarding = () => {
  const navigation = useNavigation();
  const { height, width } = useWindowDimensions();
  const illustrationHeight = Math.max(300, height * 0.5);
  const illustrationWidth = Math.max(280, width - vibesTheme.spacing.lg * 2);

  const illustrationOpacity = useSharedValue(0);
  const titleY = useSharedValue(8);
  const titleOpacity = useSharedValue(0);
  const ctaOpacity = useSharedValue(0);
  const ctaScale = useSharedValue(1);
  const drawProgress = useSharedValue(0);
  const fillOpacity = useSharedValue(0);
  const penProgress = useSharedValue(0);
  const butterflyFlightA = useSharedValue(0);
  const butterflyFlightB = useSharedValue(0);
  const butterflyFlightC = useSharedValue(0);

  useEffect(() => {
    illustrationOpacity.value = withTiming(1, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
    titleOpacity.value = withDelay(
      120,
      withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }),
    );
    titleY.value = withDelay(
      120,
      withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) }),
    );
    ctaOpacity.value = withDelay(
      260,
      withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }),
    );

    drawProgress.value = withDelay(
      180,
      withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.cubic) }),
    );
    penProgress.value = withDelay(
      180,
      withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.cubic) }),
    );
    fillOpacity.value = withDelay(
      2500,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }),
    );

    butterflyFlightA.value = withDelay(
      2450,
      withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.cubic) }),
    );
    butterflyFlightB.value = withDelay(
      2680,
      withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.cubic) }),
    );
    butterflyFlightC.value = withDelay(
      2860,
      withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.cubic) }),
    );
  }, [
    butterflyFlightA,
    butterflyFlightB,
    butterflyFlightC,
    ctaOpacity,
    drawProgress,
    fillOpacity,
    illustrationOpacity,
    penProgress,
    titleOpacity,
    titleY,
  ]);

  const illustrationStyle = useAnimatedStyle(() => ({
    opacity: illustrationOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ scale: ctaScale.value }],
  }));

  const fillGroupProps = useAnimatedProps(() => ({
    opacity: fillOpacity.value,
  }));

  const penStyle = useAnimatedStyle(() => ({
    opacity: drawProgress.value < 1 ? 0.9 : 0,
    transform: [
      {
        translateX: interpolate(
          penProgress.value,
          [0, 0.22, 0.48, 0.66, 0.88, 1],
          [
            illustrationWidth * 0.54,
            illustrationWidth * 0.43,
            illustrationWidth * 0.39,
            illustrationWidth * 0.58,
            illustrationWidth * 0.45,
            illustrationWidth * 0.62,
          ],
        ),
      },
      {
        translateY: interpolate(
          penProgress.value,
          [0, 0.22, 0.48, 0.66, 0.88, 1],
          [
            illustrationHeight * 0.16,
            illustrationHeight * 0.34,
            illustrationHeight * 0.46,
            illustrationHeight * 0.54,
            illustrationHeight * 0.72,
            illustrationHeight * 0.9,
          ],
        ),
      },
    ],
  }));

  const onContinue = () => {
    ctaScale.value = withSequence(
      withTiming(0.96, { duration: 90 }),
      withTiming(1, { duration: 120 }),
    );
    setTimeout(() => {
      navigation.navigate("Welcome" as never);
    }, 110);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View pointerEvents="none" style={styles.topGlowOverlay}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="ScreenTopRightGlow" x1="100" y1="0" x2="35" y2="70">
              <Stop offset="0" stopColor={vibesTheme.colors.accentMustard} stopOpacity={0.11} />
              <Stop offset="1" stopColor={vibesTheme.colors.accentMustard} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill="url(#ScreenTopRightGlow)" />
        </Svg>
      </View>
      <Animated.View
        style={[
          styles.illustrationArea,
          { height: illustrationHeight },
          illustrationStyle,
        ]}
      >
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 1588 2048"
          preserveAspectRatio="xMidYMid meet"
        >
          <Defs>
            <LinearGradient id="Gradient1" x1="639.033" y1="1028.56" x2="1034.76" y2="1131.54">
              <Stop offset="0" stopColor="rgb(216,227,240)" stopOpacity={1} />
              <Stop offset="1" stopColor="rgb(251,252,253)" stopOpacity={1} />
            </LinearGradient>
          </Defs>

          <AnimatedG animatedProps={fillGroupProps}>
            {basePaths.map((path, index) => (
              <Path key={`base-${index}`} d={path.d} fill={path.fill} />
            ))}
          </AnimatedG>

          {drawPaths.map((path, index) => (
            <DrawStrokePath
              key={`draw-${index}`}
              d={path.d}
              dash={path.dash}
              startAt={path.startAt}
              span={path.span}
              progress={drawProgress}
            />
          ))}
        </Svg>
        <Animated.View pointerEvents="none" style={[styles.penTip, penStyle]} />
        <FlyingButterfly
          phase={0}
          amplitudeX={26}
          amplitudeY={18}
          scale={1}
          progress={butterflyFlightA}
          x={illustrationWidth * 0.56}
          y={illustrationHeight * 0.09}
          size={62}
        />
        <FlyingButterfly
          phase={0.2}
          amplitudeX={21}
          amplitudeY={16}
          scale={0.86}
          progress={butterflyFlightB}
          x={illustrationWidth * 0.44}
          y={illustrationHeight * 0.16}
          size={54}
        />
        <FlyingButterfly
          phase={0.4}
          amplitudeX={19}
          amplitudeY={14}
          scale={0.78}
          progress={butterflyFlightC}
          x={illustrationWidth * 0.66}
          y={illustrationHeight * 0.14}
          size={48}
        />
      </Animated.View>

      <Animated.View style={[styles.textBlock, titleStyle]}>
        <Text style={styles.title}>Find Your{"\n"}True Vibe</Text>
        <Text style={styles.body}>
          Connect with like-minded souls and explore a more conscious way of
          living.
        </Text>
      </Animated.View>

      <AnimatedPressable
        style={[styles.ctaButton, ctaStyle]}
        onPress={onContinue}
      >
        <Icon
          name="chevron-forward"
          size={26}
          color={vibesTheme.colors.lineArt}
        />
      </AnimatedPressable>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: vibesTheme.colors.background,
    alignItems: "center",
  },
  topGlowOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "56%",
    height: "25%",
    zIndex: 0,
  },
  illustrationArea: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: vibesTheme.spacing.lg,
    paddingTop: vibesTheme.spacing.md,
  },
  butterflyLayer: {
    position: "absolute",
    zIndex: 4,
  },
  penTip: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: vibesTheme.colors.accentCoral,
    zIndex: 5,
  },
  textBlock: {
    marginTop: vibesTheme.spacing.md,
    alignItems: "center",
    paddingHorizontal: vibesTheme.spacing.xl,
  },
  title: {
    fontSize: 34,
    letterSpacing: 0.3,
    textAlign: "center",
    color: vibesTheme.colors.primaryText,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  body: {
    marginTop: vibesTheme.spacing.lg,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    color: vibesTheme.colors.secondaryText,
    fontFamily: "CormorantGaramond_500Medium",
    maxWidth: 320,
  },
  ctaButton: {
    marginTop: "auto",
    marginBottom: 40,
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: vibesTheme.colors.lineArt,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
});

export default VibesMinimalOnboarding;
