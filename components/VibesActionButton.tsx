import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
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
    backgroundColor: vibesTheme.colors.accentMustard,
    shadowColor: "#C89E61",
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 3,
  },
  startText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  skipWrap: {
    width: "100%",
    alignItems: "center",
  },
  skipDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(0,0,0,0.12)",
    marginBottom: 14,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    color: vibesTheme.colors.secondaryText,
    fontSize: 18,
    fontWeight: "500",
  },
  disabled: {
    opacity: 0.55,
  },
});

export default VibesActionButton;
