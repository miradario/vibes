import React from "react";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { onboardingStyles } from "../../src/screens/Onboarding/vibesOnboardingStyles";

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
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={onboardingStyles.primaryButtonText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

export default PrimaryButton;
