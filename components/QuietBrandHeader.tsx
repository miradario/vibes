import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "./Typography";
import { vibesTheme } from "../src/theme/vibesTheme";
import AnimatedBrandLogo from "./AnimatedBrandLogo";

export default function QuietBrandHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <AnimatedBrandLogo style={styles.logo} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  header: { alignItems: "center", paddingTop: 8, paddingBottom: 28, gap: 12 },
  logo: { width: 116, height: 132 },
  title: { color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.medium, fontSize: 24, lineHeight: 30, textAlign: "center", marginTop: 8 },
  subtitle: { color: vibesTheme.colors.secondaryText, fontSize: 17, lineHeight: 24, textAlign: "center", maxWidth: 320 },
});
