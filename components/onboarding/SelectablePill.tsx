import { vibesTheme } from "../../src/theme/vibesTheme";
import React from "react";
import { StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "../Typography";
import Icon from "../Icon";
import {
  ONBOARDING_COLORS,
  onboardingStyles,
} from "../../src/screens/Onboarding/vibesOnboardingStyles";
import * as ds from "../../src/theme/tokens";

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
      size={compact ? ds.iconSize.sm : isAddOption ? ds.iconSize.md : ds.iconSize.sm}
      color={
        selected || isAddOption
          ? ONBOARDING_COLORS.mustard
          : ds.withAlpha(ds.colors.base.ink, ds.opacity.medium)
      }
      style={[onboardingStyles.pillIcon, compact && {marginLeft:ds.spacing[1]}]}
    />
  </TouchableOpacity>
);

const compactStyles = StyleSheet.create({
  pill: {flex:1,minWidth:0,minHeight:44,paddingHorizontal:ds.spacing[2],borderRadius:ds.radii.lg},
  label: {flexShrink:1,...ds.textStyles.bodySmall,color:vibesTheme.colors.primaryText},
});
export default SelectablePill;
