import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "./Typography";
import Icon from "./Icon";
import { PRACTICE_OPTIONS } from "../src/screens/Onboarding/vibesOnboardingContent";
import { useI18n } from "../src/i18n";
import { translateSpiritualPathLabel } from "../src/i18n/translations";
import { vibesTheme } from "../src/theme/vibesTheme";
import * as ds from "../src/theme/tokens";

const paths = PRACTICE_OPTIONS;

export default function DiscoverPathCards({
  leading,
  available,
  selected,
  onToggle,
  onClear,
  style,
}: {
  leading?: React.ReactNode;
  available?: readonly string[];
  selected: string[];
  onToggle: (path: string) => void;
  onClear: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { locale } = useI18n();
  const english = locale === "en";
  const options = [
    { value: "", label: english ? "All" : "Todos" },
    ...paths.filter(path => !available || available.includes(path)).map((path) => ({
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
                <Icon name="checkmark" size={ds.iconSize.sm} color={vibesTheme.colors.primaryText} />
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
    gap: ds.spacing[2],
    paddingLeft: ds.spacing[4],
    paddingTop: ds.spacing[1],
    paddingBottom: ds.spacing[2],
  },
  scroll: { flex: 1, minWidth: 0 },
  cards: {
    paddingRight: ds.spacing[4],
    gap: ds.spacing[2],
    alignItems: "stretch",
  },
  card: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[2],
    paddingHorizontal: ds.spacing[3],
    paddingVertical: ds.spacing[2],
    borderRadius: vibesTheme.radii.pill,
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.scrim),
    backgroundColor: "transparent",
  },
  selected: { backgroundColor: ds.colors.bg.selected, borderColor: vibesTheme.colors.accentMustard },
  label: {
    flexShrink: 1,
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.label,
  },
  selectedLabel: { color: vibesTheme.colors.primaryText },
});
