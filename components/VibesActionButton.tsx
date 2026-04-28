/** @format */

import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { vibesTheme } from "../src/theme/vibesTheme";

type VibesActionButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "start" | "skip";
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

const VibesActionButton = ({
  label,
  onPress,
  variant = "start",
  style,
  disabled = false,
}: VibesActionButtonProps) => {
  const isStart = variant === "start";

  if (!isStart) {
    return (
      <View style={[styles.skipWrap, style]}>
        <View style={styles.skipDivider} />
        <TouchableOpacity
          style={[styles.skipButton, disabled && styles.disabled]}
          onPress={onPress}
          activeOpacity={0.8}
          disabled={disabled}
        >
          <Text style={styles.skipText}>{label}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.startButton, style, disabled && styles.disabled]}
      onPress={onPress}
      activeOpacity={0.9}
      disabled={disabled}
    >
      <View pointerEvents="none" style={styles.startGradientWrap}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="VibesActionGradient" x1="0" y1="0.5" x2="1" y2="0.5">
              <Stop offset="0" stopColor="#FFE2C8" />
              <Stop offset="0.5" stopColor="#C1D5FF" />
              <Stop offset="1" stopColor="#7680BE" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" rx="50" ry="50" fill="url(#VibesActionGradient)" />
        </Svg>
      </View>
      <Text style={styles.startText}>{label}</Text>
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
    overflow: "hidden",
    backgroundColor: "#8B97CF",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.62)",
    shadowColor: "#8B97CF",
    shadowOpacity: 0.32,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
    elevation: 3,
  },
  startGradientWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  startText: {
    color: vibesTheme.colors.primaryText,
    fontSize: 19,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  skipWrap: {
    width: "100%",
    marginTop: vibesTheme.spacing.sm,
    alignItems: "center",
  },
  skipDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(36, 61, 142, 0.14)",
    marginBottom: 14,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    color: vibesTheme.colors.secondaryText,
    fontSize: 18,
    fontFamily: "CormorantGaramond_500Medium",
  },
  disabled: {
    opacity: 0.55,
  },
});

export default VibesActionButton;
