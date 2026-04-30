/** @format */

import React, { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import styles from "../assets/styles";
import {
  getOnboardingProgress,
  getOnboardingStepIndex,
} from "../src/lib/onboardingFlow";

type OnboardingProgressBarProps = {
  screenName: string;
};

let lastFocusedOnboardingScreen: string | null = null;

const OnboardingProgressBar = ({ screenName }: OnboardingProgressBarProps) => {
  const navigation = useNavigation();
  const progress = getOnboardingProgress(screenName);
  const animatedProgress = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      const previousScreen = lastFocusedOnboardingScreen;
      const previousStepIndex = previousScreen
        ? getOnboardingStepIndex(previousScreen)
        : undefined;
      const currentStepIndex = getOnboardingStepIndex(screenName);
      const shouldAnimateFromPrevious =
        typeof previousStepIndex === "number" &&
        typeof currentStepIndex === "number" &&
        Math.abs(previousStepIndex - currentStepIndex) <= 1;
      const previousValue = shouldAnimateFromPrevious && previousScreen
        ? getOnboardingProgress(previousScreen).value
        : 0;

      const runAnimation = () => {
        animatedProgress.value = previousValue / 100;
        animatedProgress.value = withTiming(progress.value / 100, { duration: 380 });
        lastFocusedOnboardingScreen = screenName;
      };

      let hasAnimated = false;
      const animateOnce = () => {
        if (hasAnimated) return;
        hasAnimated = true;
        runAnimation();
      };

      const timeoutId = setTimeout(animateOnce, 140);
      const unsubscribe = navigation.addListener("transitionEnd", animateOnce);

      return () => {
        clearTimeout(timeoutId);
        unsubscribe();
      };
    }, [animatedProgress, navigation, progress.value, screenName]),
  );

  const fillStyle = useAnimatedStyle(() => ({
    transformOrigin: "left center",
    transform: [{ scaleX: animatedProgress.value }],
  }));

  return (
    <>
      <View style={styles.onboardProgressTrack}>
        <Animated.View style={[styles.onboardProgressFill, localStyles.fillBase, fillStyle]} />
      </View>
      <View style={localStyles.labelWrap}>
        <Text style={styles.onboardSkip}>{progress.label}</Text>
      </View>
    </>
  );
};

const localStyles = StyleSheet.create({
  labelWrap: {
    width: 40,
    alignItems: "flex-end",
  },
  fillBase: {
    width: "100%",
  },
});

export default OnboardingProgressBar;
