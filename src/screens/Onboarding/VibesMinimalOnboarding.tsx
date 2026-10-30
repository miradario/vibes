/** @format */

import React, { useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Text } from "../../../components/Typography";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { VIBES_LOGO } from "../../constants/brandAssets";
import * as Haptics from "expo-haptics";
import { vibesTheme } from "../../theme/vibesTheme";
import Icon from "../../../components/Icon";
import VibesLoader from "../../../components/VibesLoader";
import * as ds from "../../theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type VibesMinimalOnboardingProps = {
  title?: string;
  body?: string;
  ctaLabel?: string;
  onContinue?: () => void | boolean | Promise<void | boolean>;
  autoContinue?: boolean;
};

const VibesMinimalOnboarding = ({
  title = "Encontrá tu\nVibe real",
  body = "Conectá con personas afines y explorá una forma más consciente de vivir.",
  ctaLabel,
  onContinue: onContinueProp,
  autoContinue = false,
}: VibesMinimalOnboardingProps) => {
  const navigation = useNavigation();
  const { height } = useWindowDimensions();
  const illustrationHeight = Math.max(300, height * 0.5);
  const hasTitle = Boolean(title.trim());
  const isContinuingRef = useRef(false);
  const hasAutoContinuedRef = useRef(false);
  const [isContinuing, setIsContinuing] = useState(false);

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
      withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) })
    );
    titleY.value = withDelay(
      120,
      withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) })
    );
    ctaOpacity.value = withDelay(
      260,
      withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) })
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

  const onContinue = async () => {
    if (isContinuingRef.current) return;
    isContinuingRef.current = true;
    setIsContinuing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    ctaScale.value = withSequence(
      withTiming(0.96, { duration: 90 }),
      withTiming(1, { duration: 120 })
    );

    try {
      const completed = await continueToNext();
      if (completed) return;
    } catch {
      // Leave the action available if navigation or completion fails.
    }
    isContinuingRef.current = false;
    setIsContinuing(false);
  };

  useEffect(() => {
    if (!autoContinue || hasAutoContinuedRef.current) return;
    hasAutoContinuedRef.current = true;
    const timeoutId = setTimeout(() => {
      void onContinue();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [autoContinue]);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          styles.illustrationArea,
          { height: illustrationHeight },
          illustrationStyle,
        ]}
      >
        <Image source={VIBES_LOGO} style={styles.video} resizeMode="contain" accessibilityLabel="Vibes" />
      </Animated.View>

      <Animated.View style={[styles.textBlock, titleStyle]}>
        {hasTitle ? (
          <Text style={styles.title} maxFontSizeMultiplier={1}>
            {title}
          </Text>
        ) : null}
        {body.trim() ? (
          <Text style={[styles.body, !hasTitle && styles.bodyWithoutTitle]}>
            {body}
          </Text>
        ) : null}
      </Animated.View>

      {autoContinue ? null : (
        <AnimatedPressable
          style={[ctaLabel ? styles.ctaPillButton : styles.ctaButton, ctaStyle]}
          onPress={onContinue}
        >
          {ctaLabel ? (
            <Text style={styles.ctaPillText}>{ctaLabel}</Text>
          ) : (
            <Icon
              name="chevron-forward"
              size={ds.iconSize.lg}
              color={vibesTheme.colors.primaryText}
            />
          )}
        </AnimatedPressable>
      )}

      <Animated.View
        pointerEvents="none"
        style={[styles.blurOverlay, blurStyle]}
      />
      {isContinuing ? (
        <View pointerEvents="none" style={styles.loaderOverlay}>
          <VibesLoader />
        </View>
      ) : null}
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
    paddingHorizontal: vibesTheme.spacing[6],
    paddingTop: vibesTheme.spacing[4],
  },
  video: {
    width: "100%",
    height: "100%",
  },
  textBlock: {
    marginTop: vibesTheme.spacing[4],
    alignItems: "center",
    paddingHorizontal: vibesTheme.spacing[8],
  },
  title: {
    ...ds.textStyles.display,
    letterSpacing: 0.3,
    textAlign: "center",
    color: vibesTheme.colors.primaryText,
  },
  body: {
    marginTop: vibesTheme.spacing[6],
    ...ds.textStyles.title,
    textAlign: "center",
    color: vibesTheme.colors.secondaryText,
    maxWidth: 380,
  },
  bodyWithoutTitle: {
    marginTop: 0,
  },
  ctaButton: {
    marginTop: "auto",
    marginBottom: ds.spacing[12],
    width: 64,
    height: 64,
    borderRadius: ds.radii.pill,
    borderWidth: 1,
    borderColor: vibesTheme.colors.primaryText,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  ctaPillButton: {
    marginTop: "auto",
    marginBottom: ds.spacing[12],
    minWidth: 220,
    height: 58,
    borderRadius: ds.radii.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.accentMustard,
    ...ds.glow.accent,
    elevation: ds.shadows.md.elevation,
  },
  ctaPillText: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.subtitleMedium,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ds.colors.bg.surfaceTranslucent,
    zIndex: 10,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.withAlpha(ds.colors.base.paper, ds.opacity.strong),
  },
});

export default VibesMinimalOnboarding;
