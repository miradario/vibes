import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Text } from "./Typography";
import Icon from "./Icon";
import {
  useMyEventGroupsQuery,
  useChallengeCheckinsQuery,
  useChallengeParticipantQuery,
  type EventFeedItem,
} from "../src/queries/events.queries";
import { getChallengeTimeline } from "../src/lib/challengeTimeline";
import {
  getHomeChallengeProgress,
  getUpcomingHomeEvents,
} from "../src/lib/homeOverview";

function ChallengeStatus({
  event,
  userId,
}: {
  event: EventFeedItem;
  userId?: string;
}) {
  const navigation = useNavigation<any>();
  const checkins = useChallengeCheckinsQuery(event.id, userId);
  const participant = useChallengeParticipantQuery(event.id, userId);
  useFocusEffect(
    useCallback(() => {
      void checkins.refetch();
      void participant.refetch();
    }, [checkins.refetch, participant.refetch])
  );
  const timeline = getChallengeTimeline(event.startsAt, event.durationDays);
  const progress = checkins.isSuccess
    ? getHomeChallengeProgress(
        checkins.data,
        event.startsAt,
        timeline.totalDays
      )
    : null;
  const status =
    timeline.status === "upcoming"
      ? `Empieza en ${timeline.startsInDays} día${
          timeline.startsInDays === 1 ? "" : "s"
        }`
      : timeline.status === "finished"
      ? progress?.percent === 100
        ? "Completado"
        : "Finalizado"
      : `Día ${timeline.currentDay} de ${timeline.totalDays}`;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={() => navigation.navigate("ChallengeDetailScreen", { event })}
      style={s.row}
      activeOpacity={0.8}
    >
      <Icon name="trophy-outline" size={24} color="#936721" />
      <View style={s.copy}>
        <Text style={s.title}>{event.title}</Text>
        <Text style={s.meta}>{status}</Text>
        {checkins.isError || participant.isError ? (
          <Text style={s.meta}>
            No pudimos actualizar tu progreso. Tocá para ver el desafío.
          </Text>
        ) : checkins.isLoading ? (
          <ActivityIndicator />
        ) : (
          progress && (
            <>
              <View
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: progress.percent }}
                style={s.track}
              >
                <View style={[s.fill, { width: `${progress.percent}%` }]} />
              </View>
              <Text style={s.meta}>
                {progress.completed} de {progress.total} días completados ·{" "}
                {progress.percent}%
              </Text>
            </>
          )
        )}
        {timeline.status === "active" &&
          participant.isSuccess &&
          participant.data && (
            <Text style={[s.action, participant.data.checkedInToday && s.done]}>
              {participant.data.checkedInToday
                ? "Hoy ya completaste tu práctica ✓"
                : "Tu práctica de hoy está pendiente"}
            </Text>
          )}
      </View>
      <Icon name="chevron-forward" size={18} color="#81766A" />
    </TouchableOpacity>
  );
}

export default function HomeOverview({ userId }: { userId?: string }) {
  const navigation = useNavigation<any>();
  const groups = useMyEventGroupsQuery(userId);
  const [now, setNow] = useState(Date.now());
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
      void groups.refetch();
      const timer = setInterval(() => setNow(Date.now()), 60000);
      return () => clearInterval(timer);
    }, [groups.refetch])
  );
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setNow(Date.now());
        void groups.refetch();
      }
    });
    return () => sub.remove();
  }, [groups.refetch]);
  const events = (groups.data ?? []).map((group) => group.event);
  const upcoming = getUpcomingHomeEvents(events, now);
  const rank = { active: 0, upcoming: 1, finished: 2 };
  const challenges = events
    .filter((event) => event.type === "challenge")
    .sort((a, b) => {
      const left = getChallengeTimeline(a.startsAt, a.durationDays).status;
      const right = getChallengeTimeline(b.startsAt, b.durationDays).status;
      const delta = new Date(a.startsAt ?? 0).getTime() - new Date(b.startsAt ?? 0).getTime();
      return rank[left] - rank[right] || (left === "finished" ? -delta : delta);
    })
    .slice(0, 3);
  const openList = (challenge = false) =>
    navigation.navigate("Tab", {
      screen: challenge ? "Flow" : "EventsTab",
      params: { section: challenge ? "challenge" : "event" },
    });
  const dateLabel = (date: string) => {
    const value = new Date(date),
      today = new Date(now),
      tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const day =
      value.toDateString() === today.toDateString()
        ? "Hoy"
        : value.toDateString() === tomorrow.toDateString()
        ? "Mañana"
        : value.toLocaleDateString("es-AR", {
            weekday: "short",
            day: "numeric",
            month: "short",
          });
    return `${day} · ${value.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };
  if (groups.isLoading)
    return <ActivityIndicator accessibilityLabel="Cargando tu agenda" />;
  if (groups.isError)
    return (
      <TouchableOpacity
        accessibilityRole="button"
        style={s.card}
        onPress={() => void groups.refetch()}
      >
        <Text>No pudimos cargar tu agenda. Tocá para reintentar.</Text>
      </TouchableOpacity>
    );
  return (
    <>
      <View style={s.card}>
        <View style={s.heading}>
          <Text style={s.section}>TUS PRÓXIMOS EVENTOS</Text>
          <TouchableOpacity
            style={s.link}
            onPress={() => openList()}
            accessibilityRole="button"
          >
            <Text style={s.action}>Ver todos</Text>
          </TouchableOpacity>
        </View>
        {upcoming.map((event) => (
          <TouchableOpacity
            accessibilityRole="button"
            key={event.id}
            style={s.row}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("EventDetail", { event })}
          >
            <Icon name="calendar-outline" size={25} color="#936721" />
            <View style={s.copy}>
              <Text style={s.action}>{dateLabel(event.startsAt!)}</Text>
              <Text style={s.title}>{event.title}</Text>
              <Text style={s.meta}>
                {event.modality === "online"
                  ? "Online"
                  : event.location || "Ver detalles del encuentro"}
              </Text>
            </View>
            <Icon name="chevron-forward" size={18} color="#81766A" />
          </TouchableOpacity>
        ))}
        {!upcoming.length && (
          <TouchableOpacity
            style={s.row}
            accessibilityRole="button"
            onPress={() => openList()}
          >
            <Text style={s.meta}>
              No tenés próximos eventos en tu agenda. Descubrí encuentros para
              sumarte.
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={s.card}>
        <View style={s.heading}>
          <Text style={s.section}>TUS DESAFÍOS</Text>
          <TouchableOpacity
            style={s.link}
            onPress={() => openList(true)}
            accessibilityRole="button"
          >
            <Text style={s.action}>Ver todos</Text>
          </TouchableOpacity>
        </View>
        {challenges.map((event) => (
          <ChallengeStatus key={event.id} event={event} userId={userId} />
        ))}
        {!challenges.length && (
          <TouchableOpacity
            style={s.row}
            accessibilityRole="button"
            onPress={() => openList(true)}
          >
            <Text style={s.meta}>
              Elegí un desafío y empezá a construir tu práctica.
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );
}
const s = StyleSheet.create({
  card: {
    backgroundColor: "#FCF8F0",
    borderWidth: 1,
    borderColor: "#EDE2CF",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingBottom: 8,
    marginBottom: 16,
  },
  heading: { flexDirection: "row", alignItems: "center", gap: 8 },
  section: { flex: 1, fontSize: 12, color: "#75664F", letterSpacing: 0.8 },
  link: { minHeight: 48, justifyContent: "center", paddingHorizontal: 4 },
  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#DDD5C9",
  },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 18, lineHeight: 24, color: "#2B2B2B", marginVertical: 3 },
  meta: { fontSize: 14, lineHeight: 20, color: "#71685B" },
  action: { fontSize: 14, lineHeight: 20, color: "#8B6327" },
  done: { color: "#4D7264" },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E6DED0",
    marginVertical: 8,
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: "#C49849", borderRadius: 3 },
});
