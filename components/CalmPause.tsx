import React from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "./Typography";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenContainer from "./ScreenContainer";
import AnimatedBrandLogo from "./AnimatedBrandLogo";
import { onboardingStyles } from "../src/screens/Onboarding/vibesOnboardingStyles";
import { vibesTheme } from "../src/theme/vibesTheme";
import { useCalmMotion } from "../src/hooks/useCalmMotion";
import {
  getCalmIllustrationSize,
} from "../src/lib/calmPause";
import * as ds from "../src/theme/tokens";

export default function CalmPause({
  onContinue,
  pending = false,
  showAction = true,
  onIntroComplete,
}: {
  onContinue?: () => void;
  pending?: boolean;
  showAction?: boolean;
  onIntroComplete?: () => void;
}) {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { visible, reduceMotion } = useCalmMotion();
  const [logoComplete, setLogoComplete] = React.useState(false);
  const textOpacity = React.useRef(new Animated.Value(0)).current;
  const completionRef = React.useRef(onIntroComplete);
  completionRef.current = onIntroComplete;
  React.useEffect(() => {
    if (!logoComplete || !visible) return;
    const fade = Animated.timing(textOpacity, {
      toValue: 1,
      duration: reduceMotion ? 0 : 650,
      useNativeDriver: true,
    });
    fade.start(({ finished }) => { if (finished) completionRef.current?.(); });
    return () => fade.stop();
  }, [logoComplete, visible, reduceMotion, textOpacity]);
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
            accessibilityLabel="Vibes"
          >
            <AnimatedBrandLogo
              style={{ width: size, height: size }}
              onComplete={() => setLogoComplete(true)}
            />
          </View>
          <Animated.View style={{ opacity: textOpacity }}>
          <Text style={s.help}>
            {reduceMotion
              ? "Este momento es para vos"
              : "Respirá a tu ritmo"}
          </Text>
          </Animated.View>
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
    paddingHorizontal: ds.spacing[5],
    paddingTop: ds.spacing[3],
    paddingBottom: ds.spacing[3],
  },
  scene: { alignItems: "center", justifyContent: "center", marginVertical: ds.spacing[3] },
  help: {
    ...ds.textStyles.body,
    color: vibesTheme.colors.secondaryText,
    textAlign: "center",
    marginTop: ds.spacing[2],
  },
  footer: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    paddingHorizontal: ds.spacing[5],
    paddingTop: ds.spacing[2],
    paddingBottom: ds.spacing[1],
    gap: ds.spacing[1],
  },
  primary: { paddingVertical: ds.spacing[4] },
  primaryLabel: { lineHeight: /* ds-lint-allow DS-TODO: lineHeight 24 suelto (sin fontSize en el mismo estilo) */ 24, textAlign: "center" },
  loading: {
    color: vibesTheme.colors.secondaryText,
    textAlign: "center",
    ...ds.textStyles.bodySmall,
    marginBottom: ds.spacing[2],
  },
});
