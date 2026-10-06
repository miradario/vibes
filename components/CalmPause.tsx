import React, { useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "./Typography";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenContainer from "./ScreenContainer";
import { onboardingStyles } from "../src/screens/Onboarding/vibesOnboardingStyles";
import { vibesTheme } from "../src/theme/vibesTheme";
import { useCalmMotion } from "../src/hooks/useCalmMotion";
import {
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
  const { reduceMotion } = useCalmMotion();
  // Startup can update window metrics and safe-area insets after mounting.
  // Keep the initial illustration dimensions throughout this short screen.
  const [size] = useState(() =>
    getCalmIllustrationSize(
      width,
      height - insets.top - insets.bottom,
      fontScale
    )
  );
  return (
    <ScreenContainer
      style={s.screen}
      edges={["top", "bottom", "left", "right"]}
    >
      <View style={s.layout}>
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
            <Image
              source={require("../assets/icon-ios-transparent.png")}
              style={{ width: size * 0.72, height: size * 0.72 }}
              resizeMode="contain"
              accessibilityLabel="Logo de Vibes"
            />
          </View>
          <Text style={s.help}>
            {reduceMotion
              ? "Este momento es para vos"
              : "Respirá a tu ritmo"}
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
              <Text
                style={[onboardingStyles.primaryButtonText, s.primaryLabel]}
              >
                Continuar
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
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
