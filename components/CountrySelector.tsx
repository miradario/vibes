import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput } from "./Typography";
import Icon from "./Icon";
import AnimatedSheetModal from "./AnimatedSheetModal";
import { getCountryName, searchCountries } from "../src/constants/countries";
import { useI18n } from "../src/i18n";
import { vibesTheme } from "../src/theme/vibesTheme";
import ListItem from "./ui/ListItem";
import { buttonLabel, buttonStyle } from "./ui/buttonStyles";
import * as ds from "../src/theme/tokens";

type Props = {
  selected: string[];
  onChange: (codes: string[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  /** Sheet title / a11y label. Defaults to "Nationality". */
  title?: string;
  /** Text shown when nothing in the list is selected (e.g. a legacy free-text value). */
  fallbackLabel?: string;
};

export default function CountrySelector({ selected, onChange, multiple = false, disabled = false, title, fallbackLabel }: Props) {
  const { locale } = useI18n();
  const english = locale.startsWith("en");
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const countries = useMemo(() => searchCountries(search, locale), [search, locale]);
  const placeholder = english ? "Select a country" : "Seleccionar país";
  const heading = title ?? (english ? "Nationality" : "Nacionalidad");
  const fallback = fallbackLabel?.trim();
  const summary = selected.length ? selected.map(code => getCountryName(code, locale)).join(", ") : (fallback || placeholder);
  const showingPlaceholder = !selected.length && !fallback;
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${heading}: ${summary}`}
        accessibilityState={{ expanded, disabled }}
        disabled={disabled}
        onPress={() => { setExpanded(!expanded); setSearch(""); }}
        style={[styles.trigger, disabled && styles.disabled]}
      >
        <Text style={[styles.value, showingPlaceholder && styles.placeholder]}>{summary}</Text>
        <Icon name={expanded ? "chevron-up" : "chevron-down"} size={ds.iconSize.md} color={vibesTheme.colors.primaryText} />
      </Pressable>
      <AnimatedSheetModal
        visible={expanded}
        placement="center"
        offsetY={24}
        onClose={() => setExpanded(false)}
        sheetStyle={styles.dropdown}
      >
          <View style={styles.header}>
            <Text style={styles.title}>{heading}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={english ? "Close" : "Cerrar"}
              onPress={() => setExpanded(false)} style={styles.close}>
              <Icon name="close" size={ds.iconSize.lg} color={vibesTheme.colors.primaryText} />
            </Pressable>
          </View>
          <TextInput
            accessibilityLabel={english ? "Search countries" : "Buscar países"}
            placeholder={english ? "Search country…" : "Buscar país…"}
            placeholderTextColor={vibesTheme.colors.secondaryText}
            value={search} onChangeText={setSearch} style={styles.search}
            autoCorrect={false}
          />
          <ListItem disabled={disabled} onPress={() => { onChange([]); if (!multiple) setExpanded(false); }}
            title={multiple ? (english ? "All nationalities" : "Todas las nacionalidades") : (english ? "Not specified" : "Sin especificar")} />
          <ScrollView style={styles.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {countries.map(country => {
              const checked = selected.includes(country.code);
              return (
                <ListItem key={country.code} selectable multiple={multiple} selected={checked} disabled={disabled}
                  title={country.label} trailing={{ type: "check" }}
                  onPress={() => {
                    onChange(multiple ? (checked ? selected.filter(code => code !== country.code) : [...selected, country.code]) : [country.code]);
                    if (!multiple) setExpanded(false);
                  }} />
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
  container: { gap: ds.spacing[2] },
  trigger: { flexDirection: "row", alignItems: "center", gap: ds.spacing[3], borderRadius: ds.radii.lg, borderWidth: 1, borderColor: vibesTheme.colors.secondaryText, backgroundColor: vibesTheme.colors.surface, padding: ds.spacing[4], minHeight: 48 },
  value: { flex: 1, ...ds.textStyles.body, color: vibesTheme.colors.primaryText },
  placeholder: { color: vibesTheme.colors.secondaryText },
  disabled: { opacity: 0.5 },
  dropdown: { maxWidth: 480, maxHeight: "85%", borderRadius: ds.radii.xl, borderWidth: 1, borderColor: vibesTheme.colors.secondaryText, padding: ds.spacing[4], backgroundColor: vibesTheme.colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: ds.spacing[3] },
  title: { flex: 1, ...ds.textStyles.title, color: vibesTheme.colors.primaryText },
  close: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  done: { ...buttonStyle("accent", "md"), marginTop: ds.spacing[3] },
  doneText: { ...buttonLabel("md", "accent") },
  search: { padding: ds.spacing[3], ...ds.textStyles.body, color: vibesTheme.colors.primaryText, borderBottomWidth: 1, borderBottomColor: vibesTheme.colors.borderSoft },
  list: { maxHeight: 320, flexShrink: 1 },
  empty: { padding: ds.spacing[3], color: vibesTheme.colors.secondaryText },
});
