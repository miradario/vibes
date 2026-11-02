/** @format */

import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "./Typography";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Gradient from "./Gradient";
import { vibesTheme } from "../src/theme/vibesTheme";
import * as ds from "../src/theme/tokens";

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
    paddingHorizontal: ds.spacing[8],
    paddingTop: /* ds-lint-allow layout: paddingTop 220 (medida de layout fuera de la escala) */ 220,
  },
  brandTitle: {
    ...ds.textStyles.display,
    color: vibesTheme.colors.primaryText,
  },
  title: {
    marginTop: ds.spacing[3],
    ...ds.textStyles.title,
    color: vibesTheme.colors.primaryText,
    textAlign: "center",
  },
  subtitle: {
    marginTop: ds.spacing[4],
    ...ds.textStyles.subtitleMedium,
    color: vibesTheme.colors.secondaryText,
    textAlign: "center",
  },
  cta: {
    marginTop: ds.spacing[8],
    minWidth: 220,
    borderRadius: ds.radii.xl,
    paddingVertical: ds.spacing[4],
    paddingHorizontal: ds.spacing[8],
    alignItems: "center",
    backgroundColor: vibesTheme.colors.accentMustard,
    borderWidth: 1,
    borderColor: ds.colors.base.mustard,
  },
  ctaText: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.subtitle,
  },
});

export default SessionScreen;
