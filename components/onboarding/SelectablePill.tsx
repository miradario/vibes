import { vibesTheme } from "../../src/theme/vibesTheme";
import React from "react";
import { StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from "react-native";
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
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

const SelectablePill = ({
  label,
  selected,
  onPress,
  isAddOption = false,
  compact = false,
  style,
}: SelectablePillProps) => (
  <TouchableOpacity
    accessibilityRole="checkbox"
    accessibilityState={{ checked: selected }}
    accessibilityLabel={label}
    style={[
      onboardingStyles.pill,
      isAddOption && onboardingStyles.pillAdd,
      selected && onboardingStyles.pillActive,
      compact && compactStyles.pill,
      style,
    ]}
    onPress={onPress}
    activeOpacity={0.86}
  >
    <Text style={[onboardingStyles.pillText, compact && compactStyles.label]} numberOfLines={compact ? 1 : undefined} adjustsFontSizeToFit={compact} minimumFontScale={0.8}>{label}</Text>
    <Icon
      name={
        isAddOption ? "add" : selected ? "checkmark-circle" : "ellipse-outline"
      }
      size={compact ? 14 : isAddOption ? 20 : 16}
      color={
        selected || isAddOption
          ? ONBOARDING_COLORS.mustard
          : "rgba(43, 43, 43, 0.22)"
      }
      style={[onboardingStyles.pillIcon, compact && {marginLeft:4}]}
    />
  </TouchableOpacity>
);

const compactStyles = StyleSheet.create({
  pill: {flex:1,minWidth:0,minHeight:44,paddingHorizontal:6,borderRadius:14},
  label: {flexShrink:1,fontSize:13,lineHeight:18,color:vibesTheme.colors.primaryText},
});
export default SelectablePill;
