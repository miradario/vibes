import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "./Typography";
import Icon from "./Icon";
import { SPIRITUAL_PATH_OPTIONS } from "../src/lib/spiritualPaths";
import { useI18n } from "../src/i18n";
import { translateSpiritualPathLabel } from "../src/i18n/translations";
import { vibesTheme } from "../src/theme/vibesTheme";

const featuredPaths = ["El Arte de Vivir", "Tantra"];
const paths = [
  ...featuredPaths,
  ...SPIRITUAL_PATH_OPTIONS.filter((path) => !featuredPaths.includes(path)),
];

export default function DiscoverPathCards({
  leading,
  selected,
  onToggle,
  onClear,
}: {
  leading?: React.ReactNode;
  selected: string[];
  onToggle: (path: string) => void;
  onClear: () => void;
}) {
  const { locale } = useI18n();
  const english = locale === "en";
  const options = [
    { value: "", label: english ? "All" : "Todos" },
    ...paths.map((path) => ({
      value: path,
      label: translateSpiritualPathLabel(locale, path),
    })),
  ];
  return (
    <View style={s.section}>
      {leading}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.scroll}
        contentContainerStyle={s.cards}
      >
        {options.map(({ value, label }) => {
          const active = value
            ? selected.includes(value)
            : selected.length === 0;
          return (
            <TouchableOpacity
              key={value || "all"}
              accessibilityRole="checkbox"
              accessibilityLabel={label}
              accessibilityHint={english ? "Choose several · Swipe to see more" : "Podés elegir varios · Deslizá para ver más"}
              accessibilityState={{ checked: active }}
              activeOpacity={0.8}
              onPress={() => (value ? onToggle(value) : onClear())}
              style={[s.card, active && s.selected]}
            >
              <Icon
                name={
                  value === "El Arte de Vivir"
                    ? "sunny-outline"
                    : value === "Tantra"
                    ? "flower-outline"
                    : value
                    ? "leaf-outline"
                    : "grid-outline"
                }
                size={18}
                color={active ? "#805D24" : "#827566"}
              />
              <Text style={[s.label, active && s.selectedLabel]}>{label}</Text>
              <Icon
                name={active ? "checkmark-circle" : "ellipse-outline"}
                size={18}
                color={active ? "#805D24" : "#BEB5A8"}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  section: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  scroll: { flex: 1, minWidth: 0 },
  cards: {
    paddingRight: 16,
    gap: 8,
    alignItems: "stretch",
  },
  card: {
    maxWidth: 280,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E7DFD2",
    backgroundColor: "#FFFDFA",
  },
  selected: { backgroundColor: "#F5E5BD", borderColor: "#BF9147" },
  label: {
    flexShrink: 1,
    color: "#61594F",
    fontFamily: vibesTheme.fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  selectedLabel: { color: "#67481C" },
});
