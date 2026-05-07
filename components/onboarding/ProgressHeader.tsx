import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Icon from "../Icon";
import {
  ONBOARDING_COLORS,
  isCompactOnboardingScreen,
} from "../../src/screens/Onboarding/vibesOnboardingStyles";

type ProgressHeaderProps = {
  progress: number;
  onBack: () => void;
};

const ProgressHeader = ({ progress, onBack }: ProgressHeaderProps) => (
  <View style={styles.wrap}>
    <TouchableOpacity
      onPress={onBack}
      activeOpacity={0.8}
      style={styles.backButton}
      accessibilityRole="button"
    >
      <Icon name="chevron-back" size={22} color={ONBOARDING_COLORS.text} />
    </TouchableOpacity>
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.max(0, Math.min(progress, 1)) * 100}%` }]} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    height: 38,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: isCompactOnboardingScreen ? 8 : 14,
  },
  track: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(43, 43, 43, 0.08)",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: ONBOARDING_COLORS.mustard,
  },
});

export default ProgressHeader;
