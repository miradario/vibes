import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "../Typography";
import Icon from "../Icon";
import * as ds from "../../src/theme/tokens";

type TagProps = {
  label: string;
  /** Ícono opcional (Ionicons) a la izquierda: `iconSize.sm`, azul, gap `spacing/1`. */
  icon?: React.ComponentProps<typeof Icon>["name"];
  style?: StyleProp<ViewStyle>;
};

/**
 * Tag informativo (DS §5.x, decisión Agus 29/10): etiqueta no interactiva para
 * categoría, modalidad o duración. Fondo `feedback/info-bg`, texto azul en
 * `text/label-medium`, padding `spacing/3`×`spacing/1` y radio pill.
 * Para filtros o elecciones que se tocan usar Chip; para cantidades, Badge.
 */
export default function Tag({ label, icon, style }: TagProps) {
  return (
    <View style={[styles.tag, style]} accessibilityRole="text">
      {icon ? <Icon name={icon} size={ds.iconSize.sm} color={ds.colors.base.blue} /> : null}
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[1],
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
