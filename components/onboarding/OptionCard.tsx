import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Icon from "../Icon";
import type { OnboardingOption } from "../../src/screens/Onboarding/vibesOnboardingContent";
import {
  ONBOARDING_COLORS,
  onboardingStyles,
  toneColor,
} from "../../src/screens/Onboarding/vibesOnboardingStyles";

type OptionCardProps = {
  option: OnboardingOption;
  selected: boolean;
  onPress: () => void;
};

const OptionCard = ({ option, selected, onPress }: OptionCardProps) => (
  <TouchableOpacity
    style={[
      onboardingStyles.optionCard,
      selected && onboardingStyles.optionCardActive,
    ]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <View
      style={[
        onboardingStyles.optionIcon,
        { backgroundColor: `${toneColor(option.tone)}33` },
      ]}
    >
      <Icon
        name={option.icon as never}
        size={20}
        color={selected ? ONBOARDING_COLORS.mustard : ONBOARDING_COLORS.text}
      />
    </View>
    <Text style={onboardingStyles.optionText}>{option.label}</Text>
    {selected ? (
      <Icon name="checkmark-circle" size={20} color={ONBOARDING_COLORS.mustard} />
    ) : null}
  </TouchableOpacity>
);

export default OptionCard;
