import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import * as ds from "../../src/theme/tokens";

type IconCircleProps = {
  size?: "sm" | "md" | "lg";
  tone?: "neutral" | "accent" | "info";
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Tamaño de ícono recomendado para cada IconCircle (16 / 24 / 32). */
export const iconCircleIconSize = { sm: ds.iconSize.sm, md: ds.iconSize.lg, lg: ds.iconSize.xl } as const;

/**
 * IconCircle (components-spec §3): círculo decorativo con ícono. sm 32, md 48, lg 64.
 * Fondo `bg/subtle` (neutral), `bg/selected` (accent) o `feedback/infoBg` (info).
 */
export default function IconCircle({ size = "sm", tone = "neutral", children, style }: IconCircleProps) {
  const dim = ds.componentSize.iconCircle[size];
  const bg = tone === "accent" ? ds.colors.bg.selected : tone === "info" ? ds.colors.feedback.infoBg : ds.colors.bg.subtle;
  return <View style={[styles.circle, { width: dim, height: dim, backgroundColor: bg }, style]}>{children}</View>;
}

const styles = StyleSheet.create({ circle: { borderRadius: ds.radii.pill, alignItems: "center", justifyContent: "center" } });
