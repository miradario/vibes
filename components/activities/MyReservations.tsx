import React from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Text } from "../Typography";
import Icon from "../Icon";
import SectionHeader from "../ui/SectionHeader";
import { cardStyles } from "../ui/surfaceStyles";
import { Button, Empty, ui } from "../learning/LearningUI";
import SessionCard from "../sessions/SessionCard";
import { useStudentSessions } from "../../src/sessions/sessionsQueries";
import { sessionError, sessionNeedsStudent, upcomingSessions, SESSION_TIMEZONE } from "../../src/sessions/sessions";
import { useStudioStudentQuery } from "../../src/learning/studioStudentQueries";
import { studioStudentError } from "../../src/learning/studioStudent";
import type { ActivitiesKind } from "../../src/featureFlags/activities";
import * as ds from "../../src/theme/tokens";

type Go = (route: string, params?: Record<string, unknown>) => void;

/**
 * Mis reservas: upcoming sessions (needs-action first) and class bookings of the portal agenda.
 * `navigate` lets the sheet close itself before opening a detail.
 */
export default function MyReservations({ kinds, navigate }: { kinds: ActivitiesKind[]; navigate?: Go }) {
  const nav = useNavigation<any>();
  const go: Go = navigate ?? ((route, params) => nav.navigate(route, params));
  return (
    <View style={s.root}>
      {kinds.includes("sessions") ? <SessionsSection onOpen={(id) => go("SessionDetail", { id })} /> : null}
      {kinds.includes("classes") ? <ClassesSection go={go} /> : null}
    </View>
  );
}

function SessionsSection({ onOpen }: { onOpen: (id: string) => void }) {
  const query = useStudentSessions();
  const sessions = upcomingSessions(query.data?.sessions ?? []);
  const ordered = [...sessions.filter((item) => sessionNeedsStudent(item)), ...sessions.filter((item) => !sessionNeedsStudent(item))];
  return (
    <View style={s.section}>
      <SectionHeader title="Sesiones" />
      {query.isLoading ? <View style={ui.notice}><ActivityIndicator color={ds.colors.base.blue} /><Text style={ui.body}>Cargando tus sesiones…</Text></View> : null}
      {query.isError ? <View style={[ui.notice, ui.error]}><Text accessibilityRole="alert" style={ui.body}>{sessionError(query.error)}</Text><Button secondary label="Reintentar" onPress={() => void query.refetch()} /></View> : null}
      {ordered.map((session) => <SessionCard key={session.id} session={session} onPress={() => onOpen(session.id)} />)}
      {query.data && !ordered.length ? <Empty text="No tenés sesiones próximas. Elegí un profesional en Sesiones." /> : null}
    </View>
  );
}

function ClassesSection({ go }: { go: Go }) {
  const query = useStudioStudentQuery();
  const now = Date.now();
  const bookings = (query.data?.bookings ?? [])
    .filter((item) => item.status !== "cancelled" && Date.parse(item.ends_at) > now)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const label = (iso: string, timezone = SESSION_TIMEZONE) => new Date(iso).toLocaleString("es-AR", { timeZone: timezone, weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <View style={s.section}>
      <SectionHeader title="Clases" onPress={() => go("LearningMine")} accessibilityLabel="Ver agenda, packs y avisos de clases" />
      {query.isLoading ? <View style={ui.notice}><ActivityIndicator color={ds.colors.base.blue} /><Text style={ui.body}>Cargando tus clases…</Text></View> : null}
      {query.isError ? <View style={[ui.notice, ui.error]}><Text accessibilityRole="alert" style={ui.body}>{studioStudentError(query.error)}</Text><Button secondary label="Reintentar" onPress={() => void query.refetch()} /></View> : null}
      {bookings.map((booking) => (
        <TouchableOpacity key={booking.id} accessibilityRole="button" accessibilityLabel={`Ver ${booking.title}`} activeOpacity={ds.opacity.pressed}
          onPress={() => go("LearningMine")} style={[cardStyles.base, cardStyles.padding, s.row]}>
          <View style={s.copy}>
            <Text style={s.title}>{booking.title}</Text>
            <Text style={s.meta}>{label(booking.starts_at, booking.timezone)}</Text>
            <Text style={s.meta}>{booking.status === "waitlist" ? "Lista de espera" : "Confirmada"}</Text>
          </View>
          <Icon name="chevron-forward" size={ds.iconSize.md} color={ds.colors.icon.muted} />
        </TouchableOpacity>
      ))}
      {query.data && !bookings.length ? <Empty text="No tenés clases reservadas. Elegí un encuentro en Clases." /> : null}
      <Button secondary label="Packs, historial y avisos" onPress={() => go("LearningMine")} />
      <Button secondary label="Inscripciones anteriores" onPress={() => go("LearningLegacyMine")} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: ds.spacing[6] },
  section: { gap: ds.spacing[3] },
  row: { flexDirection: "row", alignItems: "center", gap: ds.spacing[3] },
  copy: { flex: 1, gap: ds.spacing[1], minWidth: 0 },
  title: { ...ds.textStyles.subtitle, color: ds.colors.text.primary },
  meta: { ...ds.textStyles.bodySmall, color: ds.colors.text.secondary },
});
