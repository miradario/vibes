import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "./Typography";
import { vibesTheme } from "../src/theme/vibesTheme";
import AnimatedBrandLogo from "./AnimatedBrandLogo";

export default function QuietBrandHeader({ title, subtitle, compact = false }: { title: string; subtitle?: string; compact?: boolean }) {
  return (
    <View style={[styles.header, compact && styles.compactHeader]}>
      <AnimatedBrandLogo style={[styles.logo, compact && styles.compactLogo]} />
      <Text style={[styles.title, compact && styles.compactTitle]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, compact && styles.compactSubtitle]}>{subtitle}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  compactHeader: { paddingTop: 4, paddingBottom: 14, gap: 8 },
  compactLogo: { width: 64, height: 72 },
  compactTitle: { marginTop: 0, fontSize: 22, lineHeight: 28 },
  compactSubtitle: { fontSize: 15, lineHeight: 20 },
  header: { alignItems: "center", paddingTop: 8, paddingBottom: 28, gap: 12 },
  logo: { width: 116, height: 132 },
  title: { color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.medium, fontSize: 24, lineHeight: 30, textAlign: "center", marginTop: 8 },
  subtitle: { color: vibesTheme.colors.secondaryText, fontSize: 17, lineHeight: 24, textAlign: "center", maxWidth: 320 },
});
