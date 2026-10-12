import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useAuthSession } from "../src/auth/auth.queries";
import { Text } from "../components/Typography";
import VibesActionButton from "../components/VibesActionButton";
import ScreenContainer from "../components/ScreenContainer";
import { vibesTheme } from "../src/theme/vibesTheme";
import { welcomeLayout } from "../src/vibi/welcomeIntro";

const Welcome = () => {
  const navigation = useNavigation();
  const { data: session, isLoading } = useAuthSession();
  const focused = useIsFocused();
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!isLoading && focused && session?.user?.id)
      navigation.navigate("Tab" as never);
  }, [focused, isLoading, navigation, session?.user?.id]);

  return (
    <ScreenContainer
      style={styles.screen}
      edges={["top", "bottom", "left", "right"]}
    >
      <View
        style={styles.content}
        onLayout={({ nativeEvent: { layout } }) =>
          setViewport({ width: layout.width, height: layout.height })
        }
      >
        <View
          collapsable={false}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        >
          <View style={styles.fallbackLogoWrap}>
            <Image
              source={require("../assets/adaptive-icon-flat.png")}
              style={styles.fallbackLogo}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </View>
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.titleWrap,
            {
              top: welcomeLayout(viewport.height).titleTop,
            },
          ]}
        >
          <Text style={styles.title}>Vibes</Text>
        </View>
        <View style={styles.actions}>
          <VibesActionButton
            label="Crear cuenta"
            onPress={() => navigation.navigate("AgeAssurance" as never)}
            style={styles.primaryButton}
          />
          <Pressable
            accessibilityRole="button"
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
        </View>
      </View>
    </ScreenContainer>
  );
};
export default Welcome;
const colors = vibesTheme.colors;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
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
