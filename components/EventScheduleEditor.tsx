import React, { useState } from "react";
import { View, TouchableOpacity, Platform, StyleSheet } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Text, TextInput } from "./Typography";
import { vibesTheme } from "../src/theme/vibesTheme";
import { sessionDraft, type EventScheduleDraft } from "../src/lib/eventSchedule";

export default function EventScheduleEditor({ value, onChange }: {
  value: EventScheduleDraft[];
  onChange: (value: EventScheduleDraft[]) => void;
}) {
  const [dateIndex, setDateIndex] = useState<number | null>(null);
  const [editingEnd, setEditingEnd] = useState(false);
  const update = (index: number, patch: Partial<EventScheduleDraft>) =>
    onChange(value.map((row, i) => i === index ? { ...row, ...patch } : row));
  const selectedDate = dateIndex !== null ? (editingEnd ? value[dateIndex]?.endDate : value[dateIndex]?.date) : null;
  const pickerValue = selectedDate ? new Date(`${selectedDate}T12:00:00`) : new Date();
  return <View style={styles.container}>
    <Text style={styles.hint}>Inicio y fin opcional de cada encuentro. Hora en formato 24 h. El fin debe ser posterior al inicio.</Text>
    {value.map((row, index) => <View key={index} style={styles.row}>
      <TouchableOpacity style={styles.date} accessibilityRole="button"
        accessibilityLabel={`Fecha de inicio ${index + 1}`} onPress={() => { setEditingEnd(false); setDateIndex(index); }}>
        <Text style={styles.text}>{row.date ? row.date.split("-").reverse().join("/") : "Elegir fecha"}</Text>
      </TouchableOpacity>
      <TextInput style={styles.time} value={row.time} placeholder="HH:mm"
        placeholderTextColor={vibesTheme.colors.secondaryText}
        accessibilityLabel={`Hora ${index + 1}, horas y minutos`}
        keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
        maxLength={5} onChangeText={(text) => {
          const time = text.replace(/[^\d:]/g, "");
          update(index, { time: /^\d{4}$/.test(time) ? `${time.slice(0, 2)}:${time.slice(2)}` : time });
        }}
        onBlur={() => { if (/^\d{4}$/.test(row.time)) update(index, { time: `${row.time.slice(0, 2)}:${row.time.slice(2)}` }); }} />
      <View style={styles.row}>
        <TouchableOpacity style={styles.date} accessibilityRole="button" accessibilityLabel={`Fecha de fin ${index + 1}`} onPress={() => { setEditingEnd(true); setDateIndex(index); }}>
          <Text style={styles.text}>{row.endDate ? `Fin: ${row.endDate.split("-").reverse().join("/")}` : "Agregar fecha de fin"}</Text>
        </TouchableOpacity>
        {row.endDate ? <>
          <TextInput style={styles.time} value={row.endTime ?? ""} placeholder="HH:mm" placeholderTextColor={vibesTheme.colors.secondaryText} accessibilityLabel={`Hora de fin ${index + 1}`} maxLength={5} onChangeText={(text) => { const time = text.replace(/[^\d:]/g, ""); update(index, { endTime: /^\d{4}$/.test(time) ? `${time.slice(0, 2)}:${time.slice(2)}` : time }); }} />
          <TouchableOpacity style={styles.remove} accessibilityRole="button" accessibilityLabel="Quitar fecha de fin" onPress={() => update(index, { endDate: undefined, endTime: undefined })}><Text style={styles.text}>Sin fin</Text></TouchableOpacity>
        </> : null}
      </View>
      {value.length > 1 ? <TouchableOpacity accessibilityRole="button"
        accessibilityLabel={`Quitar horario ${index + 1}`} style={styles.remove}
        onPress={() => { setDateIndex(null); onChange(value.filter((_, i) => i !== index)); }}>
        <Text style={styles.text}>Quitar</Text>
      </TouchableOpacity> : null}
    </View>)}
    {dateIndex !== null ? <View>
      <DateTimePicker value={pickerValue} mode="date"
        display={Platform.OS === "ios" ? "spinner" : "default"}
        onChange={(event, selected) => {
          if (Platform.OS !== "ios") setDateIndex(null);
          if (event.type !== "dismissed" && selected) update(dateIndex, editingEnd ? { endDate: sessionDraft(selected.toISOString()).date } : { date: sessionDraft(selected.toISOString()).date });
        }} />
      {Platform.OS === "ios" ? <TouchableOpacity style={styles.add} onPress={() => setDateIndex(null)}>
        <Text style={styles.text}>Listo</Text>
      </TouchableOpacity> : null}
    </View> : null}
    <TouchableOpacity accessibilityRole="button" style={styles.add}
      onPress={() => onChange([...value, { date: "", time: "" }])}>
      <Text style={styles.text}>+ Agregar día u horario</Text>
    </TouchableOpacity>
  </View>;
}
const colors = vibesTheme.colors;
const styles = StyleSheet.create({
  container: { gap: 12 },
  hint: { color: colors.secondaryText, fontSize: 16 },
  row: { flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" },
  date: { flexGrow: 1, padding: 14, borderWidth: 1, borderColor: colors.secondaryText, borderRadius: 16, backgroundColor: colors.surface },
  time: { width: 100, padding: 14, borderWidth: 1, borderColor: colors.secondaryText, borderRadius: 16, color: colors.primaryText, fontSize: 18, backgroundColor: colors.surface },
  remove: { paddingVertical: 14, paddingHorizontal: 8 },
  add: { padding: 14, borderWidth: 1, borderColor: colors.accentBlue, borderRadius: 16, alignItems: "center" },
  text: { color: colors.primaryText, fontSize: 17 },
});
