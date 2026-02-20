/** @format */

import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { vibesTheme } from "../../theme/vibesTheme";
import Icon from "../../../components/Icon";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const VibesMinimalOnboarding = () => {
  const navigation = useNavigation();
  const { height } = useWindowDimensions();
  const illustrationOpacity = useSharedValue(0);
  const titleY = useSharedValue(8);
  const titleOpacity = useSharedValue(0);
  const ctaOpacity = useSharedValue(0);
  const ctaScale = useSharedValue(1);
  const draw1 = useSharedValue(0);
  const draw2 = useSharedValue(0);
  const draw3 = useSharedValue(0);
  const penProgress = useSharedValue(0);

  useEffect(() => {
    illustrationOpacity.value = withTiming(1, {
      duration: 400,
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

    const durationMs = 2600;
    const d1 = Math.round(durationMs * 0.55);
    const d2 = Math.round(durationMs * 0.25);
    const d3 = Math.max(1, durationMs - d1 - d2);

    draw1.value = withDelay(
      200,
      withTiming(1, { duration: d1, easing: Easing.out(Easing.cubic) }),
    );
    draw2.value = withDelay(
      200 + d1,
      withTiming(1, { duration: d2, easing: Easing.out(Easing.cubic) }),
    );
    draw3.value = withDelay(
      200 + d1 + d2,
      withTiming(1, { duration: d3, easing: Easing.out(Easing.cubic) }),
    );
    penProgress.value = withDelay(
      200,
      withTiming(1, {
        duration: durationMs,
        easing: Easing.inOut(Easing.quad),
      }),
    );
  }, [
    ctaOpacity,
    draw1,
    draw2,
    draw3,
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

  const line1Props = useAnimatedProps(() => ({
    strokeDashoffset: 1500 * (1 - draw1.value),
  }));
  const line2Props = useAnimatedProps(() => ({
    strokeDashoffset: 900 * (1 - draw2.value),
  }));
  const line3Props = useAnimatedProps(() => ({
    strokeDashoffset: 700 * (1 - draw3.value),
  }));

  const penDotProps = useAnimatedProps(() => {
    const x = interpolate(
      penProgress.value,
      [0, 0.55, 0.8, 1],
      [169, 141, 74, 196],
    );
    const y = interpolate(
      penProgress.value,
      [0, 0.55, 0.8, 1],
      [61, 210, 302, 277],
    );
    const opacity = interpolate(
      penProgress.value,
      [0, 0.97, 1],
      [0.65, 0.6, 0],
    );
    return { cx: x, cy: y, opacity };
  });

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
      <Animated.View
        style={[
          styles.illustrationArea,
          { height: Math.max(280, height * 0.45) },
          illustrationStyle,
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 360 320">
          <Ellipse
            cx="170"
            cy="150"
            rx="82"
            ry="96"
            fill={vibesTheme.colors.accentBlue}
            opacity={0.5}
          />
          <Circle
            cx="230"
            cy="216"
            r="56"
            fill={vibesTheme.colors.accentMustard}
            opacity={0.72}
          />
          <Circle
            cx="266"
            cy="62"
            r="44"
            fill={vibesTheme.colors.accentCoral}
            opacity={0.12}
          />

          <G
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.88}
          >
            <AnimatedPath
              d="M298 38c-5 40-28 62-53 70-24 8-51 3-66-11-17-17-7-29-1-36 M169 61c-11 11-23 25-35 42-16 23-27 51-24 74 2 14 10 24 22 30 M141 116c10-13 24-20 39-18 15 2 26 12 30 24 M150 131c7-8 18-12 28-10 9 1 16 7 19 15"
              stroke={vibesTheme.colors.lineArt}
              strokeWidth={1.5}
              strokeDasharray={1500}
              animatedProps={line1Props}
            />
            <AnimatedPath
              d="M141 158c16 9 39 10 54 1 M108 210c16-8 32-10 49-8 20 2 37 11 58 11 19 0 37-6 52-17"
              stroke={vibesTheme.colors.lineArt}
              strokeWidth={1.5}
              strokeDasharray={900}
              animatedProps={line2Props}
            />
            <AnimatedPath
              d="M74 302c13-44 35-72 66-88"
              stroke={vibesTheme.colors.lineArt}
              strokeWidth={1.5}
              strokeDasharray={700}
              animatedProps={line3Props}
            />
            <AnimatedPath
              d="M196 277c30 18 68 22 120 20"
              stroke={vibesTheme.colors.accentCoral}
              strokeWidth={1.35}
              strokeDasharray={700}
              animatedProps={line3Props}
            />
            <AnimatedCircle
              r={2.6}
              fill={vibesTheme.colors.accentCoral}
              animatedProps={penDotProps}
            />
          </G>

          <G fill={vibesTheme.colors.accentCoral} opacity={0.58}>
            <Circle cx="96" cy="92" r="2" />
            <Circle cx="267" cy="95" r="2" />
            <Circle cx="287" cy="140" r="1.8" />
            <Circle cx="108" cy="176" r="1.7" />
            <Circle cx="248" cy="176" r="1.7" />
          </G>
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
  illustrationArea: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: vibesTheme.spacing.xl,
    paddingTop: vibesTheme.spacing.md,
  },
  textBlock: {
    marginTop: vibesTheme.spacing.lg,
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
