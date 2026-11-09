import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, TextInput } from "./Typography";
import { vibesTheme } from "../src/theme/vibesTheme";
import { formatSession, type EventSession } from "../src/lib/eventSchedule";
import SegmentedControl from "./ui/SegmentedControl";
import DayPill from "./ui/DayPill";
import * as ds from "../src/theme/tokens";

export type EventRecurrenceDraft = { frequency: "none" | "weekly" | "monthly"; count: string; weekdays: number[] };
const days = [[1, "L", "Lunes"], [2, "M", "Martes"], [3, "M", "Miércoles"], [4, "J", "Jueves"], [5, "V", "Viernes"], [6, "S", "Sábado"], [0, "D", "Domingo"]] as const;

export default function EventRecurrenceEditor({ value, onChange, defaultWeekday, schedule }: {
  value: EventRecurrenceDraft;
  onChange: (next: EventRecurrenceDraft) => void;
  defaultWeekday: number;
  schedule: EventSession[] | null;
}) {
  const weekdays = value.weekdays.length ? value.weekdays : [defaultWeekday];
  const countValid = /^\d+$/.test(value.count) && Number(value.count) >= 2 && Number(value.count) <= 52;
  return <View style={s.group}>
    <Text style={s.label}>Repetir evento</Text>
    <SegmentedControl
      options={[{ key: "none", label: "No repetir" }, { key: "weekly", label: "Semanal" }, { key: "monthly", label: "Mensual" }] as const}
      selected={value.frequency} onChange={(frequency) => onChange({ ...value, frequency })} />
    {value.frequency !== "none" ? <>
      {value.frequency === "weekly" ? <>
        <Text style={s.label}>Días de la semana</Text>
        <View style={s.options}>{days.map(([day, letter, label]) => <DayPill key={day} variant="selectable" label={letter} accessibilityLabel={label}
          selected={weekdays.includes(day)}
          onPress={() => {
            const next = weekdays.includes(day) ? weekdays.filter(item => item !== day) : [...weekdays, day];
            if (next.length) onChange({ ...value, weekdays: next });
          }} />)}</View>
      </> : <Text style={s.hint}>Se repite el mismo día de cada mes. Si ese día no existe, se usa el último día del mes.</Text>}
      <Text style={s.label}>Cantidad de encuentros</Text>
      <TextInput value={value.count} onChangeText={count => onChange({ ...value, count: count.replace(/\D/g, "") })}
        keyboardType="number-pad" maxLength={2} accessibilityLabel="Cantidad de encuentros, entre 2 y 52" style={s.input} />
      <Text style={s.hint}>{countValid ? "Entre 2 y 52 encuentros. La serie termina en el último." : "Ingresá una cantidad entre 2 y 52."}</Text>
      {schedule?.length ? <View style={s.preview}>
        <Text style={s.label}>Próximas fechas</Text>
        {schedule.slice(0, 3).map(entry => <Text key={entry.startsAt} style={s.hint}>{formatSession(entry.startsAt)}</Text>)}
        {schedule.length > 3 ? <Text style={s.hint}>Y {schedule.length - 3} encuentros más.</Text> : null}
      </View> : null}
      <Text style={s.hint}>Una sola tarjeta para toda la serie. La inscripción y los cupos son compartidos por todos los encuentros.</Text>
    </> : null}
  </View>;
}
const c = vibesTheme.colors;
const s = StyleSheet.create({
  group: { gap: ds.spacing[2], marginTop: ds.spacing[5] },
  label: { ...ds.textStyles.label, color: c.primaryText },
  options: { flexDirection: "row", flexWrap: "wrap", gap: ds.spacing[2] },
  hint: { ...ds.textStyles.bodySmall, color: c.secondaryText },
  input: { minHeight: 48, borderWidth: 1, borderColor: ds.colors.border.default, borderRadius: ds.radii.lg, padding: ds.spacing[3], color: c.primaryText, backgroundColor: c.surface, ...ds.textStyles.body },
  preview: { gap: ds.spacing[2], padding: ds.spacing[4], borderRadius: ds.radii.lg, backgroundColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.subtle) },
});
