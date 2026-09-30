import React, { useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text, TextInput } from "./Typography";
import { normalizeEventSearch } from "../src/lib/eventFilters";
import { vibesTheme } from "../src/theme/vibesTheme";

export default function EventClassificationPicker<T extends string>({ label, options, value, onChange, filter = false, searchable = false }: {
  label: string;
  options: readonly { id: T; label: string; description?: string }[];
  value: T | null;
  onChange: (value: T | null) => void;
  filter?: boolean;
  searchable?: boolean;
}) {
  const [search, setSearch] = useState("");
  const visibleOptions = searchable
    ? options.filter((option) => normalizeEventSearch(option.label).includes(normalizeEventSearch(search)))
    : options;
  const select = (nextValue: T | null) => {
    onChange(nextValue);
    setSearch("");
  };
  const selected = options.find((item) => item.id === value);
  return (
    <View style={s.group}>
      <Text style={s.label}>{label}</Text>
      {searchable ? (
        <TextInput
          accessibilityLabel="Buscar ubicación"
          placeholder="Buscar ubicación"
          placeholderTextColor={vibesTheme.colors.secondaryText}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={s.searchInput}
        />
      ) : null}
      <ScrollView keyboardShouldPersistTaps="handled" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.options}>
        {filter ? <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: !value }} onPress={() => select(null)} style={[s.chip, !value && s.selected]}><Text style={s.text}>Todos</Text></TouchableOpacity> : null}
        {visibleOptions.map((option) => <TouchableOpacity key={option.id} accessibilityRole="button" accessibilityLabel={`${label}: ${option.label}`} accessibilityState={{ selected: value === option.id }} onPress={() => select(option.id)} style={[s.chip, value === option.id && s.selected]}><Text style={s.text}>{option.label}</Text></TouchableOpacity>)}
      </ScrollView>
      {searchable && visibleOptions.length === 0 ? <Text style={s.hint}>No hay ubicaciones que coincidan con tu búsqueda.</Text> : null}
      {!filter && selected?.description ? <Text style={s.hint}>{selected.description}</Text> : null}
    </View>
  );
}
const s = StyleSheet.create({
  searchInput: { minHeight: 48, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: vibesTheme.colors.accentBlue, backgroundColor: vibesTheme.colors.surface, color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.regular, fontSize: 16 },
  group: { marginVertical: 8, gap: 8 },
  label: { fontSize: 16, color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.bold },
  options: { gap: 8, paddingRight: 8 },
  chip: { minHeight: 44, justifyContent: "center", paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: "rgba(43,43,43,0.18)", backgroundColor: vibesTheme.colors.surface },
  selected: { backgroundColor: vibesTheme.colors.accentBlue, borderColor: vibesTheme.colors.primaryText },
  text: { color: vibesTheme.colors.primaryText, fontSize: 15 },
  hint: { color: vibesTheme.colors.secondaryText, fontSize: 14, lineHeight: 20 },
});
