/** @format */

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Gradient from "./Gradient";
import { vibesTheme } from "../src/theme/vibesTheme";

type SessionScreenProps = {
  title?: string;
};

const SessionScreen = ({ title = "Sesión" }: SessionScreenProps) => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={localStyles.screen}>
      <Gradient
        position="top"
        isSpeaking={false}
        sizeMultiplier={0.5}
        colors={{
          halo: vibesTheme.colors.accentBlue,
          core: vibesTheme.colors.accentMustard,
          ember: vibesTheme.colors.background,
        }}
      />

      <View style={localStyles.content}>
        <Text style={localStyles.brandTitle} maxFontSizeMultiplier={1}>
          guruVibe
        </Text>
        <Text style={localStyles.title} maxFontSizeMultiplier={1}>
          {title}
        </Text>
        <Text style={localStyles.subtitle}>
          Esta experiencia de voz no está disponible por el momento.
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={localStyles.cta}
        >
          <Text style={localStyles.ctaText}>Volver</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: vibesTheme.colors.background,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingTop: 220,
  },
  brandTitle: {
    fontSize: 48,
    lineHeight: 52,
    color: vibesTheme.colors.primaryText,
    fontFamily: vibesTheme.fonts.thin,
  },
  title: {
    marginTop: 10,
    fontSize: 26,
    lineHeight: 30,
    color: vibesTheme.colors.primaryText,
    fontFamily: vibesTheme.fonts.thin,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 14,
    fontSize: 16,
    lineHeight: 22,
    color: vibesTheme.colors.secondaryText,
    textAlign: "center",
    fontFamily: vibesTheme.fonts.subtitle,
  },
  cta: {
    marginTop: 36,
    minWidth: 220,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 28,
    alignItems: "center",
    backgroundColor: vibesTheme.colors.accentMustard,
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.9)",
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.medium,
  },
});

export default SessionScreen;
