import Icon from "../Icon";
import { vibesTheme } from "../../src/theme/vibesTheme";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Text } from "../Typography";
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
        <VibesLoader />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }}><Text style={onboardingStyles.primaryButtonText}>{label}</Text><Icon name="arrow-forward" size={22} color={vibesTheme.colors.surface} /></View>
      )}
    </TouchableOpacity>
  );
};

export default PrimaryButton;
