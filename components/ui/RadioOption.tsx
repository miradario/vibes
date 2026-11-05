import React from "react";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../Typography";
import { optionCardStyles } from "./optionCardStyles";
import * as ds from "../../src/theme/tokens";

type Props = {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export default function RadioOption({ label, selected, disabled = false, onPress }: Props) {
  return (
    <TouchableOpacity
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      activeOpacity={ds.opacity.pressed}
      style={[optionCardStyles.base, selected && optionCardStyles.selected, disabled && optionCardStyles.disabled]}
    >
      <Ionicons
        name={selected ? "radio-button-on" : "radio-button-off"}
        size={ds.iconSize.md}
        color={ds.colors.icon.default}
      />
      <Text style={[optionCardStyles.copy, optionCardStyles.label]}>{label}</Text>
    </TouchableOpacity>
  );
}
