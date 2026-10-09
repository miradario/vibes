import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, View } from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useAuthSession } from "../src/auth/auth.queries";
import { Text } from "../components/Typography";
import Vibi from "../components/Vibi";
import VibesActionButton from "../components/VibesActionButton";
import ScreenContainer from "../components/ScreenContainer";
import { vibesTheme } from "../src/theme/vibesTheme";
import { useVibiRuntime } from "../src/vibi/useMotionPreference";
import {
  welcomeIntroFrame,
  welcomeLayout,
  WELCOME_INTRO_DURATION,
} from "../src/vibi/welcomeIntro";

// Process lifetime: returning from authentication (even after unmount) skips it.
let welcomeIntroShown = false;
const Welcome = () => {
  const navigation = useNavigation();
  const { data: session, isLoading } = useAuthSession();
  const focused = useIsFocused();
  const { active, reducedMotion, motionReady } = useVibiRuntime();
  const [modelReady, setModelReady] = useState(false);
  const [renderUnavailable, setRenderUnavailable] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [intro] = useState({ replayKey: 0, skip: welcomeIntroShown });
  const [buttonsEnabled, setButtonsEnabled] = useState(welcomeIntroShown);
  const titleOpacity = useRef(
    new Animated.Value(welcomeIntroShown ? 1 : 0)
  ).current;
  const buttonsOpacity = useRef(
    new Animated.Value(welcomeIntroShown ? 1 : 0)
  ).current;
  const buttonsTranslateY = useRef(
    new Animated.Value(welcomeIntroShown ? 0 : 12)
  ).current;
  const progress = useCallback(
    (seconds: number) => {
      const frame = welcomeIntroFrame(seconds);
      titleOpacity.setValue(frame.titleOpacity);
      buttonsOpacity.setValue(frame.buttonsOpacity);
      buttonsTranslateY.setValue(frame.buttonsTranslateY);
      if (frame.complete) setButtonsEnabled(true);
    },
    [titleOpacity, buttonsOpacity, buttonsTranslateY]
  );
  const ready = useCallback(() => {
    welcomeIntroShown = true;
    setModelReady(true);
  }, []);
  const failed = useCallback(() => {
    welcomeIntroShown = true;
    setRenderUnavailable(true);
    setModelReady(true);
    progress(WELCOME_INTRO_DURATION);
  }, [progress]);
  // Authentication must remain reachable even if model loading, GL setup or
  // the intro frame scheduler stalls without reporting an error.
  useEffect(() => {
    if (!focused || !active || buttonsEnabled) return;
    const timeout = setTimeout(() => {
      console.warn("[Welcome] intro timed out; showing static welcome");
      failed();
    }, 8000);
    return () => clearTimeout(timeout);
  }, [focused, active, buttonsEnabled, failed]);
  useEffect(() => {
    if (!isLoading && focused && session?.user?.id)
      navigation.navigate("Tab" as never);
  }, [focused, isLoading, navigation, session?.user?.id]);

  return (
    <ScreenContainer
      style={[styles.screen, !modelReady && styles.loading]}
      edges={["top", "bottom", "left", "right"]}
    >
      <View
        style={[styles.content, !modelReady && styles.loading]}
        onLayout={({ nativeEvent: { layout } }) =>
          setViewport({ width: layout.width, height: layout.height })
        }
      >
        <View
          collapsable={false}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        >
          {renderUnavailable ? (
            <View style={styles.fallbackLogoWrap}>
              <Image
                source={require("../assets/adaptive-icon.png")}
                style={styles.fallbackLogo}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </View>
          ) : motionReady && viewport.width > 0 && viewport.height > 0 && (
            <Vibi
              width={viewport.width}
              height={viewport.height}
              reducedMotion={reducedMotion}
              paused={!focused || !active}
              onReady={ready}
              onError={failed}
              welcomeIntro={{ ...intro, onProgress: progress }}
            />
          )}
        </View>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.titleWrap,
            {
              top: welcomeLayout(viewport.height).titleTop,
              opacity: titleOpacity,
            },
          ]}
        >
          <Text style={styles.title}>Vibes</Text>
        </Animated.View>
        <Animated.View
          pointerEvents={buttonsEnabled ? "auto" : "none"}
          accessibilityElementsHidden={!buttonsEnabled}
          importantForAccessibility={
            buttonsEnabled ? "auto" : "no-hide-descendants"
          }
          style={[
            styles.actions,
            {
              opacity: buttonsOpacity,
              transform: [{ translateY: buttonsTranslateY }],
            },
          ]}
        >
          <VibesActionButton
            label="Crear cuenta"
            disabled={!buttonsEnabled}
            onPress={() => navigation.navigate("AgeAssurance" as never)}
            style={styles.primaryButton}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!buttonsEnabled}
            onPress={() => navigation.navigate("Login" as never)}
            style={({ pressed }) => [
              styles.button,
              styles.secondary,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.buttonText, styles.secondaryText]}>
              Iniciar sesión
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </ScreenContainer>
  );
};
export default Welcome;
const colors = vibesTheme.colors;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  loading: { backgroundColor: colors.accentMustard },
  content: { flex: 1, backgroundColor: colors.background },
  fallbackLogoWrap: {
    height: "50%",
    justifyContent: "center",
    alignItems: "center",
  },
  fallbackLogo: { width: "65%", height: "85%" },
  titleWrap: { position: "absolute", width: "100%", alignItems: "center" },
  title: {
    fontFamily: vibesTheme.fonts.thin,
    fontSize: 44,
    lineHeight: 54,
    color: colors.primaryText,
  },
  actions: {
    position: "absolute",
    bottom: 36,
    left: 24,
    right: 24,
    gap: 12,
    alignItems: "center",
  },
  button: {
    width: "100%",
    maxWidth: 480,
    height: 58,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  primaryButton: { maxWidth: 480, shadowOpacity: 0, elevation: 0 },
  secondary: {
    backgroundColor: colors.background,
    borderColor: colors.accentBlue,
  },
  buttonText: {
    fontFamily: vibesTheme.fonts.medium,
    fontSize: 19,
    color: colors.primaryText,
  },
  secondaryText: { color: colors.accentBlue },
  pressed: { opacity: 0.8 },
});
