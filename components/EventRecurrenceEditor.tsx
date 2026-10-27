import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Text, TextInput } from "./Typography";
import { vibesTheme } from "../src/theme/vibesTheme";
import { formatSession, type EventSession } from "../src/lib/eventSchedule";

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
    <View style={s.options}>
      {([["none", "No repetir"], ["weekly", "Semanal"], ["monthly", "Mensual"]] as const).map(([frequency, label]) => <TouchableOpacity
        key={frequency} accessibilityRole="button" accessibilityState={{ selected: value.frequency === frequency }}
        style={[s.option, value.frequency === frequency && s.selected]} onPress={() => onChange({ ...value, frequency })}>
        <Text style={s.optionText}>{label}</Text>
      </TouchableOpacity>)}
    </View>
    {value.frequency !== "none" ? <>
      {value.frequency === "weekly" ? <>
        <Text style={s.label}>Días de la semana</Text>
        <View style={s.options}>{days.map(([day, letter, label]) => <TouchableOpacity key={day} accessibilityRole="button" accessibilityLabel={label}
          accessibilityState={{ selected: weekdays.includes(day) }} style={[s.day, weekdays.includes(day) && s.selected]}
          onPress={() => {
            const next = weekdays.includes(day) ? weekdays.filter(item => item !== day) : [...weekdays, day];
            if (next.length) onChange({ ...value, weekdays: next });
          }}><Text style={s.optionText}>{letter}</Text></TouchableOpacity>)}</View>
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
  group: { gap: 8, marginTop: 20 },
  label: { fontSize: 14, lineHeight: 20, color: c.primaryText, fontFamily: vibesTheme.fonts.semibold },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  option: { minHeight: 40, justifyContent: "center", paddingHorizontal: 14, paddingVertical: 0, borderWidth: 1, borderColor: `${c.primaryText}1F`, borderRadius: 16, backgroundColor: c.surface },
  day: { flexGrow: 1, minWidth: 36, minHeight: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: `${c.primaryText}1F`, borderRadius: 12, backgroundColor: c.surface },
  selected: { borderColor: c.accentMustard, backgroundColor: `${c.accentMustard}24` },
  optionText: { fontSize: 14, lineHeight: 20, color: c.primaryText, fontFamily: vibesTheme.fonts.semibold },
  hint: { fontSize: 14, lineHeight: 20, color: c.secondaryText, fontFamily: vibesTheme.fonts.regular },
  input: { minHeight: 48, borderWidth: 1, borderColor: `${c.primaryText}1F`, borderRadius: 16, padding: 12, color: c.primaryText, backgroundColor: c.surface, fontSize: 16, fontFamily: vibesTheme.fonts.regular },
  preview: { gap: 6, padding: 16, borderRadius: 16, backgroundColor: `${c.accentBlue}14` },
});
