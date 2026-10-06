import React from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "./Typography";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenContainer from "./ScreenContainer";
import Vibi from "./Vibi";
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
  onBreathComplete,
}: {
  onContinue?: () => void;
  pending?: boolean;
  showAction?: boolean;
  onBreathComplete?: () => void;
}) {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { visible, reduceMotion } = useCalmMotion();
  const size = getCalmIllustrationSize(
    width,
    height - insets.top - insets.bottom,
    fontScale
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
          <View
            style={[s.scene, { width: size, height: size }]}
            accessible
            accessibilityLabel="Logo de Vibes respirando"
          >
            <Vibi
              state="breathing"
              loop
              viewportSize={4.6}
              onCycleComplete={onBreathComplete}
              size={size * 0.72}
              paused={!visible}
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
