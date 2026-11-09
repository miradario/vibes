import React from "react";
import { Pressable, StyleSheet, Switch, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "../Typography";
import Icon from "../Icon";
import * as ds from "../../src/theme/tokens";

type IconName = React.ComponentProps<typeof Icon>["name"];

export type ListItemTrailing =
  | { type: "chevron" }
  | { type: "check" }
  | { type: "text"; value: string }
  | { type: "switch"; value: boolean; onValueChange: (value: boolean) => void; accessibilityLabel?: string }
  | { type: "custom"; node: React.ReactNode };

type ListItemProps = {
  title: string;
  subtitle?: string;
  /** Ícono de 20 en caja de 36 (`radius/md`, `bg/subtle`). */
  leadingIcon?: IconName;
  /** Leading libre (avatar md 48 → alto mínimo 72, loader, etc.). Tiene prioridad sobre `leadingIcon`. */
  leading?: React.ReactNode;
  /** Alto mínimo: `md` 56 (ícono o sin leading) o `lg` 72 (con avatar). */
  size?: "md" | "lg";
  trailing?: ListItemTrailing;
  /** `destructive`: caja del ícono en `feedback/error-bg` e ícono en `action/destructive`. */
  tone?: "default" | "destructive";
  /** Seleccionable: fondo `bg/selected` cuando está elegido; rol radio (o checkbox con `multiple`). */
  selected?: boolean;
  selectable?: boolean;
  multiple?: boolean;
  disabled?: boolean;
  divider?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * ListItem (DS §5.18, Agus 30/10 t902u). Fila única de listas, menús y ajustes.
 * Alto mínimo 56 (72 con avatar), padding X `spacing/4`, Y `spacing/3`, gap `spacing/3`.
 * Título `text/subtitle` (1 línea), subtítulo `text/body-small` secondary (1 línea).
 * Trailing: chevron 20 `icon/muted`, check 20 `border/selected`, texto `text/caption` secondary, Switch o nodo.
 * Estados: pressed `bg/subtle`, selected `bg/selected`, disabled `opacity/disabled`. Divider 1 px `border/subtle`.
 */
export default function ListItem({
  title, subtitle, leadingIcon, leading, size = "md", trailing, tone = "default", selected, selectable, multiple,
  disabled, divider, onPress, accessibilityLabel, style,
}: ListItemProps) {
  const destructive = tone === "destructive";
  const role = selectable ? (multiple ? "checkbox" : "radio") : "button";
  const leadingNode = leading ?? (leadingIcon ? (
    <View style={[styles.leadingBox, destructive && styles.leadingBoxDestructive]}>
      <Icon name={leadingIcon} size={ds.iconSize.md} color={destructive ? ds.colors.action.destructive : ds.colors.icon.default} />
    </View>
  ) : null);
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={selectable ? { checked: !!selected, disabled: !!disabled } : { disabled: !!disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { minHeight: ds.componentSize.listItem[size] },
        style,
        selected && styles.selected,
        pressed && styles.pressed,
        divider && styles.divider,
        disabled && styles.disabled,
      ]}
    >
      {leadingNode}
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {trailing?.type === "chevron" ? <Icon name="chevron-forward" size={ds.iconSize.md} color={ds.colors.icon.muted} /> : null}
      {trailing?.type === "check" && selected ? <Icon name="checkmark" size={ds.iconSize.md} color={ds.colors.border.selected} /> : null}
      {trailing?.type === "text" ? <Text style={styles.meta}>{trailing.value}</Text> : null}
      {trailing?.type === "switch" ? (
        <Switch
          accessibilityLabel={trailing.accessibilityLabel ?? title}
          value={trailing.value}
          disabled={disabled}
          onValueChange={trailing.onValueChange}
          trackColor={{ false: ds.colors.border.default, true: ds.colors.action.accent }}
          thumbColor={ds.colors.bg.surface}
        />
      ) : null}
      {trailing?.type === "custom" ? trailing.node : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: ds.spacing[3], paddingHorizontal: ds.spacing[4], paddingVertical: ds.spacing[3] },
  selected: { backgroundColor: ds.colors.bg.selected },
  pressed: { backgroundColor: ds.colors.bg.subtle },
  disabled: { opacity: ds.opacity.disabled },
  divider: { borderBottomWidth: ds.componentSize.divider, borderBottomColor: ds.colors.border.subtle },
  leadingBox: { width: ds.componentSize.listItem.leading, height: ds.componentSize.listItem.leading, borderRadius: ds.radii.md, alignItems: "center", justifyContent: "center", backgroundColor: ds.colors.bg.subtle },
  leadingBoxDestructive: { backgroundColor: ds.colors.feedback.errorBg },
  copy: { flex: 1, minWidth: ds.spacing[0], gap: ds.spacing[1] },
  title: { ...ds.textStyles.subtitle, color: ds.colors.text.primary },
  subtitle: { ...ds.textStyles.bodySmall, color: ds.colors.text.secondary },
  meta: { ...ds.textStyles.caption, color: ds.colors.text.secondary },
});
