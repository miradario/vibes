import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput } from "./Typography";
import Icon from "./Icon";
import AnimatedSheetModal from "./AnimatedSheetModal";
import { getCountryName, searchCountries } from "../src/constants/countries";
import { useI18n } from "../src/i18n";
import { vibesTheme } from "../src/theme/vibesTheme";

type Props = {
  selected: string[];
  onChange: (codes: string[]) => void;
  multiple?: boolean;
  disabled?: boolean;
};

export default function CountrySelector({ selected, onChange, multiple = false, disabled = false }: Props) {
  const { locale } = useI18n();
  const english = locale.startsWith("en");
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const countries = useMemo(() => searchCountries(search, locale), [search, locale]);
  const placeholder = english ? "Select a country" : "Seleccionar país";
  const summary = selected.length ? selected.map(code => getCountryName(code, locale)).join(", ") : placeholder;
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${english ? "Nationality" : "Nacionalidad"}: ${summary}`}
        accessibilityState={{ expanded, disabled }}
        disabled={disabled}
        onPress={() => { setExpanded(!expanded); setSearch(""); }}
        style={[styles.trigger, disabled && styles.disabled]}
      >
        <Text style={[styles.value, !selected.length && styles.placeholder]}>{summary}</Text>
        <Icon name={expanded ? "chevron-up" : "chevron-down"} size={20} color={vibesTheme.colors.primaryText} />
      </Pressable>
      <AnimatedSheetModal
        visible={expanded}
        placement="center"
        offsetY={24}
        onClose={() => setExpanded(false)}
        sheetStyle={styles.dropdown}
      >
          <View style={styles.header}>
            <Text style={styles.title}>{english ? "Nationality" : "Nacionalidad"}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={english ? "Close" : "Cerrar"}
              onPress={() => setExpanded(false)} style={styles.close}>
              <Icon name="close" size={24} color={vibesTheme.colors.primaryText} />
            </Pressable>
          </View>
          <TextInput
            accessibilityLabel={english ? "Search countries" : "Buscar países"}
            placeholder={english ? "Search country…" : "Buscar país…"}
            placeholderTextColor={vibesTheme.colors.secondaryText}
            value={search} onChangeText={setSearch} style={styles.search}
            autoCorrect={false}
          />
          <Pressable disabled={disabled} onPress={() => { onChange([]); if (!multiple) setExpanded(false); }} style={styles.option}>
            <Text style={styles.optionText}>{multiple ? (english ? "All nationalities" : "Todas las nacionalidades") : (english ? "Not specified" : "Sin especificar")}</Text>
          </Pressable>
          <ScrollView style={styles.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {countries.map(country => {
              const checked = selected.includes(country.code);
              return (
                <Pressable key={country.code} accessibilityRole={multiple ? "checkbox" : "radio"}
                  accessibilityState={{ checked, disabled }} disabled={disabled}
                  style={[styles.option, checked && styles.selected]}
                  onPress={() => {
                    onChange(multiple ? (checked ? selected.filter(code => code !== country.code) : [...selected, country.code]) : [country.code]);
                    if (!multiple) setExpanded(false);
                  }}>
                  <Text style={styles.optionText}>{country.label}</Text>
                  {checked ? <Icon name="checkmark" size={20} color={vibesTheme.colors.primaryText} /> : null}
                </Pressable>
              );
            })}
            {!countries.length ? <Text style={styles.empty}>{english ? "No countries found" : "No se encontraron países"}</Text> : null}
          </ScrollView>
          {multiple ? (
            <Pressable accessibilityRole="button" onPress={() => setExpanded(false)} style={styles.done}>
              <Text style={styles.doneText}>{english ? "Done" : "Listo"}</Text>
            </Pressable>
          ) : null}
      </AnimatedSheetModal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { gap: 8 },
  trigger: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, borderColor: vibesTheme.colors.secondaryText, backgroundColor: vibesTheme.colors.surface, padding: 14, minHeight: 48 },
  value: { flex: 1, fontSize: 16, color: vibesTheme.colors.primaryText },
  placeholder: { color: vibesTheme.colors.secondaryText },
  disabled: { opacity: 0.5 },
  dropdown: { maxWidth: 480, maxHeight: "85%", borderRadius: 24, borderWidth: 1, borderColor: vibesTheme.colors.secondaryText, padding: 16, backgroundColor: vibesTheme.colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { flex: 1, fontSize: 24, fontFamily: vibesTheme.fonts.semibold, color: vibesTheme.colors.primaryText },
  close: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  done: { marginTop: 12, padding: 12, minHeight: 44, borderRadius: 14, alignItems: "center", backgroundColor: vibesTheme.colors.accentMustard },
  doneText: { color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.bold, fontSize: 16 },
  search: { padding: 12, fontSize: 16, color: vibesTheme.colors.primaryText, borderBottomWidth: 1, borderBottomColor: vibesTheme.colors.borderSoft },
  list: { maxHeight: 320, flexShrink: 1 },
  option: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, padding: 12, borderRadius: 10 },
  optionText: { flex: 1, color: vibesTheme.colors.primaryText, fontSize: 16 },
  selected: { backgroundColor: "rgba(244, 163, 64, 0.2)" },
  empty: { padding: 12, color: vibesTheme.colors.secondaryText },
});
