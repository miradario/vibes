import React, { useState } from "react";
import { View, TouchableOpacity, Platform, StyleSheet, Keyboard } from "react-native";
import AnimatedSheetModal from "./AnimatedSheetModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Text, TextInput } from "./Typography";
import { vibesTheme } from "../src/theme/vibesTheme";
import { sessionDraft, type EventScheduleDraft, type ScheduleDraftIssue } from "../src/lib/eventSchedule";
import * as ds from "../src/theme/tokens";

export default function EventScheduleEditor({ value, onChange, allowMultiple = true, issues = [] }: {
  value: EventScheduleDraft[];
  issues?: ScheduleDraftIssue[];
  allowMultiple?: boolean;
  onChange: (value: EventScheduleDraft[]) => void;
}) {
  const insets = useSafeAreaInsets();
  const [pendingDate, setPendingDate] = useState(new Date());
  const [dateIndex, setDateIndex] = useState<number | null>(null);
  const [editingEnd, setEditingEnd] = useState(false);
  const update = (index: number, patch: Partial<EventScheduleDraft>) =>
    onChange(value.map((row, i) => i === index ? { ...row, ...patch } : row));
  const openDate = (index: number, end: boolean) => {
    Keyboard.dismiss();
    const date = end ? value[index].endDate ?? value[index].date : value[index].date;
    setPendingDate(date ? new Date(`${date}T12:00:00`) : new Date());
    setEditingEnd(end);
    setDateIndex(index);
  };
  const saveDate = (selected: Date) => {
    if (dateIndex !== null) {
      const date = sessionDraft(selected.toISOString()).date;
      update(dateIndex, editingEnd ? { endDate: date } : { date });
    }
    setDateIndex(null);
  };
  return <View style={styles.container}>
    <Text style={styles.hint}>Inicio y fin opcional de cada encuentro. Hora en formato 24 h. El fin debe ser posterior al inicio.</Text>
    {value.map((row, index) => <View key={index} style={styles.row}>
      <TouchableOpacity style={styles.date} accessibilityRole="button"
        accessibilityLabel={`Fecha de inicio ${index + 1}`} onPress={() => openDate(index, false)}>
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
        <TouchableOpacity style={styles.date} accessibilityRole="button" accessibilityLabel={`Fecha de fin ${index + 1}`} onPress={() => openDate(index, true)}>
          <Text style={styles.text}>{row.endDate ? `Fin: ${row.endDate.split("-").reverse().join("/")}` : "Agregar fecha de fin"}</Text>
        </TouchableOpacity>
        {row.endDate ? <>
          <TextInput style={styles.time} value={row.endTime ?? ""} placeholder="HH:mm" placeholderTextColor={vibesTheme.colors.secondaryText} accessibilityLabel={`Hora de fin ${index + 1}`} maxLength={5} onChangeText={(text) => { const time = text.replace(/[^\d:]/g, ""); update(index, { endTime: /^\d{4}$/.test(time) ? `${time.slice(0, 2)}:${time.slice(2)}` : time }); }} />
          <TouchableOpacity style={styles.remove} accessibilityRole="button" accessibilityLabel="Quitar fecha de fin" onPress={() => update(index, { endDate: undefined, endTime: undefined })}><Text style={styles.text}>Sin fin</Text></TouchableOpacity>
        </> : null}
      </View>
      {issues[index]?.error ? <Text accessibilityRole="alert" style={[styles.hint, styles.issueError]}>{issues[index].error}</Text> : null}
      {issues[index]?.warning ? <Text style={[styles.hint, styles.issueText]}>{issues[index].warning}</Text> : null}
      {value.length > 1 ? <TouchableOpacity accessibilityRole="button"
        accessibilityLabel={`Quitar horario ${index + 1}`} style={styles.remove}
        onPress={() => { setDateIndex(null); onChange(value.filter((_, i) => i !== index)); }}>
        <Text style={styles.text}>Quitar</Text>
      </TouchableOpacity> : null}
    </View>)}
    {Platform.OS === "ios" ? <AnimatedSheetModal
      visible={dateIndex !== null}
      onClose={() => setDateIndex(null)}
      sheetStyle={[styles.dateSheet, { paddingBottom: Math.max(insets.bottom, ds.spacing[4]) }]}
    >
      <Text accessibilityRole="header" style={styles.sheetTitle}>{editingEnd ? "Fecha de fin" : "Fecha de inicio"}</Text>
      <DateTimePicker value={pendingDate} mode="date" display="spinner"
        themeVariant="light" textColor={colors.primaryText} accentColor={colors.accentBlue}
        onChange={(_, selected) => { if (selected) setPendingDate(selected); }} />
      <TouchableOpacity accessibilityRole="button" style={styles.confirm} onPress={() => saveDate(pendingDate)}>
        <Text style={styles.confirmText}>Confirmar fecha</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" style={styles.cancel} onPress={() => setDateIndex(null)}>
        <Text style={styles.cancelText}>Cancelar</Text>
      </TouchableOpacity>
    </AnimatedSheetModal> : dateIndex !== null ? <DateTimePicker
      value={pendingDate} mode="date" display="default"
      onChange={(event, selected) => {
        if (event.type === "set" && selected) saveDate(selected);
        else setDateIndex(null);
      }}
    /> : null}
    {allowMultiple ? <TouchableOpacity accessibilityRole="button" style={styles.add}
      onPress={() => onChange([...value, { date: "", time: "" }])}>
      <Text style={styles.text}>+ Agregar día u horario</Text>
    </TouchableOpacity> : null}
  </View>;
}
const colors = vibesTheme.colors;
const styles = StyleSheet.create({
  dateSheet: { backgroundColor: colors.surface, borderTopLeftRadius: ds.radii.xl, borderTopRightRadius: ds.radii.xl, padding: ds.spacing[6], gap: ds.spacing[3] },
  sheetTitle: { ...ds.textStyles.title, color: colors.primaryText },
  confirm: { minHeight: 56, borderRadius: ds.radii.pill, backgroundColor: colors.primaryText, alignItems: "center", justifyContent: "center", paddingHorizontal: ds.spacing[5] },
  confirmText: { ...ds.textStyles.heading, color: colors.surface },
  cancel: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  cancelText: { ...ds.textStyles.heading, color: colors.secondaryText },
  container: { gap: ds.spacing[3] },
  hint: { color: colors.secondaryText, ...ds.textStyles.bodySmall },
  issueText: { width: "100%" },
  issueError: { width: "100%", color: colors.accentBlue },
  row: { flexDirection: "row", gap: ds.spacing[2], alignItems: "center", flexWrap: "wrap" },
  date: { flexGrow: 1, padding: ds.spacing[4], borderWidth: 1, borderColor: ds.colors.border.default, borderRadius: ds.radii.lg, backgroundColor: colors.surface },
  time: { width: 100, padding: ds.spacing[4], borderWidth: 1, borderColor: ds.colors.border.default, borderRadius: ds.radii.lg, color: colors.primaryText, ...ds.textStyles.body, backgroundColor: colors.surface },
  remove: { paddingVertical: ds.spacing[4], paddingHorizontal: ds.spacing[2] },
  add: { padding: ds.spacing[4], borderWidth: 1, borderColor: colors.accentBlue, borderRadius: ds.radii.lg, alignItems: "center" },
  text: { color: colors.primaryText, ...ds.textStyles.body },
});
