import { nextEventSession } from "../src/lib/eventSchedule";
import React, { useCallback, useEffect, useState } from "react";
import {
  AppState,
  StyleSheet,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
} from "react-native";
import ProfileMediaImage from "./ProfileMediaImage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Text } from "./Typography";
import Icon from "./Icon";
import VibesLoader from "./VibesLoader";
import {
  useMyEventGroupsQuery,
  useEventsFeedQuery,
  useChallengesFeedQuery,
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
import { useQuery } from "@tanstack/react-query";
import { matchesQueryOptions } from "../src/queries/matches.queries";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";
import {
  orderHomeSections,
  type HomeSection,
} from "../src/lib/homePersonalization";

const ACCENT = vibesTheme.colors.accentMustard;

const getEventDateLabel = (date: string) => {
  const value = new Date(date);
  return {
    weekday: value
      .toLocaleDateString("es-AR", { weekday: "short" })
      .replace(".", "")
      .toUpperCase(),
    day: value.getDate(),
    month: value
      .toLocaleDateString("es-AR", { month: "short" })
      .replace(".", "")
      .toUpperCase(),
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
  if (!onPress)
    return (
      <View style={s.heading}>
        <Text style={s.section}>{title}</Text>
      </View>
    );
  return (
    <TouchableOpacity
      style={[s.heading, { minHeight: 44 }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver ${title}`}
      activeOpacity={0.72}
    >
      <Text style={s.section}>{title}</Text>
      <Icon name="chevron-forward" size={20} color={ACCENT} />
    </TouchableOpacity>
  );
}

function OverviewLoadingPlaceholder() {
  return (
    <>
      <View style={s.sectionBlock}>
        <SectionHeader title="Eventos para vos" />
        <View style={s.eventSuggestionsLoader}>
          <VibesLoader size={48} accessibilityLabel="Cargando eventos" />
        </View>
      </View>

      <View style={s.sectionBlock}>
        <SectionHeader title="Tus desafíos" />
        <View style={s.eventSuggestionsLoader}>
          <VibesLoader size={48} accessibilityLabel="Cargando desafíos" />
        </View>
      </View>
    </>
  );
}

function ChallengeCard({
  event,
  userId,
  showProgress = true,
}: {
  event: EventFeedItem;
  userId?: string;
  showProgress?: boolean;
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
      ? timeline.startsInDays === 1
        ? "Empieza mañana"
        : `Empieza en ${timeline.startsInDays} días`
      : timeline.status === "finished"
      ? "Finalizado"
      : `Día del grupo: ${timeline.currentDay} de ${timeline.totalDays}`;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Ver desafío ${event.title}`}
      onPress={() => navigation.navigate("ChallengeDetailScreen", { event })}
      style={s.compactCard}
      activeOpacity={0.8}
    >
      <ProfileMediaImage
        source={
          typeof event.image === "string"
            ? { uri: event.image }
            : (event.image as ImageSourcePropType)
        }
        style={s.challengePhoto}
        contentFit="cover"
        transition={180}
      />
      <View style={s.compactCopy}>
        <Text style={s.cardTitle} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={s.meta}>{status}</Text>
        {showProgress && timeline.status !== "upcoming" ? (
          checkins.isError || participant.isError ? (
            <Text style={s.progressCaption}>
              No pudimos actualizar tu progreso.
            </Text>
          ) : checkins.isLoading ? (
            <VibesLoader size={20} />
          ) : progress ? (
            <View style={s.progressLine}>
              <Text style={s.progressCaption}>
                Tu avance: {progress.completed} de {progress.total}
              </Text>
              <View
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: progress.percent }}
                style={s.track}
              >
                <View style={[s.fill, { width: `${progress.percent}%` }]} />
              </View>
            </View>
          ) : null
        ) : null}
      </View>
      <Icon
        name="chevron-forward"
        size={20}
        color={vibesTheme.colors.secondaryText}
      />
    </TouchableOpacity>
  );
}

function HomeEventCard({ event }: { event: EventFeedItem }) {
  const navigation = useNavigation<any>();
  const label = getEventDateLabel(
    nextEventSession(event.schedule, event.startsAt)?.startsAt ??
      event.startsAt!
  );
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Ver evento ${event.title}`}
      style={s.compactCard}
      activeOpacity={0.8}
      onPress={() => navigation.navigate("EventDetail", { event })}
    >
      <ProfileMediaImage
        source={
          typeof event.image === "string"
            ? { uri: event.image }
            : (event.image as ImageSourcePropType)
        }
        style={s.eventPhoto}
        contentFit="cover"
        transition={180}
      />
      <View style={s.compactCopy}>
        <Text style={s.cardTitle} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={s.eventDate}>
          {label.day} {label.month.toLowerCase()} · {label.time}
        </Text>
        {event.modality === "online" || event.location ? (
          <Text style={s.meta} numberOfLines={1}>
            {event.modality === "online" ? "Online" : event.location}
          </Text>
        ) : null}
      </View>
      <Icon
        name="chevron-forward"
        size={20}
        color={vibesTheme.colors.secondaryText}
      />
    </TouchableOpacity>
  );
}

export default function HomeOverview({
  userId,
  children,
}: {
  userId?: string;
  children?: React.ReactNode;
}) {
  const navigation = useNavigation<any>();
  const groups = useMyEventGroupsQuery(userId);
  // Home picks upcoming events and the viewer's challenges from the whole
  // set, so it keeps loading every page.
  const eventsFeed = useEventsFeedQuery({ loadAll: true });
  const challengesFeed = useChallengesFeedQuery({ loadAll: true });
  const [now, setNow] = useState(Date.now());
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
      void groups.refetch();
      void eventsFeed.refetch();
      void challengesFeed.refetch();
      const timer = setInterval(() => setNow(Date.now()), 60000);
      return () => clearInterval(timer);
    }, [challengesFeed.refetch, eventsFeed.refetch, groups.refetch])
  );
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setNow(Date.now());
        void groups.refetch();
        void eventsFeed.refetch();
        void challengesFeed.refetch();
      }
    });
    return () => sub.remove();
  }, [challengesFeed.refetch, eventsFeed.refetch, groups.refetch]);
  const events = (groups.data ?? []).map((group) => group.event);
  const upcoming = getUpcomingHomeEvents(events, now);
  const joinedEventIds = new Set(events.map((event) => event.id));
  const suggestedEvents = upcoming.length
    ? []
    : getUpcomingHomeEvents((eventsFeed.data ?? []), now)
        .filter((event) => !joinedEventIds.has(event.id))
        .slice(0, 2);
  const preferences = useUserPreferencesQuery(userId).data;
  const matchesCount = useQuery(matchesQueryOptions(userId)).data?.length ?? 0;
  const visibleEvents = upcoming.length ? upcoming : suggestedEvents;
  const sectionOrder = orderHomeSections({
    preferences,
    joined: events,
    matchesCount,
  });
  const joinedChallenges = events.filter((event) => event.type === "challenge");
  const currentAndUpcomingChallenges = joinedChallenges.filter(
    (event) =>
      getChallengeTimeline(event.startsAt, event.durationDays).status !==
      "finished"
  );
  const joinedChallengeIds = new Set(joinedChallenges.map((event) => event.id));
  const homeChallenges = currentAndUpcomingChallenges
    .sort((a, b) => {
      const delta =
        new Date(a.startsAt ?? 0).getTime() -
        new Date(b.startsAt ?? 0).getTime();
      return delta;
    })
    .slice(0, 3);
  const recommendedChallenges = homeChallenges.length
    ? []
    : (challengesFeed.data ?? [])
        .filter((event) => (event.visibility ?? "public") === "public")
        .filter((event) => !joinedChallengeIds.has(event.id))
        .filter(
          (event) =>
            getChallengeTimeline(event.startsAt, event.durationDays).status !==
            "finished"
        )
        .sort(
          (a, b) =>
            new Date(a.startsAt ?? 0).getTime() -
            new Date(b.startsAt ?? 0).getTime()
        )
        .slice(0, 3);
  const challenges = homeChallenges.length
    ? homeChallenges
    : recommendedChallenges;
  const challengeSectionTitle = homeChallenges.length
    ? "Tus desafíos"
    : "Desafíos para vos";
  const isLoadingChallengeRecommendations =
    !homeChallenges.length && challengesFeed.isLoading;
  const openList = (challenge = false) =>
    navigation.navigate("Tab", {
      screen: challenge ? "Flow" : "EventsTab",
      params: { section: challenge ? "challenge" : "event" },
    });
  const createEvent = () => navigation.navigate("CreateEvent" as never);
  if (groups.isLoading)
    return (
      <>
        {children}
        <OverviewLoadingPlaceholder />
      </>
    );
  if (groups.isError)
    return (
      <>
        {children}
        <TouchableOpacity
          accessibilityRole="button"
          style={s.card}
          onPress={() => void groups.refetch()}
        >
          <Text>No pudimos cargar tu agenda. Tocá para reintentar.</Text>
        </TouchableOpacity>
      </>
    );
  const eventsSection = (
    <View key="events" style={s.sectionBlock}>
      <SectionHeader
        title="Eventos para vos"
        onPress={visibleEvents.length ? () => openList() : undefined}
      />
      {visibleEvents.length ? (
        <View style={s.compactList}>
          {visibleEvents.map((event) => (
            <HomeEventCard key={event.id} event={event} />
          ))}
        </View>
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
  );
  const challengesSection = (
    <View key="challenges" style={s.sectionBlock}>
      <SectionHeader
        title={challengeSectionTitle}
        onPress={() => openList(true)}
      />
      {isLoadingChallengeRecommendations ? (
        <View style={s.eventSuggestionsLoader}>
          <VibesLoader size={48} accessibilityLabel="Cargando desafíos" />
        </View>
      ) : null}
      {!isLoadingChallengeRecommendations && !challenges.length && (
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
      {!isLoadingChallengeRecommendations && challenges.length ? (
        <View style={s.compactList}>
          {challenges.map((event) => (
            <ChallengeCard
              key={event.id}
              event={event}
              userId={userId}
              showProgress={Boolean(homeChallenges.length)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
  const sections: Record<HomeSection, React.ReactNode> = {
    events: eventsSection,
    challenges: challengesSection,
    people: <React.Fragment key="people">{children}</React.Fragment>,
  };
  return <>{sectionOrder.map((section) => sections[section])}</>;
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
    fontSize: 19,
    lineHeight: 25,
    color: vibesTheme.colors.primaryText,
    fontFamily: vibesTheme.fonts.bold,
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
    minHeight: 170,
    borderRadius: 14,
    backgroundColor: "rgba(244, 163, 64, 0.18)",
  },
  eventSkeletonCard: {
    width: 174,
    minHeight: 170,
    borderRadius: 14,
    backgroundColor: "rgba(244, 163, 64, 0.18)",
  },
  compactList: { gap: 10 },
  compactCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${vibesTheme.colors.secondaryText}24`,
    backgroundColor: vibesTheme.colors.background,
  },
  compactCopy: { flex: 1, minWidth: 0, gap: 4 },
  challengePhoto: {
    width: 76,
    height: 76,
    borderRadius: 12,
    overflow: "hidden",
  },
  eventPhoto: { width: 112, height: 76, borderRadius: 12, overflow: "hidden" },
  eventDate: {
    color: vibesTheme.colors.accentBlue,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.medium,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
    color: vibesTheme.colors.primaryText,
    fontFamily: vibesTheme.fonts.semibold,
  },
  meta: {
    fontSize: 14,
    lineHeight: 20,
    color: vibesTheme.colors.secondaryText,
    fontFamily: vibesTheme.fonts.regular,
  },
  action: {
    fontSize: 12,
    lineHeight: 18,
    color: vibesTheme.colors.primaryText,
    fontFamily: vibesTheme.fonts.medium,
  },
  progressLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  progressCaption: {
    fontSize: 12,
    lineHeight: 18,
    color: vibesTheme.colors.secondaryText,
    flexShrink: 1,
  },
  track: {
    flex: 1,
    minWidth: 30,
    height: 6,
    borderRadius: 3,
    backgroundColor: `${vibesTheme.colors.secondaryText}1F`,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: vibesTheme.colors.accentBlue,
    borderRadius: 3,
  },
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
    color: vibesTheme.colors.surface,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.medium,
  },
});
