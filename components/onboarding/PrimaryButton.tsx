import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { onboardingStyles } from "../../src/screens/Onboarding/vibesOnboardingStyles";
import VibesLoader from "../VibesLoader";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

const PrimaryButton = ({
  label,
  onPress,
  disabled = false,
  loading = false,
}: PrimaryButtonProps) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        onboardingStyles.primaryButton,
        isDisabled && onboardingStyles.primaryButtonDisabled,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.88}
    >
      {loading ? (
        <VibesLoader size={34} />
      ) : (
        <Text style={onboardingStyles.primaryButtonText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

export default PrimaryButton;
