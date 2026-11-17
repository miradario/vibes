import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Text } from "../Typography";
import Icon from "../Icon";
import SectionHeader from "../ui/SectionHeader";
import { cardStyles } from "../ui/surfaceStyles";
import SessionCard from "../sessions/SessionCard";
import { useActivitiesFlags } from "../../src/featureFlags/useActivitiesFlags";
import { useStudentSessions } from "../../src/sessions/sessionsQueries";
import { useStudioStudentQuery } from "../../src/learning/studioStudentQueries";
import { homeActivities, homeActivitiesNotice } from "../../src/sessions/homeActivities";
import { SESSION_TIMEZONE } from "../../src/sessions/sessions";
import * as ds from "../../src/theme/tokens";

/**
 * Home "Próximas actividades": next class and next session, plus a highlighted notice when
 * sessions wait for the student's confirmation or payment. Renders nothing without flags or data.
 */
export default function UpcomingActivities() {
  const nav = useNavigation<any>();
  const flags = useActivitiesFlags();
  const sessions = useStudentSessions();
  const classes = useStudioStudentQuery();
  if (!flags.visible) return null;
  const data = homeActivities(flags.sesiones ? sessions.data?.sessions ?? [] : [], flags.clases ? classes.data?.bookings ?? [] : []);
  const notice = homeActivitiesNotice(data.toConfirm, data.toPay);
  if (!data.nextClass && !data.nextSession && !notice) return null;
  const openMine = () => nav.navigate("Tab", { screen: "ClassesTab", params: { section: "mine" } });
  const classWhen = (iso: string, timezone = SESSION_TIMEZONE) =>
    new Date(iso).toLocaleString("es-AR", { timeZone: timezone, weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <View style={s.section}>
      <SectionHeader title="Próximas actividades" onPress={openMine} accessibilityLabel="Ver mis reservas" />
      {notice ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${notice} Ver mis reservas`} activeOpacity={ds.opacity.pressed} onPress={openMine} style={[cardStyles.accent, cardStyles.padding, s.row]}>
          <Icon name="alert-circle-outline" size={ds.iconSize.md} color={ds.colors.icon.default} />
          <Text style={s.notice}>{notice}</Text>
          <Icon name="chevron-forward" size={ds.iconSize.md} color={ds.colors.icon.muted} />
        </TouchableOpacity>
      ) : null}
      {data.nextClass ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Próxima clase: ${data.nextClass.title}`} activeOpacity={ds.opacity.pressed} onPress={() => nav.navigate("LearningMine")} style={[cardStyles.base, cardStyles.padding, s.row]}>
          <View style={s.media}><Icon name="calendar-outline" size={ds.iconSize.md} color={ds.colors.icon.default} /></View>
          <View style={s.copy}>
            <Text style={s.eyebrow}>Próxima clase</Text>
            <Text style={s.title} numberOfLines={2}>{data.nextClass.title}</Text>
            <Text style={s.meta}>{classWhen(data.nextClass.starts_at, data.nextClass.timezone)}</Text>
          </View>
          <Icon name="chevron-forward" size={ds.iconSize.md} color={ds.colors.icon.muted} />
        </TouchableOpacity>
      ) : null}
      {data.nextSession ? (
        <View style={s.group}>
          <Text style={s.eyebrow}>Próxima sesión</Text>
          <SessionCard session={data.nextSession} onPress={() => nav.navigate("SessionDetail", { id: data.nextSession!.id })} />
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  section: { gap: ds.spacing[3], marginBottom: ds.spacing[6] },
  group: { gap: ds.spacing[2] },
  row: { flexDirection: "row", alignItems: "center", gap: ds.spacing[3] },
  media: { width: ds.componentSize.cardThumb, height: ds.componentSize.cardThumb, borderRadius: ds.radii.md, backgroundColor: ds.colors.bg.subtle, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, gap: ds.spacing[1], minWidth: 0 },
  eyebrow: { ...ds.textStyles.label, color: ds.colors.text.secondary },
  title: { ...ds.textStyles.subtitle, color: ds.colors.text.primary },
  meta: { ...ds.textStyles.bodySmall, color: ds.colors.text.secondary },
  notice: { ...ds.textStyles.body, color: ds.colors.text.primary, flex: 1 },
});
