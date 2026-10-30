import React from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "../Typography";
import { buttonDisabled } from "./buttonStyles";
import * as ds from "../../src/theme/tokens";

export type DayPillState = "future" | "current" | "done" | "missed";

type DayPillProps = {
  label?: React.ReactNode;
  /** Solo variante "progress". */
  state?: DayPillState;
  /** "progress" (default): estado del día de un desafío. "selectable": elegir días (multiselección, checkbox). */
  variant?: "progress" | "selectable";
  selected?: boolean;
  size?: "sm" | "md";
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

/** Colores por estado (components-spec §1.3, DUDA 5 ★). */
export const dayPillColors: Record<DayPillState, { bg: string; border: string; text: string }> = {
  future: { bg: ds.colors.bg.surface, border: ds.colors.border.default, text: ds.colors.text.secondary },
  current: { bg: ds.colors.bg.selected, border: ds.colors.border.selected, text: ds.colors.text.primary },
  done: { bg: ds.colors.action.primary, border: ds.colors.action.primary, text: ds.colors.text.onDark },
  missed: { bg: ds.colors.feedback.errorBg, border: ds.colors.border.error, text: ds.colors.text.primary },
};

/**
 * DayPill (components-spec §1.3): md 40 (hitSlop a 44) interactivo o sm 28 indicador.
 * Pill, `text/label`. `selected` = borde 2 px `border/focus` (DUDA 6 ★).
 */
/**
 * Variante `selectable` (Agus 30/10, t901u): círculo md 40 (hitSlop a 44), `text/label`.
 * default: `bg/surface` + `border/default`, texto `text/primary`. selected: igual que Chip selected
 * (`bg/selected` + `border/selected`). disabled: `buttonDisabled`. Rol checkbox.
 */
export const dayPillSelectableColors = {
  default: { bg: ds.colors.bg.surface, border: ds.colors.border.default, text: ds.colors.text.primary },
  selected: { bg: ds.colors.bg.selected, border: ds.colors.border.selected, text: ds.colors.text.primary },
} as const;

export default function DayPill({ label, state = "future", variant = "progress", selected, size = "md", onPress, disabled, accessibilityLabel, style, children }: DayPillProps) {
  if (variant === "selectable") {
    const sc = dayPillSelectableColors[selected ? "selected" : "default"];
    const dimSel = ds.componentSize.dayPill.md;
    const hitSel = (ds.touchTarget - dimSel) / 2;
    return (
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ checked: !!selected, disabled: !!disabled }}
        disabled={disabled}
        hitSlop={hitSel}
        onPress={onPress}
        style={({ pressed }) => [
          styles.pill,
          { width: dimSel, height: dimSel, backgroundColor: sc.bg, borderColor: sc.border, borderWidth: 1 },
          pressed && { opacity: ds.opacity.pressed },
          disabled && buttonDisabled,
          style,
        ]}
      >
        {children ?? <Text style={[styles.label, { color: sc.text }]}>{label}</Text>}
      </Pressable>
    );
  }
  const c = dayPillColors[state];
  const dim = ds.componentSize.dayPill[size];
  const box: StyleProp<ViewStyle> = [
    styles.pill,
    { minWidth: dim, height: dim, backgroundColor: c.bg, borderColor: selected ? ds.colors.border.focus : c.border, borderWidth: selected ? 2 : 1 },
    size === "md" && styles.md,
    style,
  ];
  const content = children ?? (label != null ? <Text style={[styles.label, { color: c.text }]}>{label}</Text> : null);
  if (!onPress) return <View style={box} accessibilityLabel={accessibilityLabel}>{content}</View>;
  const hit = (ds.touchTarget - dim) / 2;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ selected: !!selected, disabled: !!disabled }} disabled={disabled} hitSlop={hit > 0 ? hit : undefined} onPress={onPress} style={({ pressed }) => [box, pressed && { opacity: ds.opacity.pressed }]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: ds.radii.pill, alignItems: "center", justifyContent: "center" },
  md: { paddingHorizontal: ds.spacing[3] },
  label: { ...ds.textStyles.label },
});
