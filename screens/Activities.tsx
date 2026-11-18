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
import { Page } from "../components/learning/LearningUI";
import MyReservationsSheet from "../components/activities/MyReservationsSheet";
import { badgeStyles } from "../components/ui/surfaceStyles";
import ProfessionalsExplore from "../components/sessions/ProfessionalsExplore";
import { useActivitiesFlags } from "../src/featureFlags/useActivitiesFlags";
import { activitiesSwitcherOptions, opensReservations, teacherManagementInApp, type ActivitiesKind } from "../src/featureFlags/activities";
import { useStudentSessions } from "../src/sessions/sessionsQueries";
import { sessionNeedsStudent } from "../src/sessions/sessions";

/**
 * Tab "Clases" / "Sesiones" / "Actividades" (named after the `clases` and `sesiones` flags).
 * With both flags the main SegmentedControl switches Clases / Sesiones; with one, no switcher.
 * Mis reservas (classes and sessions) opens as a tall sheet from the header button; the
 * `section: "mine"` param (Home, SessionDetail) opens it too.
 */
export function ClassesTab() {
  const flags = useActivitiesFlags();
  const route = useRoute();
  const navigation = useNavigation<any>();
  const requestedMine = opensReservations(route.params);
  const [reservationsOpen, setReservationsOpen] = useState(requestedMine);
  useEffect(() => {
    if (!requestedMine) return;
    setReservationsOpen(true);
    // Clear the param so the next "Ver mis reservas" opens the sheet again.
    navigation.setParams({ section: undefined });
  }, [requestedMine, navigation]);
  const [kind, setKind] = useState<ActivitiesKind>(flags.kinds[0] ?? "classes");
  const activeKind = flags.kinds.includes(kind) ? kind : flags.kinds[0] ?? "classes";
  const switcher = activitiesSwitcherOptions(flags.kinds);
  const sessions = useStudentSessions();
  const pending = flags.sesiones ? (sessions.data?.sessions ?? []).filter((item) => sessionNeedsStudent(item)).length : 0;
  const reservationsLabel = pending ? `Mis reservas, ${pending} ${pending === 1 ? "pendiente" : "pendientes"}` : "Mis reservas";
  return (
    <ScreenContainer style={s.screen}>
      <View style={s.header}>
        <View style={s.titleRow}>
          <Text accessibilityRole="header" style={s.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{flags.label}</Text>
          <View style={s.actions}>
            {flags.clases && teacherManagementInApp ? <LearningCreateAction /> : null}
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={reservationsLabel} onPress={() => setReservationsOpen(true)} style={s.action}>
              <Icon name="ticket-outline" size={ds.iconSize.lg} color={c.primaryText} />
              {pending ? <View style={s.badge}><Text style={badgeStyles.countText}>{pending}</Text></View> : null}
            </TouchableOpacity>
          </View>
        </View>
        {switcher.length ? <SegmentedControl<ActivitiesKind> options={switcher} selected={activeKind} onChange={setKind} /> : null}
      </View>
      {activeKind === "classes" ? <LearningExplore embedded /> : <Page title="Sesiones" embedded><ProfessionalsExplore /></Page>}
      <MyReservationsSheet visible={reservationsOpen} onClose={() => setReservationsOpen(false)} kinds={flags.kinds} />
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
  badge: { ...badgeStyles.count, ...badgeStyles.outlined, position: "absolute", top: -ds.spacing[1], right: -ds.spacing[1] },
  title: { flex: 1, ...ds.textStyles.display, color: c.primaryText },
});
