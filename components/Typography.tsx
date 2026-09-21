import React, { forwardRef } from "react";
import {
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextProps,
  type TextInputProps,
} from "react-native";
import { vibesTheme } from "../src/theme/vibesTheme";

const baseStyle = { fontFamily: vibesTheme.fonts.regular };

// Keep native props, accessibility, scaling and imperative refs intact.
export type Text = NativeText;
export const Text = forwardRef<NativeText, TextProps>(function VibesText(
  { style, ...props },
  ref
) {
  return <NativeText {...props} ref={ref} style={[baseStyle, style]} />;
});

export type TextInput = NativeTextInput;
export const TextInput = forwardRef<NativeTextInput, TextInputProps>(
  function VibesTextInput({ style, ...props }, ref) {
    return <NativeTextInput {...props} ref={ref} style={[baseStyle, style]} />;
  }
);
