import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { Text } from "../components/Typography";
import { vibesTheme } from "../src/theme/vibesTheme";
import { useI18n } from "../src/i18n";
import Events from "./Events";
import { LearningExplore, LearningCreateAction } from "./Learning";

export default function Activities() {
  const [section, setSection] = useState<"events" | "classes">("events");
  const { locale } = useI18n();
  const english = locale.startsWith("en");
  return (
    <ScreenContainer style={s.screen}>
      <View style={s.header}>
        <View style={s.titleRow}><Text accessibilityRole="header" style={s.title}>{english ? "Activities" : "Actividades"}</Text>{section === "classes" && <LearningCreateAction />}</View>
        <View accessibilityRole="tablist" style={s.selector}>
          {(["events", "classes"] as const).map(value => (
            <TouchableOpacity key={value} accessibilityRole="tab" accessibilityState={{ selected: section === value }}
              onPress={() => setSection(value)} style={[s.tab, section === value && s.selected]}>
              <Text style={[s.label, section === value && s.selectedLabel]}>{value === "events" ? english ? "Events" : "Eventos" : english ? "Classes" : "Clases"}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {section === "events" ? <Events section="event" embedded /> : <LearningExplore embedded />}
    </ScreenContainer>
  );
}
const c = vibesTheme.colors;
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  header: { paddingHorizontal: 24, paddingTop: 12, gap: 16 },
  titleRow: {flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8},
  title: { fontFamily: vibesTheme.fonts.extraBold, fontSize: 34, lineHeight: 42, color: c.primaryText },
  selector: { flexDirection: "row", padding: 4, borderRadius: 999, backgroundColor: `${c.secondaryText}0C` },
  tab: { flex: 1, minHeight: 44, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  selected: { backgroundColor: c.primaryText },
  label: { fontFamily: vibesTheme.fonts.semibold, fontSize: 16, lineHeight: 22, color: c.secondaryText },
  selectedLabel: { color: c.surface },
});
