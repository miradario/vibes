import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
  AppState,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Text } from "./Typography";
import Icon from "./Icon";
import AvatarGroup from "./AvatarGroup";
import VibesLoader from "./VibesLoader";
import {
  useMyEventGroupsQuery,
  useEventsFeedQuery,
  useChallengeCheckinsQuery,
  useChallengeParticipantQuery,
  type EventFeedItem,
} from "../src/queries/events.queries";
import { getChallengeTimeline } from "../src/lib/challengeTimeline";
import {
  getHomeChallengeProgress,
  getUpcomingHomeEvents,
} from "../src/lib/homeOverview";
import { vibesTheme } from "../src/theme/vibesTheme";

const ACCENT = vibesTheme.colors.accentMustard;

const getEventDateLabel = (date: string) => {
  const value = new Date(date);
  return {
    weekday: value
      .toLocaleDateString("es-AR", { weekday: "short" })
      .replace(".", "")
      .toUpperCase(),
    day: value.getDate(),
    time: value.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

function SectionHeader({
  title,
  onPress,
}: {
  title: string;
  onPress?: () => void;
}) {
  return (
    <View style={s.heading}>
      <Text style={s.section}>{title}</Text>
      {onPress ? (
        <TouchableOpacity
          style={s.link}
          onPress={onPress}
          accessibilityRole="button"
          activeOpacity={0.72}
        >
          <Text style={s.action}>Ver todos</Text>
          <Icon name="chevron-forward" size={18} color={ACCENT} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function OverviewLoadingPlaceholder() {
  return (
    <>
      <View style={s.sectionBlock}>
        <SectionHeader title="DESAFÍOS ACTIVOS" />
        <View style={s.placeholderCarousel}>
          <View style={s.challengeSkeletonCard} />
          <View style={s.challengeSkeletonCard} />
        </View>
      </View>

      <View style={s.sectionBlock}>
        <SectionHeader title="PRÓXIMOS EVENTOS" />
        <View style={s.placeholderCarousel}>
          <View style={s.eventSkeletonCard} />
          <View style={s.eventSkeletonCard} />
        </View>
      </View>
    </>
  );
}

function ChallengeCard({
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
  const todayKey = new Date().toISOString().split("T")[0];
  const checkedInToday =
    Boolean(participant.data?.checkedInToday) ||
    Boolean(event.viewerCheckedInToday) ||
    (checkins.isSuccess && checkins.data.includes(todayKey));
  const showTodayBadge =
    timeline.status === "active" &&
    !checkins.isLoading &&
    !participant.isLoading;
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
      style={s.challengeCard}
      activeOpacity={0.8}
    >
      <View style={s.challengeFrame}>
        <ExpoImage
          source={event.image as ImageSourcePropType}
          style={s.challengeImage}
          contentFit="cover"
          transition={180}
          cachePolicy="memory-disk"
        />
        <LinearGradient
          pointerEvents="none"
          colors={[
            "rgba(254,254,253,0)",
            "rgba(254,254,253,0.92)",
            "rgba(254,254,253,0.99)",
          ]}
          locations={[0.18, 0.62, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={s.challengeStatusPill}>
          <Text style={[s.meta, s.imageMeta]}>{status}</Text>
        </View>
        {showTodayBadge ? (
          <View
            accessibilityLabel={
              checkedInToday ? "Completado hoy" : "Pendiente hoy"
            }
            style={[
              s.challengeTodayBadge,
              checkedInToday
                ? s.challengeTodayBadgeDone
                : s.challengeTodayBadgePending,
            ]}
          >
            <Icon
              name={checkedInToday ? "checkmark" : "time-outline"}
              size={16}
              color={vibesTheme.colors.primaryText}
            />
          </View>
        ) : null}
        <View style={s.challengeBody}>
          <View style={s.cardFooter}>
            <Text style={[s.cardTitle, s.challengeTitle]} numberOfLines={2}>
              {event.title}
            </Text>
            <Icon name="chevron-forward" size={20} color={ACCENT} />
          </View>
          {checkins.isError || participant.isError ? (
            <Text style={[s.meta, s.imageMeta]} numberOfLines={2}>
              No pudimos actualizar tu progreso.
            </Text>
          ) : checkins.isLoading ? (
            <VibesLoader size={30} style={s.loader} />
          ) : progress ? (
            <View style={s.progressLine}>
              <Icon name="trophy-outline" size={22} color={ACCENT} />
              <View
                accessibilityRole="progressbar"
                accessibilityValue={{
                  min: 0,
                  max: 100,
                  now: progress.percent,
                }}
                style={s.track}
              >
                <View style={[s.fill, { width: `${progress.percent}%` }]} />
              </View>
              <Text style={s.percent}>{progress.percent}%</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function HomeEventCard({ event }: { event: EventFeedItem }) {
  const navigation = useNavigation<any>();
  const label = getEventDateLabel(event.startsAt!);
  const participantImages = (event.participantPreviewImages ?? []).map(
    (uri, index) => ({ id: `${event.id}-${index}`, uri })
  );

  return (
    <TouchableOpacity
      accessibilityRole="button"
      key={event.id}
      style={s.eventCard}
      activeOpacity={0.8}
      onPress={() => navigation.navigate("EventDetail", { event })}
    >
      <ExpoImage
        source={event.image as ImageSourcePropType}
        style={s.eventImage}
        contentFit="cover"
        transition={180}
        cachePolicy="memory-disk"
      />
      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(254,254,253,0)",
          "rgba(254,254,253,0.92)",
          "rgba(254,254,253,0.99)",
        ]}
        locations={[0.18, 0.62, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={s.dateBadge}>
        <Text style={s.dateWeekday}>{label.weekday}</Text>
        <Text style={s.dateDay}>{label.day}</Text>
      </View>
      {participantImages.length ? (
        <AvatarGroup
          items={participantImages}
          size={26}
          max={3}
          overlap={8}
          style={s.eventAvatars}
        />
      ) : null}
      <View style={s.eventBody}>
        <View style={s.eventCopy}>
          <Text style={s.cardTitle} numberOfLines={2}>
            {event.title}
          </Text>
          {event.modality === "online" ? (
            <View style={s.eventMetaRow}>
              <Icon name="videocam-outline" size={16} color={vibesTheme.colors.primaryText} />
              <Text
                style={[s.meta, s.imageMeta, { flex: 1 }]}
                numberOfLines={2}
              >
                {`Online · ${label.time}`}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeOverview({ userId }: { userId?: string }) {
  const navigation = useNavigation<any>();
  const groups = useMyEventGroupsQuery(userId);
  const eventsFeed = useEventsFeedQuery();
  const [now, setNow] = useState(Date.now());
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
      void groups.refetch();
      void eventsFeed.refetch();
      const timer = setInterval(() => setNow(Date.now()), 60000);
      return () => clearInterval(timer);
    }, [eventsFeed.refetch, groups.refetch])
  );
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setNow(Date.now());
        void groups.refetch();
        void eventsFeed.refetch();
      }
    });
    return () => sub.remove();
  }, [eventsFeed.refetch, groups.refetch]);
  const events = (groups.data ?? []).map((group) => group.event);
  const upcoming = getUpcomingHomeEvents(events, now);
  const joinedEventIds = new Set(events.map((event) => event.id));
  const suggestedEvents = upcoming.length
    ? []
    : getUpcomingHomeEvents(eventsFeed.data ?? [], now)
        .filter((event) => !joinedEventIds.has(event.id))
        .slice(0, 2);
  const visibleEvents = upcoming.length ? upcoming : suggestedEvents;
  const rank = { active: 0, upcoming: 1, finished: 2 };
  const challenges = events
    .filter((event) => event.type === "challenge")
    .sort((a, b) => {
      const left = getChallengeTimeline(a.startsAt, a.durationDays).status;
      const right = getChallengeTimeline(b.startsAt, b.durationDays).status;
      const delta =
        new Date(a.startsAt ?? 0).getTime() -
        new Date(b.startsAt ?? 0).getTime();
      return rank[left] - rank[right] || (left === "finished" ? -delta : delta);
    })
    .slice(0, 3);
  const openList = (challenge = false) =>
    navigation.navigate("Tab", {
      screen: challenge ? "Flow" : "EventsTab",
      params: { section: challenge ? "challenge" : "event" },
    });
  const createEvent = () => navigation.navigate("CreateEvent" as never);
  if (groups.isLoading) return <OverviewLoadingPlaceholder />;
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
      <View style={s.sectionBlock}>
        <SectionHeader
          title="DESAFÍOS ACTIVOS"
          onPress={() => openList(true)}
        />
        {!challenges.length && (
          <TouchableOpacity
            style={s.emptyCard}
            accessibilityRole="button"
            onPress={() => openList(true)}
            activeOpacity={0.82}
          >
            <View style={s.emptyIcon}>
              <Icon name="trophy-outline" size={26} color={ACCENT} />
            </View>
            <View style={s.emptyCopy}>
              <Text style={s.meta}>
                Elegí un desafío y empezá a construir tu práctica.
              </Text>
            </View>
          </TouchableOpacity>
        )}
        {challenges.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.carousel}
          >
            {challenges.map((event) => (
              <ChallengeCard key={event.id} event={event} userId={userId} />
            ))}
          </ScrollView>
        ) : null}
      </View>

      <View style={s.sectionBlock}>
        <SectionHeader
          title="PRÓXIMOS EVENTOS"
          onPress={visibleEvents.length ? () => openList() : undefined}
        />
        {visibleEvents.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.carousel}
          >
            {visibleEvents.map((event) => (
              <HomeEventCard key={event.id} event={event} />
            ))}
          </ScrollView>
        ) : eventsFeed.isLoading ? (
          <View style={s.eventSuggestionsLoader}>
            <VibesLoader size={48} />
          </View>
        ) : (
          <View style={s.emptyEventCard}>
            <View style={s.emptyIcon}>
              <Icon name="calendar-outline" size={28} color={ACCENT} />
            </View>
            <View style={s.emptyCopy}>
              <Text style={s.emptyTitle}>No tenés eventos próximos</Text>
              <Text style={s.meta}>
                Creá un encuentro para compartir algo que te gustaría hacer.
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={createEvent}
                style={s.ctaButton}
                activeOpacity={0.84}
              >
                <Text style={s.ctaText}>Crear evento</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </>
  );
}
const s = StyleSheet.create({
  sectionBlock: {
    marginBottom: 24,
  },
  card: {
    backgroundColor: vibesTheme.colors.background,
    borderWidth: 1,
    borderColor: "rgba(110, 110, 110, 0.30)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  section: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: vibesTheme.colors.secondaryText,
    letterSpacing: 1,
    fontFamily: vibesTheme.fonts.semibold,
  },
  link: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingLeft: 10,
  },
  carousel: {
    gap: 10,
    paddingRight: 24,
  },
  placeholderCarousel: {
    flexDirection: "row",
    gap: 10,
    overflow: "hidden",
  },
  challengeSkeletonCard: {
    width: 174,
    minHeight: 154,
    borderRadius: 14,
    backgroundColor: "rgba(228, 183, 110, 0.18)",
  },
  eventSkeletonCard: {
    width: 174,
    minHeight: 154,
    borderRadius: 14,
    backgroundColor: "rgba(228, 183, 110, 0.18)",
  },
  challengeCard: {
    width: 174,
  },
  challengeFrame: {
    minHeight: 154,
    backgroundColor: vibesTheme.colors.background,
    borderRadius: 14,
    overflow: "hidden",
    justifyContent: "flex-end",
    paddingTop: 28,
  },
  challengeBody: { padding: 10, gap: 2 },
  challengeImage: { ...StyleSheet.absoluteFillObject },
  challengeStatusPill: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 2,
    alignSelf: "flex-start",
    backgroundColor: "rgba(254, 254, 253, 0.92)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
  },
  challengeTodayBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  challengeTodayBadgePending: {
    backgroundColor: vibesTheme.colors.accentMustard,
  },
  challengeTodayBadgeDone: {
    backgroundColor: vibesTheme.colors.accentBlue,
  },
  imageMeta: { color: vibesTheme.colors.primaryText },
  cardTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: vibesTheme.colors.primaryText,
    fontFamily: vibesTheme.fonts.medium,
  },
  meta: {
    fontSize: 14,
    lineHeight: 20,
    color: vibesTheme.colors.secondaryText,
    fontFamily: vibesTheme.fonts.regular,
  },
  action: {
    fontSize: 16,
    lineHeight: 22,
    color: ACCENT,
    fontFamily: vibesTheme.fonts.medium,
  },
  challengeTitle: { flex: 1 },
  loader: { marginTop: 12, alignSelf: "flex-start" },
  progressLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 9,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(43, 43, 43, 0.16)",
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: ACCENT, borderRadius: 3 },
  percent: {
    minWidth: 33,
    color: vibesTheme.colors.primaryText,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "right",
    fontFamily: vibesTheme.fonts.medium,
  },
  cardFooter: {
    marginTop: "auto",
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  eventCard: {
    width: 174,
    minHeight: 154,
    backgroundColor: vibesTheme.colors.background,
    borderRadius: 14,
    overflow: "hidden",
    paddingTop: 58,
    paddingBottom: 10,
    justifyContent: "flex-end",
  },
  eventImage: { ...StyleSheet.absoluteFillObject },
  dateBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 42,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: vibesTheme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
  },
  dateWeekday: {
    color: vibesTheme.colors.secondaryText,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: vibesTheme.fonts.medium,
  },
  dateDay: {
    color: vibesTheme.colors.primaryText,
    fontSize: 21,
    lineHeight: 24,
    fontFamily: vibesTheme.fonts.medium,
  },
  eventCopy: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 10,
    gap: 4,
  },
  eventBody: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingTop: 12,
  },
  eventMetaRow: {
    minHeight: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  eventAvatars: { position: "absolute", top: 12, right: 10 },
  eventSuggestionsLoader: {
    minHeight: 112,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    width: "100%",
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: vibesTheme.colors.background,
    borderColor: "rgba(110, 110, 110, 0.30)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  emptyEventCard: {
    minHeight: 142,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: vibesTheme.colors.background,
    borderColor: "rgba(110, 110, 110, 0.30)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "rgba(216, 140, 122, 0.21)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCopy: { flex: 1, minWidth: 0 },
  emptyTitle: {
    color: vibesTheme.colors.primaryText,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: vibesTheme.fonts.medium,
    marginBottom: 3,
  },
  ctaButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ACCENT,
  },
  ctaText: {
    color: vibesTheme.colors.primaryText,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.medium,
  },
});
