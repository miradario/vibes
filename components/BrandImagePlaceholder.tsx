import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { VIBES_LOGO } from "../src/constants/brandAssets";
import { vibesTheme } from "../src/theme/vibesTheme";

export default function BrandImagePlaceholder() {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: vibesTheme.colors.background }]}>
      <Image source={VIBES_LOGO} resizeMode="contain" style={styles.logo} accessibilityLabel="Logo de Vibes" />
    </View>
  );
}

const styles = StyleSheet.create({
  // Override the bundled asset's intrinsic dimensions, including on iOS.
  logo: { width: "100%", height: "100%" },
});
