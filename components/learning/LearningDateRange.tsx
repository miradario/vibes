import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "../Typography";
import Icon from "../Icon";
import { eventDayKey } from "../../src/lib/eventExplorer";
import { WEEKDAY_INITIALS_MON_FIRST, WEEKDAY_NAMES_MON_FIRST } from "../../src/lib/weekdays";
import * as ds from "../../src/theme/tokens";
export default function LearningDateRange({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const offset = (month.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const choose = (key: string) => {
    if (!from || to) onChange(key, "");
    else if (key < from) onChange(key, from);
    else onChange(from, key);
  };
  return <View style={s.block}>
    <Text style={s.label}>Fecha de encuentro</Text>
    <Text style={s.copy}>Desde: {from || "Sin límite"} · Hasta: {to || "Sin límite"}</Text>
    <View style={s.row}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Mes anterior" style={s.arrow} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><Icon name="chevron-back" size={ds.iconSize.md} color={ds.colors.icon.default} /></TouchableOpacity>
      <Text style={[s.label, { flex: 1, textAlign: "center" }]}>{month.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Mes siguiente" style={s.arrow} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><Icon name="chevron-forward" size={ds.iconSize.md} color={ds.colors.icon.default} /></TouchableOpacity>
    </View>
    <View style={s.grid}>{WEEKDAY_INITIALS_MON_FIRST.map((label, index) => <View key={label + String(index)} style={s.cell} accessible accessibilityLabel={WEEKDAY_NAMES_MON_FIRST[index]}><Text style={s.copy} importantForAccessibility="no">{label}</Text></View>)}</View>
    <View style={s.grid}>{Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, index) => {
      const day = index - offset + 1;
      if (day < 1 || day > count) return <View key={index} style={s.cell} />;
      const key = eventDayKey(new Date(month.getFullYear(), month.getMonth(), day));
      const selected = key === from || key === to;
      return <TouchableOpacity key={key} accessibilityRole="button" accessibilityLabel={key} accessibilityState={{ selected }} onPress={() => choose(key)} style={[s.cell, from && to && key > from && key < to ? s.range : null, selected && s.selected]}><Text style={s.label}>{day}</Text></TouchableOpacity>;
    })}</View>
  </View>;
}
const s = StyleSheet.create({
  block: { gap: ds.spacing[2] }, row: { flexDirection: "row", alignItems: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap" }, cell: { width: "14.285714%", minHeight: 44, justifyContent: "center", alignItems: "center", borderRadius: ds.radii.md },
  arrow: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  selected: { backgroundColor: ds.colors.bg.selected, borderWidth: 1, borderColor: ds.colors.border.selected },
  range: { backgroundColor: ds.colors.feedback.infoBg },
  label: { ...ds.textStyles.label, color: ds.colors.text.primary }, copy: { ...ds.textStyles.bodySmall, color: ds.colors.text.secondary },
});
