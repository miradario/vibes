/** @format */

import React from "react";
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle, TextStyle } from "react-native";
import { Text } from "./Typography";
import { vibesTheme } from "../src/theme/vibesTheme";
import * as ds from "../src/theme/tokens";

type VibesActionButtonProps = {
  label: string;
  onPress: () => void;
  /** "outline": secondary action with a blue outline (e.g. Vibi guide alternatives). */
  variant?: "start" | "skip" | "outline";
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  showDivider?: boolean;
};

const VibesActionButton = ({
  label,
  onPress,
  variant = "start",
  style,
  textStyle,
  disabled = false,
  showDivider = true,
}: VibesActionButtonProps) => {
  const isStart = variant === "start";

  if (variant === "outline") {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        style={[styles.outlineButton, style, disabled && styles.outlineDisabled]}
        onPress={onPress}
        activeOpacity={0.85}
        disabled={disabled}
      >
        <Text style={[styles.outlineText, textStyle]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  if (!isStart) {
    return (
      <View style={[styles.skipWrap, style]}>
        {showDivider ? <View style={styles.skipDivider} /> : null}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.skipButton, disabled && styles.skipButtonDisabled]}
          onPress={onPress}
          activeOpacity={0.8}
          disabled={disabled}
        >
          <Text style={[styles.skipText, disabled && styles.skipTextDisabled]}>
            {label}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[styles.startButton, style, disabled && styles.startButtonDisabled]}
      onPress={onPress}
      activeOpacity={0.9}
      disabled={disabled}
    >
      <Text style={[styles.startText, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  startButton: {
    width: "100%",
    height: 58,
    borderRadius: vibesTheme.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.accentMustard,
    shadowColor: vibesTheme.colors.accentMustard,
    shadowOpacity: /* ds-lint-allow DS-TODO: sombra de color (vibesTheme.colors.accentMustard): ¿glow de marca o ds.shadows? */ 0.22,
    shadowOffset: /* ds-lint-allow DS-TODO: misma sombra de color */ { width: 0, height: 6 },
    shadowRadius: /* ds-lint-allow DS-TODO: misma sombra de color */ 14,
    elevation: /* ds-lint-allow DS-TODO: misma sombra de color */ 3,
  },
  startButtonDisabled: {
    opacity: 0.42,
    ...ds.shadows.none,
  },
  startText: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.subtitle,
  },
  outlineButton: {
    width: "100%",
    minHeight: 52,
    borderRadius: vibesTheme.radii.pill,
    borderWidth: 1.5,
    borderColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.strong),
    backgroundColor: vibesTheme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: vibesTheme.spacing[4],
    paddingVertical: ds.spacing[3],
  },
  outlineDisabled: {
    opacity: 0.42,
  },
  outlineText: {
    color: vibesTheme.colors.accentBlue,
    ...ds.textStyles.subtitle,
    textAlign: "center",
  },
  skipWrap: {
    width: "100%",
    marginTop: vibesTheme.spacing[2],
    alignItems: "center",
  },
  skipDivider: {
    width: "100%",
    height: 1,
    backgroundColor: ds.colors.border.default,
    marginBottom: ds.spacing[4],
  },
  skipButton: {
    paddingVertical: ds.spacing[2],
    paddingHorizontal: ds.spacing[3],
  },
  skipText: {
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.subtitle,
  },
  skipButtonDisabled: {
    opacity: 0.7,
  },
  skipTextDisabled: {
    color: /* ds-lint-allow DS-TODO: inkSoft al 78%: no hay opacidad cercana (más cercana 1) */ "rgba(110, 110, 110, 0.78)",
  },
});

export default VibesActionButton;
