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
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { ResizeMode, Video } from "expo-av";
import { vibesTheme } from "../../theme/vibesTheme";
import Icon from "../../../components/Icon";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const VibesMinimalOnboarding = () => {
  const navigation = useNavigation();
  const { height } = useWindowDimensions();
  const illustrationHeight = Math.max(300, height * 0.5);

  const illustrationOpacity = useSharedValue(0);
  const titleY = useSharedValue(8);
  const titleOpacity = useSharedValue(0);
  const ctaOpacity = useSharedValue(0);
  const ctaScale = useSharedValue(1);

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
  }, [ctaOpacity, illustrationOpacity, titleOpacity, titleY]);

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
        <Video
          source={require("../../../assets/videos/boarding.mp4")}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          isMuted
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
  video: {
    width: "100%",
    height: "100%",
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
