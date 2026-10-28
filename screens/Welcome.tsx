import React, { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useAuthSession } from "../src/auth/auth.queries";
import { Text } from "../components/Typography";
import AnimatedBrandLogo from "../components/AnimatedBrandLogo";
import { getBootIntroState, setWelcomeFocused, setWelcomeSlot, subscribeBootIntro } from "../src/lib/bootIntro";
import VibesActionButton from "../components/VibesActionButton";
import ScreenContainer from "../components/ScreenContainer";
import { vibesTheme } from "../src/theme/vibesTheme";
import { trackSignupEvent } from "../src/lib/signupEvents";
import Animated from "react-native-reanimated";
import useWanderingSphere from "../src/hooks/useWanderingSphere";
import { useVibiRuntime } from "../src/vibi/useMotionPreference";

const Welcome = () => {
  const navigation = useNavigation();
  const { height, width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = height - insets.top - insets.bottom < 700;
  const largeText = fontScale > 1.3;
  const { data: session, isLoading } = useAuthSession();
  const focused = useIsFocused();
  // On a cold start the root boot intro moves its live logo into this slot and keeps animating,
  // so we render an empty placeholder instead of starting a second animation.
  const [bootIntroOwnsLogo, setBootIntroOwnsLogo] = useState(() => getBootIntroState().active);
  const logoSlotRef = useRef<View>(null);
  useEffect(() => {
    if (!bootIntroOwnsLogo) return;
    const sync = () => {
      const intro = getBootIntroState();
      if (!intro.active || intro.attachment === "declined") setBootIntroOwnsLogo(false);
    };
    sync();
    return subscribeBootIntro(sync);
  }, [bootIntroOwnsLogo]);
  useEffect(() => {
    if (!bootIntroOwnsLogo) return;
    setWelcomeFocused(focused);
  }, [bootIntroOwnsLogo, focused]);
  useEffect(() => () => { setWelcomeFocused(false); setWelcomeSlot(null); }, []);
  const measureLogoSlot = () => {
    if (!bootIntroOwnsLogo) return;
    logoSlotRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) setWelcomeSlot({ x, y, width, height });
    });
  };

  const { active, reducedMotion, motionReady } = useVibiRuntime();
  const [illustrationReady, setIllustrationReady] = useState(false);
  const animateSpheres = focused && active && motionReady && !reducedMotion && illustrationReady;
  const maxTravel = Math.min(90, width * 0.2);
  const sunMotion = useWanderingSphere(animateSpheres, reducedMotion, maxTravel);
  const coralMotion = useWanderingSphere(animateSpheres, reducedMotion, maxTravel);
  const blueMotion = useWanderingSphere(animateSpheres, reducedMotion, maxTravel);
  useEffect(() => {
    if (!isLoading && focused && !session?.user?.id) trackSignupEvent("welcome_viewed");
  }, [focused, isLoading, session?.user?.id]);
  useEffect(() => {
    if (!isLoading && focused && session?.user?.id)
      navigation.navigate("Tab" as never);
  }, [focused, isLoading, navigation, session?.user?.id]);

  return (
    <ScreenContainer
      style={styles.screen}
      edges={["top", "bottom", "left", "right"]}
      scroll={largeText}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={[styles.content, largeText && { minHeight: height - insets.top - insets.bottom }]}>
        <View style={styles.brand}>
          {bootIntroOwnsLogo ? (
            <View ref={logoSlotRef} collapsable={false} onLayout={measureLogoSlot} style={styles.smallLogo} />
          ) : (
            <AnimatedBrandLogo loop direction="word-to-logo" style={styles.smallLogo} />
          )}
        </View>
        <View style={styles.hero} pointerEvents="none">
          <Animated.View style={[styles.sun, sunMotion]} />
          <Animated.View style={[styles.sphere, styles.coralSphere, coralMotion]} />
          <Animated.View style={[styles.sphere, styles.blueSphere, blueMotion]} />
          <Image
            source={require("../assets/images/welcome-community.png")}
            onLoadEnd={() => setIllustrationReady(true)}
            style={styles.illustration}
            resizeMode="contain"
            accessible={false}
          />
        </View>
        <View style={styles.copy}>
          <View style={styles.headline}>
            <Text
              style={[styles.title, compact && { fontSize: 23, lineHeight: 29 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              Encontrá tu comunidad.
            </Text>
            <Text
              style={[styles.title, compact && { fontSize: 23, lineHeight: 29 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              Conectá con tu bienestar.
            </Text>
          </View>
          <Text style={[styles.tagline, compact && { fontSize: 14, lineHeight: 20 }]}>
            Compartí clases, experiencias y nuevos hábitos con personas en tu misma sintonía.
          </Text>
        </View>
        <View style={styles.actions}>
          <VibesActionButton
            label="Crear cuenta"
            onPress={() => {
              trackSignupEvent("signup_started");
              navigation.navigate("AgeAssurance" as never);
            }}
            style={styles.primaryButton}
            textStyle={styles.primaryButtonText}
          />
          <VibesActionButton
            label="Iniciar sesión"
            variant="outline"
            onPress={() => navigation.navigate("Login" as never)}
            style={styles.secondaryButton}
          />
        </View>
      </View>
    </ScreenContainer>
  );
};
export default Welcome;
const colors = vibesTheme.colors;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 0, paddingBottom: 12 },
  brand: { alignItems: "center", paddingTop: 8, marginBottom: "auto" },
  smallLogo: { width: 64, height: 64 },
  hero: { width: "100%", aspectRatio: 1.5, flexShrink: 1, minHeight: 0, maxHeight: 300, marginTop: 8, marginBottom: 4, justifyContent: "center", alignItems: "center" },
  sun: { position: "absolute", height: "42%", aspectRatio: 1, borderRadius: vibesTheme.radii.pill, backgroundColor: colors.accentMustard, opacity: 0.24 },
  sphere: { position: "absolute", height: "38%", aspectRatio: 1, borderRadius: vibesTheme.radii.pill, opacity: 0.24 },
  coralSphere: { backgroundColor: colors.accentCoral, right: "12%", top: "10%" },
  blueSphere: { backgroundColor: colors.accentBlue, left: "8%", bottom: "12%" },
  illustration: { width: "100%", height: "100%" },
  copy: { alignItems: "center", gap: 8, marginBottom: 14 },
  headline: { width: "100%", alignItems: "stretch" },
  title: { fontFamily: vibesTheme.fonts.bold, fontSize: 27, lineHeight: 34, color: colors.primaryText, textAlign: "center" },
  tagline: { color: colors.secondaryText, fontFamily: vibesTheme.fonts.regular, fontSize: 16, lineHeight: 23, textAlign: "center", maxWidth: 400 },
  actions: { width: "100%", maxWidth: 480, alignSelf: "center", gap: 12, marginTop: "auto", paddingTop: 16 },
  primaryButton: { backgroundColor: colors.primaryText, shadowOpacity: 0, elevation: 0 },
  primaryButtonText: { color: colors.surface },
  secondaryButton: { minHeight: 58 },
});
