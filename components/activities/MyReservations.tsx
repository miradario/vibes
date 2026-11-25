import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Text } from "../Typography";
import Icon from "../Icon";
import SectionHeader from "../ui/SectionHeader";
import { cardStyles } from "../ui/surfaceStyles";
import { CardRowSkeleton, SkeletonGroup } from "../ui/Skeleton";
import { Button, Empty, ui } from "../learning/LearningUI";
import SessionCard from "../sessions/SessionCard";
import { useStudentSessions } from "../../src/sessions/sessionsQueries";
import { sessionError, sessionNeedsStudent, upcomingSessions } from "../../src/sessions/sessions";
import { useStudioStudentQuery } from "../../src/learning/studioStudentQueries";
import { studioBookingWhen, studioStudentError, upcomingStudioBookings, STUDIO_BOOKING_STATUS_LABEL } from "../../src/learning/studioStudent";
import type { ActivitiesKind } from "../../src/featureFlags/activities";
import * as ds from "../../src/theme/tokens";

/** Geometría de SessionCard (título, facilitador, fecha + pastilla) y de la fila de clase (título, fecha, estado). */
const SESSION_LINES = [{ text: "subtitle", width: "70%" }, { text: "bodySmall", width: "50%" }, { text: "bodySmall", width: "65%" }] as const;
const CLASS_LINES = [{ text: "subtitle", width: "70%" }, { text: "bodySmall", width: "65%" }, { text: "bodySmall", width: "35%" }] as const;

type Go = (route: string, params?: Record<string, unknown>) => void;

/**
 * Mis reservas: upcoming sessions (needs-action first) and class bookings of the portal agenda.
 * `navigate` lets the sheet close itself before opening a detail.
 * Packs / inscripciones anteriores stay registered but are not linked from here.
 */
export default function MyReservations({ kinds, navigate }: { kinds: ActivitiesKind[]; navigate?: Go }) {
  const nav = useNavigation<any>();
  const go: Go = navigate ?? ((route, params) => nav.navigate(route, params));
  return (
    <View style={s.root}>
      {kinds.includes("sessions") ? <SessionsSection onOpen={(id) => go("SessionDetail", { id })} onHistory={() => go("SessionHistory")} /> : null}
      {kinds.includes("classes") ? <ClassesSection go={go} /> : null}
    </View>
  );
}

function SessionsSection({ onOpen, onHistory }: { onOpen: (id: string) => void; onHistory: () => void }) {
  const query = useStudentSessions();
  const sessions = upcomingSessions(query.data?.sessions ?? []);
  const ordered = [...sessions.filter((item) => sessionNeedsStudent(item)), ...sessions.filter((item) => !sessionNeedsStudent(item))];
  return (
    <View style={s.section}>
      <SectionHeader title="Sesiones" action={{ icon: "time-outline", label: "Ver historial", onPress: onHistory, accessibilityLabel: "Ver historial de sesiones" }} />
      {query.isLoading ? <SkeletonGroup label="Cargando tus sesiones">{[0, 1].map((index) => <CardRowSkeleton key={index} chevron pill lines={SESSION_LINES} />)}</SkeletonGroup> : null}
      {query.isError ? <View style={[ui.notice, ui.error]}><Text accessibilityRole="alert" style={ui.body}>{sessionError(query.error)}</Text><Button secondary label="Reintentar" onPress={() => void query.refetch()} /></View> : null}
      {ordered.map((session) => <SessionCard key={session.id} session={session} onPress={() => onOpen(session.id)} />)}
      {query.data && !ordered.length ? <Empty text="No tenés sesiones próximas. Elegí un facilitador en Sesiones." /> : null}
    </View>
  );
}

function ClassesSection({ go }: { go: Go }) {
  const query = useStudioStudentQuery();
  const bookings = upcomingStudioBookings(query.data?.bookings ?? []);
  return (
    <View style={s.section}>
      <SectionHeader title="Clases" action={{ icon: "time-outline", label: "Ver historial", onPress: () => go("ClassHistory"), accessibilityLabel: "Ver historial de clases" }} />
      {query.isLoading ? <SkeletonGroup label="Cargando tus clases">{[0, 1].map((index) => <CardRowSkeleton key={index} chevron lines={CLASS_LINES} />)}</SkeletonGroup> : null}
      {query.isError ? <View style={[ui.notice, ui.error]}><Text accessibilityRole="alert" style={ui.body}>{studioStudentError(query.error)}</Text><Button secondary label="Reintentar" onPress={() => void query.refetch()} /></View> : null}
      {bookings.map((booking) => (
        <TouchableOpacity key={booking.id} accessibilityRole="button" accessibilityLabel={`Ver ${booking.title}`} activeOpacity={ds.opacity.pressed}
          onPress={() => go("ClassBookingDetail", { id: booking.id })} style={[cardStyles.base, cardStyles.padding, s.row]}>
          <View style={s.copy}>
            <Text style={s.title}>{booking.title}</Text>
            <Text style={s.meta}>{studioBookingWhen(booking)}</Text>
            <Text style={s.meta}>{STUDIO_BOOKING_STATUS_LABEL[booking.status]}</Text>
          </View>
          <Icon name="chevron-forward" size={ds.iconSize.md} color={ds.colors.icon.muted} />
        </TouchableOpacity>
      ))}
      {query.data && !bookings.length ? <Empty text="No tenés clases reservadas. Elegí un encuentro en Clases." /> : null}
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
