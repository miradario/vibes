import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "./Typography";
import Icon from "./Icon";
import { PRACTICE_OPTIONS } from "../src/screens/Onboarding/vibesOnboardingContent";
import { useI18n } from "../src/i18n";
import { translateSpiritualPathLabel } from "../src/i18n/translations";
import { vibesTheme } from "../src/theme/vibesTheme";

const paths = PRACTICE_OPTIONS;

export default function DiscoverPathCards({
  leading,
  selected,
  onToggle,
  onClear,
  style,
}: {
  leading?: React.ReactNode;
  selected: string[];
  onToggle: (path: string) => void;
  onClear: () => void;
  style?: StyleProp<ViewStyle>;
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
    <View style={[s.section, style]}>
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
              <Text numberOfLines={1} style={[s.label, active && s.selectedLabel]}>{label}</Text>
              {active ? (
                <Icon name="checkmark" size={15} color={vibesTheme.colors.primaryText} />
              ) : null}
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
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: vibesTheme.radii.pill,
    borderWidth: 1,
    borderColor: "rgba(110, 110, 110, 0.30)",
    backgroundColor: "transparent",
  },
  selected: { backgroundColor: `${vibesTheme.colors.accentMustard}24`, borderColor: vibesTheme.colors.accentMustard },
  label: {
    flexShrink: 1,
    color: vibesTheme.colors.primaryText,
    fontFamily: vibesTheme.fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
  },
  selectedLabel: { color: vibesTheme.colors.primaryText },
});
