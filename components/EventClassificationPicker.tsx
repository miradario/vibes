import React, { useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { Text, TextInput } from "./Typography";
import { normalizeEventSearch } from "../src/lib/eventFilters";
import { vibesTheme } from "../src/theme/vibesTheme";
import { chipHitSlop, chipStyles } from "./ui/chipStyles";
import * as ds from "../src/theme/tokens";

export default function EventClassificationPicker<T extends string>({ label, options, value, onChange, filter = false, searchable = false, style, labelStyle }: {
  label: string;
  options: readonly { id: T; label: string; description?: string }[];
  value: T | null;
  onChange: (value: T | null) => void;
  filter?: boolean;
  searchable?: boolean;
  /** Overrides so a form can match its own section rhythm (filters keep the defaults). */
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
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
    <View style={[s.group, style]}>
      <Text style={[s.label, labelStyle]}>{label}</Text>
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
        {filter ? <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: !value }} onPress={() => select(null)} hitSlop={chipHitSlop} style={[chipStyles.base, !value && chipStyles.selected]}><Text style={[chipStyles.label, !value && chipStyles.labelSelected]}>Todos</Text></TouchableOpacity> : null}
        {visibleOptions.map((option) => <TouchableOpacity key={option.id} accessibilityRole="button" accessibilityLabel={`${label}: ${option.label}`} accessibilityState={{ selected: value === option.id }} onPress={() => select(option.id)} hitSlop={chipHitSlop} style={[chipStyles.base, value === option.id && chipStyles.selected]}><Text style={[chipStyles.label, value === option.id && chipStyles.labelSelected]}>{option.label}</Text></TouchableOpacity>)}
      </ScrollView>
      {searchable && visibleOptions.length === 0 ? <Text style={s.hint}>No hay ubicaciones que coincidan con tu búsqueda.</Text> : null}
      {!filter && selected?.description ? <Text style={s.hint}>{selected.description}</Text> : null}
    </View>
  );
}
const s = StyleSheet.create({
  searchInput: { minHeight: 48, paddingHorizontal: ds.spacing[4], borderRadius: ds.radii.md, borderWidth: 1, borderColor: vibesTheme.colors.accentBlue, backgroundColor: vibesTheme.colors.surface, color: vibesTheme.colors.primaryText, ...ds.textStyles.body },
  group: { marginVertical: ds.spacing[2], gap: ds.spacing[2] },
  label: { ...ds.textStyles.subtitle, color: vibesTheme.colors.primaryText },
  options: { gap: ds.spacing[2], paddingRight: ds.spacing[2] },
  selected: { backgroundColor: vibesTheme.colors.primaryText, borderColor: vibesTheme.colors.primaryText },
  hint: { color: vibesTheme.colors.secondaryText, ...ds.textStyles.bodySmall },
});
