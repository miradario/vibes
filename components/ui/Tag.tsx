import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "../Typography";
import * as ds from "../../src/theme/tokens";

type TagProps = {
  label: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Tag informativo (DS §5.x, decisión Agus 29/10): etiqueta no interactiva para
 * categoría, modalidad o duración. Fondo `feedback/info-bg`, texto azul en
 * `text/label-medium`, padding `spacing/3`×`spacing/1` y radio pill.
 * Para filtros o elecciones que se tocan usar Chip; para cantidades, Badge.
 */
export default function Tag({ label, style }: TagProps) {
  return (
    <View style={[styles.tag, style]} accessibilityRole="text">
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: "flex-start",
    paddingHorizontal: ds.spacing[3],
    paddingVertical: ds.spacing[1],
    borderRadius: ds.radii.pill,
    backgroundColor: ds.colors.feedback.infoBg,
  },
  label: {
    color: ds.colors.base.blue,
    ...ds.textStyles.labelMedium,
  },
});
