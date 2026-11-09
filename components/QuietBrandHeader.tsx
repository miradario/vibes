import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "./Typography";
import { vibesTheme } from "../src/theme/vibesTheme";
import AnimatedBrandLogo from "./AnimatedBrandLogo";
import * as ds from "../src/theme/tokens";

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
  compactHeader: { paddingTop: ds.spacing[1], paddingBottom: ds.spacing[4], gap: ds.spacing[2] },
  compactLogo: { width: 64, height: 72 },
  compactTitle: { marginTop: 0, ...ds.textStyles.title },
  compactSubtitle: { ...ds.textStyles.body },
  header: { alignItems: "center", paddingTop: ds.spacing[2], paddingBottom: ds.spacing[8], gap: ds.spacing[3] },
  logo: { width: 116, height: 132 },
  title: { color: vibesTheme.colors.primaryText, ...ds.textStyles.title, textAlign: "center", marginTop: ds.spacing[2] },
  subtitle: { color: vibesTheme.colors.secondaryText, ...ds.textStyles.body, textAlign: "center", maxWidth: 320 },
});
