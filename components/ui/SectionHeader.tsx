import React from "react";
import { StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "../Typography";
import Icon from "../Icon";
import * as ds from "../../src/theme/tokens";

type SectionHeaderProps = {
  title: string;
  /** Si existe, todo el header es un link "ver todo" con chevron `icon/accent`. */
  onPress?: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * SectionHeader (30/10, t914s3491): título `textStyles.heading` + link de sección opcional.
 * Link: chevron 20 (`iconSize.md`) en `icon/accent` (mustard), touch target 44 (hitSlop), role link.
 * Los chevrons dentro de cards siguen en `icon/muted`.
 */
export default function SectionHeader({ title, onPress, accessibilityLabel, disabled, style }: SectionHeaderProps) {
  if (!onPress)
    return (
      <View style={[styles.row, style]}>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
      </View>
    );
  return (
    <TouchableOpacity
      style={[styles.row, style]}
      hitSlop={LINK_HIT_SLOP}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? `Ver ${title}`}
      accessibilityState={{ disabled: !!disabled }}
      activeOpacity={ds.opacity.pressed}
    >
      <Text style={styles.title}>{title}</Text>
      <Icon name="chevron-forward" size={ds.iconSize.md} color={ds.colors.icon.accent} />
    </TouchableOpacity>
  );
}

// Touch target 44 vía hitSlop, sin inflar la fila: el espacio visible entre secciones queda en el token.
const LINK_SLOP_Y = Math.max(0, (ds.touchTarget - ds.textStyles.heading.lineHeight) / 2);
const LINK_HIT_SLOP = { top: LINK_SLOP_Y, bottom: LINK_SLOP_Y };

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: ds.spacing[2] },
  title: { flex: 1, ...ds.textStyles.heading, color: ds.colors.text.primary },
});
