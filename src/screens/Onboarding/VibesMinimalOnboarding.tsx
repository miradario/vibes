/** @format */

import React, { useEffect } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import Animated, {
  Easing,
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

const removedRedFills = new Set(["rgb(213,173,164)", "rgb(215,190,184)"]);
const hiddenStaticPathIndexes = new Set([1, 2, 8, 49, 50, 51, 52]);

const basePaths = firstSvgPaths.filter(
  (_, index) =>
    index !== 0 &&
    index !== 47 &&
    index !== 48 &&
    index !== 53 &&
    !hiddenStaticPathIndexes.has(index) &&
    !removedRedFills.has(firstSvgPaths[index].fill),
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
  const { height } = useWindowDimensions();
  const illustrationHeight = Math.max(300, height * 0.5);

  const illustrationOpacity = useSharedValue(0);
  const titleY = useSharedValue(8);
  const titleOpacity = useSharedValue(0);
  const ctaOpacity = useSharedValue(0);
  const ctaScale = useSharedValue(1);
  const drawProgress = useSharedValue(0);
  const fillOpacity = useSharedValue(0);

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
    fillOpacity.value = withDelay(
      2500,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }),
    );

  }, [
    ctaOpacity,
    drawProgress,
    fillOpacity,
    illustrationOpacity,
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
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <Defs>
            <LinearGradient
              id="ScreenTopRightGlow"
              x1="100"
              y1="0"
              x2="35"
              y2="70"
            >
              <Stop
                offset="0"
                stopColor={vibesTheme.colors.accentMustard}
                stopOpacity={0.11}
              />
              <Stop
                offset="1"
                stopColor={vibesTheme.colors.accentMustard}
                stopOpacity={0}
              />
            </LinearGradient>
          </Defs>
          <Rect
            x="0"
            y="0"
            width="100"
            height="100"
            fill="url(#ScreenTopRightGlow)"
          />
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
            <LinearGradient
              id="Gradient1"
              x1="639.033"
              y1="1028.56"
              x2="1034.76"
              y2="1131.54"
            >
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
  textBlock: {
    marginTop: vibesTheme.spacing.md,
    alignItems: "center",
    paddingHorizontal: vibesTheme.spacing.xl,
  },
  title: {
    fontSize: 42,
    letterSpacing: 0.3,
    textAlign: "center",
    color: vibesTheme.colors.primaryText,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  body: {
    marginTop: vibesTheme.spacing.lg,
    fontSize: 24,
    lineHeight: 22,
    textAlign: "center",
    color: vibesTheme.colors.secondaryText,
    fontFamily: "CormorantGaramond_500Medium",
    maxWidth: 380,
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
