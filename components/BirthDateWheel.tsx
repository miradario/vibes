import React, { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Text, TextInput } from "./Typography";
import AnimatedSheetModal from "./AnimatedSheetModal";
import { vibesTheme } from "../src/theme/vibesTheme";
import { parseBirthDate } from "../src/lib/birthDate";
import { selectBirthDateParts } from "../src/lib/birthDateSelection";
import { buttonContentColor, buttonLabel, buttonStyle } from "./ui/buttonStyles";
import * as ds from "../src/theme/tokens";

const MONTH_NAMES = {
  es: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};

function WheelColumn({ items, selected, onSelect, label, rowHeight, flex = 1 }: {
  items: string[]; selected: number; onSelect: (index: number) => void;
  label: string; rowHeight: number; flex?: number;
}) {
  const scroll = useRef<ScrollView>(null);
  const [highlighted, setHighlighted] = useState(selected);
  const highlightedRef = useRef(selected);
  useEffect(() => {
    highlightedRef.current = selected;
    setHighlighted(selected);
    scroll.current?.scrollTo({ y: selected * rowHeight, animated: false });
  }, [selected, rowHeight, items.length]);
  const settle = (offset: number) => onSelect(Math.max(0, Math.min(items.length - 1, Math.round(offset / rowHeight))));
  return <View style={{ flex, minWidth: 0 }}>
    <ScrollView ref={scroll} style={{ height: rowHeight * 5, flexGrow: 0 }}
      contentOffset={{ x: 0, y: selected * rowHeight }}
      onContentSizeChange={() => scroll.current?.scrollTo({ y: selected * rowHeight, animated: false })}
      contentContainerStyle={{ paddingVertical: rowHeight * 2 }}
      nestedScrollEnabled showsVerticalScrollIndicator={false}
      snapToInterval={rowHeight} decelerationRate="fast" bounces={false}
      scrollEventThrottle={32}
      accessible accessibilityRole="adjustable" accessibilityLabel={label}
      accessibilityValue={{ text: items[selected], min: 0, max: items.length - 1, now: selected }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={event => onSelect(Math.max(0, Math.min(items.length - 1,
        selected + (event.nativeEvent.actionName === "increment" ? 1 : -1))))}
      onScroll={event => {
        const next = Math.max(0, Math.min(items.length - 1, Math.round(event.nativeEvent.contentOffset.y / rowHeight)));
        if (next !== highlightedRef.current) { highlightedRef.current = next; setHighlighted(next); }
      }}
      onMomentumScrollEnd={event => settle(event.nativeEvent.contentOffset.y)}
      onScrollEndDrag={event => {
        if (Math.abs(event.nativeEvent.velocity?.y ?? 0) < 0.01) settle(event.nativeEvent.contentOffset.y);
      }}>
      {items.map((item, index) => <TouchableOpacity key={item} activeOpacity={0.75}
        onPress={() => onSelect(index)} style={{ height: rowHeight, alignItems: "center", justifyContent: "center" }}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}
          maxFontSizeMultiplier={1.4} style={[s.option, index === highlighted ? s.selected : s.unselected,
            { opacity: index === highlighted ? 1 : Math.abs(index - highlighted) > 1 ? 0.55 : 0.8 }]}>{item}</Text>
      </TouchableOpacity>)}
    </ScrollView>
  </View>;
}

export default function BirthDateWheel({ value, onChange, minimumDate, maximumDate, locale = "es" }: {
  value: Date | null; onChange: (date: Date) => void; minimumDate: Date; maximumDate: Date; locale?: string;
}) {
  const { fontScale } = useWindowDimensions();
  const rowHeight = Math.max(44, Math.ceil(32 * fontScale));
  const english = locale === "en";
  const selectedDate = selectBirthDateParts(
    value?.getFullYear() ?? 2000, value?.getMonth() ?? 5, value?.getDate() ?? 15, minimumDate, maximumDate
  );
  const year = selectedDate.getFullYear(), month = selectedDate.getMonth(), day = selectedDate.getDate();
  const years = useMemo(() => Array.from({ length: maximumDate.getFullYear() - minimumDate.getFullYear() + 1 },
    (_, i) => minimumDate.getFullYear() + i), [minimumDate, maximumDate]);
  const firstMonth = year === minimumDate.getFullYear() ? minimumDate.getMonth() : 0;
  const lastMonth = year === maximumDate.getFullYear() ? maximumDate.getMonth() : 11;
  const months = Array.from({ length: lastMonth - firstMonth + 1 }, (_, i) => firstMonth + i);
  const firstDay = year === minimumDate.getFullYear() && month === minimumDate.getMonth() ? minimumDate.getDate() : 1;
  const lastDay = year === maximumDate.getFullYear() && month === maximumDate.getMonth()
    ? maximumDate.getDate() : new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: lastDay - firstDay + 1 }, (_, i) => firstDay + i);
  const select = (y: number, m: number, d: number) => onChange(selectBirthDateParts(y, m, d, minimumDate, maximumDate));
  const labels = english ? ["Day", "Month", "Year"] : ["Día", "Mes", "Año"];
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState(["", "", ""]);
  const [error, setError] = useState("");
  const openManualEntry = () => {
    setFields([String(day), String(month + 1), String(year)]);
    setError(""); setEditing(true);
  };
  const apply = () => {
    const date = parseBirthDate(`${fields[2]}-${fields[1].padStart(2, "0")}-${fields[0].padStart(2, "0")}`);
    if (!date || date < minimumDate || date > maximumDate) {
      setError(english ? "Enter a valid date within the allowed range." : "Ingresá una fecha válida dentro del rango permitido.");
      return;
    }
    onChange(date); setEditing(false);
  };
  return <View style={s.container}>
    <View style={s.labels}>
      {labels.map((label, i) => <Text key={label} style={[s.label, { flex: i === 1 ? 1.65 : 1 }]}>{label}</Text>)}
    </View>
    <View style={s.wheels}>
      <View pointerEvents="none" style={[s.selectionBand, { top: rowHeight * 2, height: rowHeight }]} />
      <WheelColumn label={labels[0]} items={days.map(String)} selected={days.indexOf(day)} rowHeight={rowHeight}
        onSelect={i => select(year, month, days[i])} />
      <WheelColumn label={labels[1]} flex={1.65} rowHeight={rowHeight}
        items={months.map(m => MONTH_NAMES[english ? "en" : "es"][m])}
        selected={months.indexOf(month)} onSelect={i => select(year, months[i], day)} />
      <WheelColumn label={labels[2]} items={years.map(String)} selected={years.indexOf(year)} rowHeight={rowHeight}
        onSelect={i => select(years[i], month, day)} />
    </View>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={english ? "Edit birth date" : "Editar fecha de nacimiento"} onPress={openManualEntry} style={s.manualLink}>
      {value ? <Text style={s.date}>{`${String(value.getDate()).padStart(2, "0")}/${String(value.getMonth() + 1).padStart(2, "0")}/${value.getFullYear()}`}</Text> : null}
      <Ionicons name="pencil-outline" size={ds.iconSize.md} color={vibesTheme.colors.accentBlue} />
    </TouchableOpacity>
    <AnimatedSheetModal visible={editing} placement="center" onClose={() => setEditing(false)} sheetStyle={s.sheet}>
      <Text style={s.title}>{english ? "Your birth date" : "Tu fecha de nacimiento"}</Text>
      <View style={s.fields}>
        {labels.map((label, i) => <View key={label} style={{ flex: 1, gap: ds.spacing[2] }}>
          <Text style={s.label}>{label}</Text>
          <TextInput accessibilityLabel={label} keyboardType="number-pad" value={fields[i]}
            maxLength={i === 2 ? 4 : 2} style={s.input} selectTextOnFocus
            onChangeText={text => { setFields(previous => previous.map((field, index) => index === i ? text.replace(/\D/g, "") : field)); setError(""); }} />
        </View>)}
      </View>
      {error ? <Text accessibilityRole="alert" style={s.hint}>{error}</Text> : null}
      <TouchableOpacity accessibilityRole="button" style={s.apply} onPress={apply}>
        <Text style={s.applyText}>{english ? "Use this date" : "Usar esta fecha"}</Text>
      </TouchableOpacity>
    </AnimatedSheetModal>
  </View>;
}

const s = StyleSheet.create({
  container: { width: "100%", gap: ds.spacing[3] },
  labels: { flexDirection: "row", alignItems: "center" },
  label: { color: vibesTheme.colors.secondaryText, textAlign: "center", ...ds.textStyles.body, includeFontPadding: false },
  wheels: { position: "relative", flexDirection: "row", alignItems: "flex-start" },
  selectionBand: { position: "absolute", left: 0, right: 0, borderRadius: ds.radii.lg, backgroundColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.subtle) },
  option: { textAlign: "center", paddingHorizontal: ds.spacing[1], ...(Platform.OS === "android" ? ds.textStyles.body : ds.textStyles.title), includeFontPadding: false },
  selected: { color: vibesTheme.colors.accentBlue, ...(Platform.OS === "android" ? ds.textStyles.heading : ds.textStyles.title) },
  unselected: { color: vibesTheme.colors.secondaryText },
  manualLink: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: ds.spacing[2], marginTop: ds.spacing[2] },
  hint: { color: vibesTheme.colors.secondaryText, ...ds.textStyles.bodySmall, textAlign: "center" },
  date: { color: vibesTheme.colors.accentBlue, ...ds.textStyles.body },
  sheet: { padding: ds.spacing[6], gap: ds.spacing[5], borderRadius: ds.radii.xl, backgroundColor: vibesTheme.colors.surface },
  title: { color: vibesTheme.colors.primaryText, ...ds.textStyles.title, textAlign: "center" },
  fields: { flexDirection: "row", gap: ds.spacing[3] },
  input: { borderWidth: 1, borderColor: vibesTheme.colors.accentBlue, borderRadius: ds.radii.md, padding: ds.spacing[3], textAlign: "center", color: vibesTheme.colors.primaryText, ...ds.textStyles.title },
  apply: {
    ...buttonStyle("accent", "md"),
  },
  applyText: {
    ...buttonLabel("md", "accent"),
  },
});
