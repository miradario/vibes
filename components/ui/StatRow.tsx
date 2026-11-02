import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "../Typography";
import Divider from "./Divider";
import * as ds from "../../src/theme/tokens";

export type StatItem = { value: React.ReactNode; label: React.ReactNode; icon?: React.ReactNode; key?: string };

type StatRowProps = { items: StatItem[]; style?: StyleProp<ViewStyle> };

/**
 * StatRow (components-spec §1.5): 2–4 métricas repartidas en partes iguales. Valor en
 * `text/heading`, label en `text/caption` secondary, divisor vertical `border/default`
 * con `spacing/4` a cada lado.
 */
export default function StatRow({ items, style }: StatRowProps) {
  return (
    <View style={[styles.row, style]}>
      {items.map((item, index) => (
        <React.Fragment key={item.key ?? String(index)}>
          {index > 0 ? <Divider orientation="vertical" tone="default" /> : null}
          <View style={styles.item}>
            {item.icon}
            <Text style={styles.value}>{item.value}</Text>
            <Text style={styles.label}>{item.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "stretch", gap: ds.spacing[4] },
  item: { flex: 1, alignItems: "center", gap: ds.spacing[1] },
  value: { ...ds.textStyles.heading, color: ds.colors.text.primary },
  label: { ...ds.textStyles.caption, color: ds.colors.text.secondary, textAlign: "center" },
});
