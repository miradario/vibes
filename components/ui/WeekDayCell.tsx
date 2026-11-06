import React from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "../Typography";
import * as ds from "../../src/theme/tokens";

type WeekDayCellProps = {
  /** Letra del día (L M X J V S D; ver `WEEKDAY_INITIALS_MON_FIRST`). */
  letter: string;
  /** Número del día del mes. */
  dayNumber: number;
  selected?: boolean;
  /** Punto bajo el número cuando hay clase(s) ese día. */
  hasClass?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * WeekDayCell: celda de la tira semanal (home de clases del alumno).
 * Columna: letra `caption` secondary + número `label` primary; selected = borde 2
 * `border/selected` + `bg/selected`; `hasClass` = punto `spacing/1` en `action/accent`.
 * Alto mínimo táctil 44; radio `md`; borde 1 `border/default` en reposo.
 */
export default function WeekDayCell({
  letter,
  dayNumber,
  selected,
  hasClass,
  onPress,
  disabled,
  accessibilityLabel,
  style,
}: WeekDayCellProps) {
  const label =
    accessibilityLabel ??
    `${letter} ${dayNumber}${selected ? ", seleccionado" : ""}${hasClass ? ", con clases" : ""}`;
  const content = (
    <>
      <Text style={styles.letter}>{letter}</Text>
      <Text style={[styles.day, selected && styles.daySelected]}>{dayNumber}</Text>
      <View
        style={[styles.dotSlot, hasClass ? styles.dotOn : styles.dotOff]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </>
  );
  if (!onPress) {
    return (
      <View
        style={[styles.cell, selected && styles.cellSelected, style]}
        accessibilityLabel={label}
        accessibilityState={{ selected: !!selected }}
      >
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cell,
        selected && styles.cellSelected,
        pressed && { opacity: ds.opacity.pressed },
        disabled && { opacity: ds.opacity.disabled },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

const DOT = ds.spacing[1];

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    minHeight: ds.touchTarget,
    minWidth: ds.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    gap: ds.spacing[0],
    paddingVertical: ds.spacing[2],
    paddingHorizontal: ds.spacing[1],
    borderRadius: ds.radii.md,
    borderWidth: 1,
    borderColor: ds.colors.border.default,
    backgroundColor: ds.colors.bg.surface,
  },
  cellSelected: {
    borderWidth: 2,
    borderColor: ds.colors.border.selected,
    backgroundColor: ds.colors.bg.selected,
  },
  letter: {
    ...ds.textStyles.caption,
    color: ds.colors.text.secondary,
  },
  day: {
    ...ds.textStyles.label,
    color: ds.colors.text.primary,
  },
  daySelected: {
    ...ds.textStyles.label,
    color: ds.colors.text.primary,
  },
  dotSlot: {
    width: DOT,
    height: DOT,
    borderRadius: ds.radii.pill,
    marginTop: ds.spacing[1],
  },
  dotOn: { backgroundColor: ds.colors.action.accent },
  dotOff: { backgroundColor: "transparent" },
});
