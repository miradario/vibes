import React from "react";
import { StyleSheet, TouchableOpacity, View, type TouchableOpacityProps } from "react-native";
import Icon from "./Icon";
import { vibesTheme } from "../src/theme/vibesTheme";
import * as ds from "../src/theme/tokens";

export default function BackButton({ style, hideIcon = false, ...props }: TouchableOpacityProps & { hideIcon?: boolean }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver" activeOpacity={0.8}
    {...props} style={[style, s.button]}>
    <View pointerEvents="none" style={s.fill}>
      {hideIcon ? null : <Icon name="chevron-back" size={ds.iconSize.lg} color={vibesTheme.colors.primaryText} />}
    </View>
  </TouchableOpacity>;
}

const s = StyleSheet.create({
  fill: { width: "100%", height: "100%", borderRadius: ds.radii.md, alignItems: "center", justifyContent: "center", backgroundColor: ds.colors.bg.subtle },
  button: { width: 44, height: 44, minWidth: 44, minHeight: 44, borderRadius: ds.radii.md,
    alignItems: "center", justifyContent: "center", backgroundColor: vibesTheme.colors.surface,
    borderWidth: 0, ...ds.shadows.none },
});
