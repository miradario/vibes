import React from "react";
import { StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "../Typography";
import Icon from "../Icon";
import {
  onboardingStyles,
} from "../../src/screens/Onboarding/vibesOnboardingStyles";
import { chipHitSlop, chipIcon, chipStyles } from "../ui/chipStyles";
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
    hitSlop={chipHitSlop}
    style={[
      chipStyles.base,
      isAddOption && onboardingStyles.pillAdd,
      selected && chipStyles.selected,
      compact && chipStyles.fullWidth,
      compact && compactStyles.pill,
      style,
    ]}
    onPress={onPress}
    activeOpacity={ds.opacity.pressed}
  >
    <Text style={[chipStyles.label, compact && compactStyles.label]} numberOfLines={compact ? 1 : undefined} adjustsFontSizeToFit={compact} minimumFontScale={0.8}>{label}</Text>
    <Icon
      name={
        isAddOption ? "add" : selected ? "checkmark-circle" : "ellipse-outline"
      }
      size={chipIcon.size}
      color={selected || isAddOption ? chipIcon.selectedColor : chipIcon.color}
    />
  </TouchableOpacity>
);

const compactStyles = StyleSheet.create({
  pill: {minWidth:0},
  label: {flexShrink:1},
});
export default SelectablePill;
