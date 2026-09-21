import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
  selected,
  onToggle,
  onClear,
}: {
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
      <Text style={s.title}>
        {english
          ? "Choose the paths that interest you"
          : "Elegí los caminos que te interesan"}
      </Text>
      <Text style={s.hint}>
        {english
          ? "Choose several · Swipe to see more"
          : "Podés elegir varios · Deslizá para ver más"}
      </Text>
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
              accessibilityState={{ checked: active }}
              activeOpacity={0.8}
              onPress={() => (value ? onToggle(value) : onClear())}
              style={[s.card, active && s.selected]}
            >
              <View style={s.cardHeader}>
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
                  size={22}
                  color={active ? "#805D24" : "#827566"}
                />
                <Icon
                  name={active ? "checkmark-circle" : "ellipse-outline"}
                  size={18}
                  color={active ? "#805D24" : "#BEB5A8"}
                />
              </View>
              <Text style={[s.label, active && s.selectedLabel]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  section: { paddingTop: 4, paddingBottom: 8 },
  title: {
    marginHorizontal: 20,
    color: "#2B2B2B",
    fontFamily: vibesTheme.fonts.medium,
    fontSize: 20,
    lineHeight: 26,
  },
  hint: {
    marginHorizontal: 20,
    marginTop: 5,
    color: "#746B60",
    fontSize: 13,
    lineHeight: 19,
  },
  scroll: { flexGrow: 0, marginTop: 12 },
  cards: {
    paddingHorizontal: 20,
    paddingBottom: 4,
    gap: 10,
    alignItems: "stretch",
  },
  card: {
    width: 128,
    minHeight: 94,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#E7DFD2",
    backgroundColor: "#FFFDFA",
  },
  selected: { backgroundColor: "#F5E5BD", borderColor: "#BF9147" },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  label: {
    color: "#61594F",
    fontFamily: vibesTheme.fonts.medium,
    fontSize: 15,
    lineHeight: 20,
  },
  selectedLabel: { color: "#67481C" },
});
