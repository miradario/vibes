import React from "react";
import {
  TouchableOpacity,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Text } from "../Typography";
import { dayStyles as s } from "./styles";
export function DayButton({
  label,
  onPress,
  disabled,
  style,
  textStyle,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[s.button, style, disabled && s.disabled]}
    >
      <Text style={[s.buttonText, textStyle]} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
