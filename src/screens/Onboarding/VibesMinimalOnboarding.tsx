/** @format */

import React, { useEffect, useRef, useState } from "react";
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
import { ResizeMode, Video, type AVPlaybackStatus } from "expo-av";
import * as Haptics from "expo-haptics";
import { vibesTheme } from "../../theme/vibesTheme";
import Icon from "../../../components/Icon";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const REVERSE_FRAME_MS = 16;
const REVERSE_STEP_MS = 180;
const MAX_REVERSE_DURATION_MS = 520;

type VibesMinimalOnboardingProps = {
  title?: string;
  body?: string;
  ctaLabel?: string;
  onContinue?: () => void | boolean | Promise<void | boolean>;
  reverseVideoOnContinue?: boolean;
};

const VibesMinimalOnboarding = ({
  title = "Find Your\nTrue Vibe",
  body = "Connect with like-minded souls and explore a more conscious way of living.",
  ctaLabel,
  onContinue: onContinueProp,
  reverseVideoOnContinue = false,
}: VibesMinimalOnboardingProps) => {
  const navigation = useNavigation();
  const { height } = useWindowDimensions();
  const illustrationHeight = Math.max(300, height * 0.5);
  const hasTitle = Boolean(title.trim());
  const videoRef = useRef<Video>(null);
  const durationRef = useRef(0);
  const positionRef = useRef(0);
  const isContinuingRef = useRef(false);
  const [videoShouldPlay, setVideoShouldPlay] = useState(true);

  const illustrationOpacity = useSharedValue(0);
  const titleY = useSharedValue(8);
  const titleOpacity = useSharedValue(0);
  const ctaOpacity = useSharedValue(0);
  const ctaScale = useSharedValue(1);
  const blurOpacity = useSharedValue(0);
  const blurScale = useSharedValue(0.98);

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

  const blurStyle = useAnimatedStyle(() => ({
    opacity: blurOpacity.value,
    transform: [{ scale: blurScale.value }],
  }));

  const continueToNext = async () => {
    if (onContinueProp) {
      const result = await onContinueProp();
      return result !== false;
    }
    navigation.navigate("Welcome" as never);
    return true;
  };

  const wait = (ms: number) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  const updatePlaybackStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    positionRef.current = status.positionMillis;
    durationRef.current = status.durationMillis ?? durationRef.current;
  };

  const playVideoBackToStart = async () => {
    const video = videoRef.current;
    if (!video) return;

    setVideoShouldPlay(false);
    const status = await video.getStatusAsync();
    if (!status.isLoaded) return;

    const duration = status.durationMillis ?? durationRef.current;
    let position = status.positionMillis || positionRef.current || duration;
    const startedAt = Date.now();

    while (position > 0 && Date.now() - startedAt < MAX_REVERSE_DURATION_MS) {
      position = Math.max(0, position - REVERSE_STEP_MS);
      await video.setPositionAsync(position);
      await wait(REVERSE_FRAME_MS);
    }

    await video.setPositionAsync(0);
  };

  const showBlur = () => {
    blurOpacity.value = withTiming(1, {
      duration: 360,
      easing: Easing.out(Easing.cubic),
    });
    blurScale.value = withTiming(1.04, {
      duration: 360,
      easing: Easing.out(Easing.cubic),
    });
  };

  const hideBlur = () => {
    blurOpacity.value = withTiming(0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
    blurScale.value = withTiming(0.98, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  };

  const onContinue = async () => {
    if (isContinuingRef.current) return;
    isContinuingRef.current = true;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    ctaScale.value = withSequence(
      withTiming(0.96, { duration: 90 }),
      withTiming(1, { duration: 120 }),
    );

    if (!reverseVideoOnContinue) {
      setTimeout(() => {
        void continueToNext().then((completed) => {
          if (!completed) isContinuingRef.current = false;
        });
      }, 110);
      return;
    }

    try {
      await playVideoBackToStart();
      showBlur();
      const completed = await continueToNext();
      if (!completed) {
        hideBlur();
        isContinuingRef.current = false;
      }
    } catch {
      hideBlur();
      isContinuingRef.current = false;
    }
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
          ref={videoRef}
          source={require("../../../assets/videos/boarding.mp4")}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={videoShouldPlay}
          isMuted
          onPlaybackStatusUpdate={updatePlaybackStatus}
        />
      </Animated.View>

      <Animated.View style={[styles.textBlock, titleStyle]}>
        {hasTitle ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={[styles.body, !hasTitle && styles.bodyWithoutTitle]}>
          {body}
        </Text>
      </Animated.View>

      <AnimatedPressable
        style={[ctaLabel ? styles.ctaPillButton : styles.ctaButton, ctaStyle]}
        onPress={onContinue}
      >
        {ctaLabel ? (
          <Text style={styles.ctaPillText}>{ctaLabel}</Text>
        ) : (
          <Icon
            name="chevron-forward"
            size={26}
            color={vibesTheme.colors.lineArt}
          />
        )}
      </AnimatedPressable>

      <Animated.View pointerEvents="none" style={[styles.blurOverlay, blurStyle]} />
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
  bodyWithoutTitle: {
    marginTop: 0,
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
  ctaPillButton: {
    marginTop: "auto",
    marginBottom: 40,
    minWidth: 220,
    height: 58,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.accentMustard,
    shadowColor: vibesTheme.colors.accentMustard,
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  ctaPillText: {
    color: "#FFFFFF",
    fontFamily: vibesTheme.fonts.medium,
    fontSize: 16,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(246, 246, 244, 0.92)",
    zIndex: 10,
  },
});

export default VibesMinimalOnboarding;
