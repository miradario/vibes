import React from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "../Typography";
import * as ds from "../../src/theme/tokens";

type OverlayBadgeProps = {
  label?: string;
  icon?: React.ReactNode;
  tone?: "dark" | "light";
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Posición absoluta sobre la imagen (offset `spacing/3`). */
  position?: "bottom-right" | "bottom-left" | "top-left" | "top-right" | "none";
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

const OFFSET = ds.spacing[3];
const positions = {
  "bottom-right": { position: "absolute", right: OFFSET, bottom: OFFSET },
  "bottom-left": { position: "absolute", left: OFFSET, bottom: OFFSET },
  "top-left": { position: "absolute", left: OFFSET, top: OFFSET },
  "top-right": { position: "absolute", right: OFFSET, top: OFFSET },
  none: {},
} as const;

/**
 * OverlayBadge (components-spec §1.4): pastilla sobre una imagen o un mapa. Alto mínimo 32
 * (hitSlop a 44 si se toca), padding `spacing/3`×`spacing/2`, gap `spacing/2`, pill.
 * `dark`: ink 80% + `text/on-dark`. `light`: `bg/surfaceTranslucent` + `text/primary` + `shadows.sm`.
 */
export default function OverlayBadge({ label, icon, tone = "dark", onPress, accessibilityLabel, position = "none", style, children }: OverlayBadgeProps) {
  const content = (
    <>
      {icon}
      {label ? <Text style={[styles.label, tone === "dark" ? styles.labelDark : styles.labelLight]} numberOfLines={1}>{label}</Text> : null}
      {children}
    </>
  );
  const boxStyle = [styles.badge, tone === "dark" ? styles.dark : styles.light, positions[position] as ViewStyle, style];
  if (onPress) {
    const hit = (ds.touchTarget - ds.componentSize.overlayBadge) / 2;
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} onPress={onPress} hitSlop={{ top: hit, bottom: hit }} style={({ pressed }) => [boxStyle, pressed && { opacity: ds.opacity.pressed }]}>
        {content}
      </Pressable>
    );
  }
  return <View style={boxStyle} accessibilityLabel={accessibilityLabel}>{content}</View>;
}

/** Color de texto e íconos según el tono, para íconos externos. */
export const overlayBadgeContentColor = (tone: "dark" | "light" = "dark") => (tone === "dark" ? ds.colors.text.onDark : ds.colors.text.primary);

const styles = StyleSheet.create({
  badge: { minHeight: ds.componentSize.overlayBadge, flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: ds.spacing[2], paddingHorizontal: ds.spacing[3], paddingVertical: ds.spacing[2], borderRadius: ds.radii.pill },
  dark: { backgroundColor: ds.withAlpha(ds.colors.base.ink, ds.opacity.higher) },
  light: { backgroundColor: ds.colors.bg.surfaceTranslucent, ...ds.shadows.sm },
  label: { ...ds.textStyles.label },
  labelDark: { color: ds.colors.text.onDark },
  labelLight: { color: ds.colors.text.primary },
});
