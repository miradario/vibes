import React from "react";
import { TouchableOpacity } from "react-native";
import { Text } from "../Typography";
import Icon from "../Icon";
import {
  ONBOARDING_COLORS,
  onboardingStyles,
} from "../../src/screens/Onboarding/vibesOnboardingStyles";

type SelectablePillProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  isAddOption?: boolean;
};

const SelectablePill = ({
  label,
  selected,
  onPress,
  isAddOption = false,
}: SelectablePillProps) => (
  <TouchableOpacity
    accessibilityRole="checkbox"
    accessibilityState={{ checked: selected }}
    accessibilityLabel={label}
    style={[
      onboardingStyles.pill,
      isAddOption && onboardingStyles.pillAdd,
      selected && onboardingStyles.pillActive,
    ]}
    onPress={onPress}
    activeOpacity={0.86}
  >
    <Text style={onboardingStyles.pillText}>{label}</Text>
    <Icon
      name={
        isAddOption ? "add" : selected ? "checkmark-circle" : "ellipse-outline"
      }
      size={isAddOption ? 20 : 16}
      color={
        selected || isAddOption
          ? ONBOARDING_COLORS.mustard
          : "rgba(43, 43, 43, 0.22)"
      }
      style={onboardingStyles.pillIcon}
    />
  </TouchableOpacity>
);

export default SelectablePill;
