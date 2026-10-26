import Icon from "../components/Icon";
import { useNavigation } from "@react-navigation/native";
import { useClasesEnabled } from "../src/featureFlags/useClasesEnabled";
import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { Text } from "../components/Typography";
import { vibesTheme } from "../src/theme/vibesTheme";
import { useI18n } from "../src/i18n";
import Events from "./Events";
import { LearningExplore, LearningCreateAction } from "./Learning";

export default function Activities() {
  const navigation = useNavigation();
  const [section, setSection] = useState<"events" | "classes">("events");
  const clasesEnabled = useClasesEnabled();
  const activeSection = clasesEnabled ? section : "events";
  const { locale } = useI18n();
  const english = locale.startsWith("en");
  return (
    <ScreenContainer style={s.screen}>
      <View style={s.header}>
        <View style={s.titleRow}><Text accessibilityRole="header" style={s.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{english ? "Activities" : "Actividades"}</Text>{activeSection === "classes" ? <LearningCreateAction /> : <View style={s.actions}>{([["add", "Crear evento", "CreateEvent"], ["archive-outline", "Ver eventos pasados", "PastEvents"]] as const).map(([icon, label, route]) => <TouchableOpacity key={route} accessibilityRole="button" accessibilityLabel={label} style={s.action} onPress={() => navigation.navigate(route as never)}><Icon name={icon} size={23} color={c.primaryText} /></TouchableOpacity>)}</View>}</View>
        {clasesEnabled ? <View accessibilityRole="tablist" style={s.selector}>
          {(["events", "classes"] as const).map(value => (
            <TouchableOpacity key={value} accessibilityRole="tab" accessibilityState={{ selected: activeSection === value }}
              onPress={() => setSection(value)} style={[s.tab, activeSection === value && s.selected]}>
              <Text style={[s.label, activeSection === value && s.selectedLabel]}>{value === "events" ? english ? "Events" : "Eventos" : english ? "Classes" : "Clases"}</Text>
            </TouchableOpacity>
          ))}
        </View> : null}
      </View>
      {activeSection === "events" ? <Events section="event" embedded /> : <LearningExplore embedded />}
    </ScreenContainer>
  );
}
const c = vibesTheme.colors;
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  header: { paddingHorizontal: 24, paddingTop: 12, gap: 16 },
  titleRow: {flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8},
  actions: { flexDirection: "row", gap: 6 },
  action: { width: 44, height: 44, borderRadius: 14, backgroundColor: `${c.secondaryText}0C`, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontFamily: vibesTheme.fonts.extraBold, fontSize: 34, lineHeight: 42, color: c.primaryText },
  selector: { flexDirection: "row", padding: 4, borderRadius: 999, backgroundColor: `${c.secondaryText}0C` },
  tab: { flex: 1, minHeight: 44, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  selected: { backgroundColor: c.primaryText },
  label: { fontFamily: vibesTheme.fonts.semibold, fontSize: 16, lineHeight: 22, color: c.secondaryText },
  selectedLabel: { color: c.surface },
});
