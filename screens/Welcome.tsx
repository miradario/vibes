import React, { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useAuthSession } from "../src/auth/auth.queries";
import { Text } from "../components/Typography";
import AnimatedBrandLogo from "../components/AnimatedBrandLogo";
import VibesActionButton from "../components/VibesActionButton";
import ScreenContainer from "../components/ScreenContainer";
import { vibesTheme } from "../src/theme/vibesTheme";

const Welcome = () => {
  const navigation = useNavigation();
  const { data: session, isLoading } = useAuthSession();
  const focused = useIsFocused();
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
      >
        <View
          collapsable={false}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        >
          <View style={styles.fallbackLogoWrap}>
            <AnimatedBrandLogo direction="logo-to-word" loop style={styles.fallbackLogo} />
          </View>
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
    flex: 1,
    marginBottom: 220,
    justifyContent: "center",
    alignItems: "center",
  },
  fallbackLogo: { width: "90%", height: "100%" },
  titleWrap: { position: "absolute", width: "100%", alignItems: "center" },
  title: {
    fontFamily: vibesTheme.fonts.thin,
    fontSize: 44,
    lineHeight: 54,
    color: colors.primaryText,
  },
  tagline: { color: colors.secondaryText, fontSize: 18, lineHeight: 26, marginTop: 12, textAlign: "center", paddingHorizontal: 24 },
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
