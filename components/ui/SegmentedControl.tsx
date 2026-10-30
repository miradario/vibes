import React from "react";
import { StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "../Typography";
import Icon from "../Icon";
import { badgeStyles } from "./surfaceStyles";
import * as ds from "../../src/theme/tokens";

export type SegmentedOption<K extends string> = {
  key: K;
  label: string;
  /** Ícono opcional (Ionicons), `iconSize.md`. */
  icon?: React.ComponentProps<typeof Icon>["name"];
  /** Contador opcional: Badge count 18 cuando es > 0. */
  count?: number;
};

type Props<K extends string> = {
  options: readonly SegmentedOption<K>[];
  selected: K;
  onChange: (key: K) => void;
  style?: StyleProp<ViewStyle>;
};

const OPTION_HEIGHT = ds.componentSize.segmentedOption;
const HIT = (ds.touchTarget - OPTION_HEIGHT) / 2;

/**
 * SegmentedControl (DS §5.19 + Agus 29/10: ícono y contador opcionales). Pista `bg/subtle`
 * pill con padding `spacing/1`; opciones de 36 (hitSlop a 44), padding X `spacing/4`,
 * `text/label`. Seleccionada: `action/primary` + `text/on-dark`. Ícono `icon/muted` sin
 * seleccionar. Contador = Badge count.
 */
export default function SegmentedControl<K extends string>({ options, selected, onChange, style }: Props<K>) {
  return (
    <View style={[styles.track, style]} accessibilityRole="tablist">
      {options.map((option) => {
        const isSelected = option.key === selected;
        const color = isSelected ? ds.colors.text.onDark : ds.colors.icon.muted;
        return (
          <TouchableOpacity
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            hitSlop={{ top: HIT, bottom: HIT }}
            activeOpacity={ds.opacity.pressed}
            onPress={() => onChange(option.key)}
            style={[styles.option, isSelected && styles.optionSelected]}
          >
            {option.icon ? <Icon name={option.icon} size={ds.iconSize.md} color={color} /> : null}
            <Text style={[styles.label, isSelected && styles.labelSelected]} numberOfLines={1}>
              {option.label}
            </Text>
            {option.count && option.count > 0 ? (
              <View style={badgeStyles.count}>
                <Text style={badgeStyles.countText}>{option.count}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", padding: ds.spacing[1], borderRadius: ds.radii.pill, backgroundColor: ds.colors.bg.subtle },
  option: { flex: 1, minHeight: OPTION_HEIGHT, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: ds.spacing[2], paddingHorizontal: ds.spacing[4], borderRadius: ds.radii.pill },
  optionSelected: { backgroundColor: ds.colors.action.primary },
  label: { ...ds.textStyles.label, color: ds.colors.text.secondary, flexShrink: 1 },
  labelSelected: { color: ds.colors.text.onDark },
});
