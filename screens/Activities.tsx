import Icon from "../components/Icon";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { Text } from "../components/Typography";
import { vibesTheme } from "../src/theme/vibesTheme";
import { useI18n } from "../src/i18n";
import Events from "./Events";
import { LearningExplore, LearningCreateAction } from "./Learning";
import * as ds from "../src/theme/tokens";
import SegmentedControl from "../components/ui/SegmentedControl";
import { Chips, Page } from "../components/learning/LearningUI";
import MyReservations from "../components/activities/MyReservations";
import ProfessionalsExplore from "../components/sessions/ProfessionalsExplore";
import { useActivitiesFlags } from "../src/featureFlags/useActivitiesFlags";
import { teacherManagementInApp, type ActivitiesKind } from "../src/featureFlags/activities";
import { useStudentSessions } from "../src/sessions/sessionsQueries";
import { sessionNeedsStudent } from "../src/sessions/sessions";

type HubSection = "explore" | "mine";

/**
 * Tab "Clases" / "Sesiones" / "Actividades" (named after the `clases` and `sesiones` flags).
 * Explorar: classes catalog and/or professionals. Mis reservas: classes and sessions.
 */
export function ClassesTab() {
  const flags = useActivitiesFlags();
  const route = useRoute();
  const requested = (route.params as { section?: HubSection } | undefined)?.section;
  const [section, setSection] = useState<HubSection>(requested === "mine" ? "mine" : "explore");
  useEffect(() => { if (requested === "mine" || requested === "explore") setSection(requested); }, [requested]);
  const [kind, setKind] = useState<ActivitiesKind>(flags.kinds[0] ?? "classes");
  const exploreKind = flags.kinds.includes(kind) ? kind : flags.kinds[0] ?? "classes";
  const sessions = useStudentSessions();
  const pending = flags.sesiones ? (sessions.data?.sessions ?? []).filter((item) => sessionNeedsStudent(item)).length : 0;
  return (
    <ScreenContainer style={s.screen}>
      <View style={s.header}>
        <View style={s.titleRow}>
          <Text accessibilityRole="header" style={s.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{flags.label}</Text>
          {flags.clases && teacherManagementInApp ? <LearningCreateAction /> : null}
        </View>
        <SegmentedControl<HubSection>
          options={[{ key: "explore", label: "Explorar" }, { key: "mine", label: "Mis reservas", count: pending }]}
          selected={section}
          onChange={setSection}
        />
        {section === "explore" && flags.kinds.length > 1 ? (
          <Chips value={exploreKind} onChange={(value) => setKind(value as ActivitiesKind)} options={[{ value: "classes", label: "Clases" }, { value: "sessions", label: "Profesionales" }]} />
        ) : null}
      </View>
      {section === "explore" && exploreKind === "classes" ? <LearningExplore embedded /> : null}
      {section === "explore" && exploreKind === "sessions" ? <Page title="Profesionales" embedded><ProfessionalsExplore /></Page> : null}
      {section === "mine" ? <Page title="Mis reservas" embedded><MyReservations kinds={flags.kinds} /></Page> : null}
    </ScreenContainer>
  );
}

export default function Activities({ section = "events" }: { section?: "events" | "classes" }) {
  const navigation = useNavigation();
  const activeSection = section;
  const { locale } = useI18n();
  const english = locale.startsWith("en");
  return (
    <ScreenContainer style={s.screen}>
      <View style={s.header}>
        <View style={s.titleRow}><Text accessibilityRole="header" style={s.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{activeSection === "classes" ? (english ? "Classes" : "Clases") : (english ? "Events" : "Eventos")}</Text>{activeSection === "classes" ? (teacherManagementInApp ? <LearningCreateAction /> : null) : <View style={s.actions}>{([["add", "Crear evento", "CreateEvent"], ["archive-outline", "Ver eventos pasados", "PastEvents"]] as const).map(([icon, label, route]) => <TouchableOpacity key={route} accessibilityRole="button" accessibilityLabel={label} style={s.action} onPress={() => navigation.navigate(route as never)}><Icon name={icon} size={ds.iconSize.lg} color={c.primaryText} /></TouchableOpacity>)}</View>}</View>

      </View>
      {activeSection === "events" ? <Events section="event" embedded /> : <LearningExplore embedded />}
    </ScreenContainer>
  );
}
const c = vibesTheme.colors;
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  header: { paddingHorizontal: ds.spacing[5], paddingTop: ds.spacing[3], gap: ds.spacing[4] },
  titleRow: {flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:ds.spacing[2]},
  actions: { flexDirection: "row", gap: ds.spacing[2] },
  action: { width: 44, height: 44, borderRadius: ds.radii.lg, backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.subtle), alignItems: "center", justifyContent: "center" },
  title: { flex: 1, ...ds.textStyles.display, color: c.primaryText },
});
