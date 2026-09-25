import React, { useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "./Typography";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import ScreenContainer from "./ScreenContainer";
import CalmIllustration from "./CalmIllustration";
import { onboardingStyles } from "../src/screens/Onboarding/vibesOnboardingStyles";
import { vibesTheme } from "../src/theme/vibesTheme";
import { useCalmMotion } from "../src/hooks/useCalmMotion";
import {
  BREATH_CYCLE_MS,
  getBreathFrame,
  getCalmIllustrationSize,
} from "../src/lib/calmPause";

export default function CalmPause({
  onContinue,
  pending = false,
  showAction = true,
}: {
  onContinue?: () => void;
  pending?: boolean;
  showAction?: boolean;
}) {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { visible, reduceMotion } = useCalmMotion();
  const moving = visible && !reduceMotion;
  const size = getCalmIllustrationSize(
    width,
    height - insets.top - insets.bottom,
    fontScale
  );
  const clock = useSharedValue(0);
  const opacity = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(clock);
    clock.value = 0;
    if (moving)
      clock.value = withRepeat(
        withTiming(BREATH_CYCLE_MS, {
          duration: BREATH_CYCLE_MS,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    return () => cancelAnimation(clock);
  }, [moving, clock]);
  useEffect(() => {
    cancelAnimation(opacity);
    if (visible && !reduceMotion) {
      opacity.value = 0;
      opacity.value = withTiming(1, {
        duration: 400,
        easing: Easing.inOut(Easing.sin),
      });
    } else opacity.value = 1;
    return () => cancelAnimation(opacity);
  }, [visible, reduceMotion, opacity]);
  const breathing = useAnimatedStyle(() => {
    const eased = getBreathFrame(clock.value).expansion;
    return { transform: [{ scale: reduceMotion ? 1 : 0.84 + eased * 0.16 }] };
  });
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <ScreenContainer
      style={s.screen}
      edges={["top", "bottom", "left", "right"]}
    >
      <Animated.View style={[s.layout, fade]}>
        <ScrollView
          style={s.body}
          contentContainerStyle={s.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.copy}>
            <Text
              accessibilityRole="header"
              style={[s.title, width < 360 && s.smallTitle]}
            >
              Un momento para vos
            </Text>
            <Text style={s.subtitle}>Soltá el día. Volvé a tu ritmo.</Text>
          </View>
          <View style={[s.scene, { width: size, height: size }]}>
            <Animated.View
              pointerEvents="none"
              style={[s.outerCircle, breathing]}
            >
              <View style={s.middleCircle}>
                <View style={s.innerCircle} />
              </View>
            </Animated.View>
            <CalmIllustration moving={moving} />
          </View>
          <Text style={s.help}>
            {reduceMotion
              ? "Este momento es para vos"
              : "Seguí el ritmo del círculo"}
          </Text>
        </ScrollView>
        {showAction ? (
          <View style={s.footer}>
            {pending ? (
              <Text accessibilityLiveRegion="polite" style={s.loading}>
                Preparando tu próximo paso…
              </Text>
            ) : null}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ busy: pending }}
              onPress={onContinue}
              activeOpacity={0.85}
              style={[onboardingStyles.primaryButton, s.primary]}
            >
              <Text style={[onboardingStyles.primaryButtonText, s.primaryLabel]}>
                Continuar
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </Animated.View>
    </ScreenContainer>
  );
}
const serif = vibesTheme.fonts.regular;
const s = StyleSheet.create({
  screen: { backgroundColor: vibesTheme.colors.background },
  layout: { flex: 1 },
  body: { flex: 1 },
  bodyContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  copy: { width: "100%", maxWidth: 500, alignItems: "center" },
  eyebrow: {
    color: vibesTheme.colors.secondaryText,
    fontSize: 11,
    lineHeight: 17,
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 10,
  },
  title: {
    fontFamily: serif,
    fontSize: 34,
    lineHeight: 41,
    color: vibesTheme.colors.primaryText,
    textAlign: "center",
  },
  smallTitle: { fontSize: 28, lineHeight: 35 },
  subtitle: {
    fontSize: 17,
    lineHeight: 25,
    color: vibesTheme.colors.secondaryText,
    textAlign: "center",
    marginTop: 10,
  },
  scene: { alignItems: "center", justifyContent: "center", marginVertical: 12 },
  outerCircle: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 1000,
    borderWidth: 2,
    borderColor: vibesTheme.colors.accentMustard,
    backgroundColor: "rgba(228, 183, 110, 0.22)",
    padding: "6%",
  },
  middleCircle: {
    flex: 1,
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: "rgba(110, 110, 110, 0.30)",
    padding: "7%",
  },
  innerCircle: { flex: 1, borderRadius: 1000, backgroundColor: "rgba(228, 183, 110, 0.34)" },
  help: {
    fontSize: 15,
    lineHeight: 22,
    color: vibesTheme.colors.secondaryText,
    textAlign: "center",
    marginTop: 8,
  },
  footer: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 4,
  },
  primary: { paddingVertical: 14 },
  primaryLabel: { lineHeight: 24, textAlign: "center" },
  loading: {
    color: vibesTheme.colors.secondaryText,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
});
