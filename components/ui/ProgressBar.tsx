import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import * as ds from "../../src/theme/tokens";

type ProgressBarProps = {
  /** Progreso de 0 a 1. */
  value: number;
  size?: "sm" | "md";
  tone?: "accent" | "info";
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * ProgressBar (components-spec §1.1): pista `border/default` pill; relleno pill en
 * `action/accent` (mostaza) o azul (`info`). Alto sm 4 (onboarding, perfil) o md 8 (tarjetas).
 */
export default function ProgressBar({ value, size = "md", tone = "accent", accessibilityLabel, style }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const height = ds.componentSize.progressBar[size];
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={[styles.track, { height }, style]}
    >
      <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: tone === "info" ? ds.colors.action.secondaryBlueText : ds.colors.action.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: "100%", borderRadius: ds.radii.pill, backgroundColor: ds.colors.border.default, overflow: "hidden" },
  fill: { height: "100%", borderRadius: ds.radii.pill },
});
