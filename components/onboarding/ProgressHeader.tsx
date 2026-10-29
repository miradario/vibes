import { vibesTheme } from "../../src/theme/vibesTheme";
import BackButton from "../BackButton";
import CancelOnboardingButton from "../CancelOnboardingButton";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Icon from "../Icon";
import {
  ONBOARDING_COLORS,
  isCompactOnboardingScreen,
} from "../../src/screens/Onboarding/vibesOnboardingStyles";

type ProgressHeaderProps = {
  progress: number;
  intro?: boolean;
  onBack: () => void;
  showBack?: boolean;
  hideBackIcon?: boolean;
  cancelDisabled?: boolean;
  onCancel?: () => void;
};

const ProgressHeader = ({
  progress,
  intro = false,
  onBack,
  showBack = true,
  hideBackIcon = false,
  cancelDisabled = false,
  onCancel,
}: ProgressHeaderProps) => (
  <View style={styles.wrap}>
    {showBack && !hideBackIcon ? (
      <BackButton onPress={onBack}
        activeOpacity={0.8}
        style={styles.backButton}
        accessibilityRole="button" />
    ) : (
      intro ? null : <View style={styles.backSpacer} />
    )}
    <View style={styles.track}>
      <View
        style={[
          styles.fill,
          intro && { backgroundColor: vibesTheme.colors.accentBlue },
          { width: `${Math.max(0, Math.min(progress, 1)) * 100}%` },
        ]}
      />
    </View>
    <CancelOnboardingButton disabled={cancelDisabled} onCancel={onCancel} />
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    minHeight: 44,
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
  backSpacer: {
    width: 34,
    height: 34,
    marginRight: isCompactOnboardingScreen ? 8 : 14,
  },
  endSpacer: { width: 34, marginLeft: isCompactOnboardingScreen ? 8 : 14 },
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
