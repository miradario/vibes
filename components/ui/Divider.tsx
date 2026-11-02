import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import * as ds from "../../src/theme/tokens";

type DividerProps = {
  orientation?: "horizontal" | "vertical";
  /** Margen lateral (horizontal) o vertical (vertical) con un token de spacing. */
  inset?: ds.SpaceToken;
  /** Color: `subtle` (norma, igual que ListItem) o `default` (solo StatRow vertical). */
  tone?: "subtle" | "default";
  style?: StyleProp<ViewStyle>;
};

/** Divider (components-spec §1.6): 1 px en `border/subtle`. */
export default function Divider({ orientation = "horizontal", inset = 0, tone = "subtle", style }: DividerProps) {
  const color = tone === "default" ? ds.colors.border.default : ds.colors.border.subtle;
  const thickness = ds.componentSize.divider;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        orientation === "horizontal"
          ? { height: thickness, marginHorizontal: ds.spacing[inset] }
          : [styles.vertical, { width: thickness, marginVertical: ds.spacing[inset] }],
        { backgroundColor: color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({ vertical: { alignSelf: "stretch" } });
