import React from "react";
import { vibesTheme } from "../../src/theme/vibesTheme";
import { StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Text } from "../Typography";
import Icon from "../Icon";
import type { OnboardingOption } from "../../src/screens/Onboarding/vibesOnboardingContent";
import {
  ONBOARDING_COLORS,
  onboardingStyles,
  toneColor,
} from "../../src/screens/Onboarding/vibesOnboardingStyles";
import * as ds from "../../src/theme/tokens";

type OptionCardProps = {
  option: OnboardingOption;
  selected: boolean;
  onPress: () => void;
  tile?: boolean;
};

const OptionCard = ({ option, selected, onPress, tile = false }: OptionCardProps) => {
  const { fontScale } = useWindowDimensions();
  return (
  <TouchableOpacity
    style={[
      onboardingStyles.optionCard,
      tile && tileStyles.card,
      tile && fontScale <= 1.2 && {aspectRatio:1},
      selected && onboardingStyles.optionCardActive,
    ]}
    accessibilityRole="button"
    accessibilityLabel={option.label}
    accessibilityState={{selected}}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <View
      style={[
        onboardingStyles.optionIcon,
        tile && tileStyles.icon,
        { backgroundColor: ds.withAlpha(toneColor(option.tone), ds.opacity.medium) },
      ]}
    >
      <Icon
        name={option.icon as never}
        size={tile ? ds.iconSize.lg : ds.iconSize.md}
        color={ONBOARDING_COLORS.text}
      />
    </View>
    <Text style={[onboardingStyles.optionText, tile && tileStyles.label]}>{option.label}</Text>
    {selected ? (
      <View style={tile ? tileStyles.check : undefined}><Icon name="checkmark-circle" size={ds.iconSize.md} color={vibesTheme.colors.accentBlue} /></View>
    ) : null}
  </TouchableOpacity>
);
};

const tileStyles = StyleSheet.create({
  card: {width:"48%", minHeight:124, borderRadius:ds.radii.xl, padding:ds.spacing[3], flexDirection:"column", justifyContent:"center", gap:ds.spacing[2]},
  icon: {width:38,height:38,borderRadius:ds.radii.pill,marginRight:0},
  label: {flex:0,textAlign:"center",...ds.textStyles.subtitle,},
  check: {position:"absolute",top:10,right:10},
});

export default OptionCard;
