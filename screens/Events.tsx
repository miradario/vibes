import { useCommunityFilter } from "../src/hooks/useCommunityFilter";
import { matchesCommunities } from "../src/lib/communities";
import { useReducedMotion } from "react-native-reanimated";
import DiscoverPathCards from "../components/DiscoverPathCards";
import { isCuratedChallenge } from "../src/lib/curatedChallenges";
import { pillTabStyles } from "../components/PillTabStyles";
import BackButton from "../components/BackButton";
import ChallengeFeedCard from "../components/ChallengeFeedCard";
import ForYouTag from "../components/ForYouTag";
import { pickFeaturedItem } from "../src/lib/homePersonalization";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";
import { formatEventRecurrence, getEventRecurrence, eventHasExpired, normalizeSchedule, nextEventSession, sortEventsByDate } from "../src/lib/eventSchedule";
import MediaImage from "../components/MediaImage";
import DateTimePicker from "@react-native-community/datetimepicker";
import ScreenContainer from "../components/ScreenContainer";
import { matchesEventDateAndLocation, getEventLocationOptions, getEventDatePreset, formatEventFilterDate, type EventDatePreset } from "../src/lib/eventFilters";
import KeyboardSheetModal from "../components/KeyboardSheetModal";
import EventClassificationPicker from "../components/EventClassificationPicker";
import { EVENT_MODALITIES, EVENT_CATEGORIES, EVENT_PARTICIPATION_TYPES, getEventCategoryLabel, getEventParticipationLabel, matchesEventClassification, type EventCategory, type EventParticipationType } from "../src/constants/eventClassification";
/** @format */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, View, FlatList, TouchableOpacity, StyleSheet, ScrollView, Keyboard, Platform, useWindowDimensions } from "react-native";
import { Text, TextInput } from "../components/Typography";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles, { TEXT_PRIMARY, TEXT_SECONDARY } from "../assets/styles";
import Icon from "../components/Icon";
import AvatarGroup from "../components/AvatarGroup";
import VibesLoader from "../components/VibesLoader";
import {
  challengesKeys,
  eventsKeys,
  myEventGroupsKeys,
  useChallengesFeedQuery,
  useEventsFeedQuery,
  useMyEventGroupsQuery,
} from "../src/queries/events.queries";
import type { EventFeedItem, EventModality } from "../src/queries/events.queries";
import { useAuthSession } from "../src/auth/auth.queries";
import { getChallengeTimeline } from "../src/lib/challengeTimeline";
import { getBottomTabContentPadding, TAB_BAR_CONTENT_CLEARANCE } from "../src/lib/tabBarLayout";

/** Aire extra que la lista de Eventos ya tenía sobre la barra (140 = 118 + 22). */
const EVENTS_LIST_EXTRA_CLEARANCE = 22;
import { vibesTheme } from "../src/theme/vibesTheme";
import { useI18n } from "../src/i18n";
import {
  useReceivedChallengeInvitationsQuery,
  useRespondChallengeInvitationMutation,
  challengeInvitationKeys,
  type ReceivedChallengeInvitation,
} from "../src/queries/challengeRestart.queries";
import RestartChallengeConfirmSheet from "../components/challengeRestart/RestartChallengeConfirmSheet";
import { restartStyles } from "../components/challengeRestart/styles";
import * as ds from "../src/theme/tokens";

type FeedListItem =
  | {
      kind: "section";
      id: string;
      title: string;
      subtitle?: string;
    }
  | {
      kind: "feed";
      item: EventFeedItem;
      restartable?: boolean;
      invitation?: ReceivedChallengeInvitation;
      keyPrefix?: string;
      reveal?: boolean;
      featured?: boolean;
    };

type ChallengeTab = "public" | "private" | "vibes";

const AccordionReveal = ({ children }: { children: React.ReactNode }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: 1,
      damping: 16,
      stiffness: 150,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) },
          { scaleY: progress.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
};

const normalizeSearchText = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const parseParticipantCount = (attendees: string | null | undefined) => {
  if (!attendees) return 0;
  const slashMatch = attendees.match(/^(\d+)\s*\//);
  if (slashMatch) return Number(slashMatch[1] ?? 0);
  const plainMatch = attendees.match(/(\d+)/);
  return plainMatch ? Number(plainMatch[1] ?? 0) : 0;
};

const getChallengeProgress = (item: EventFeedItem) => {
  if (item.type !== "challenge") return null;

  const timeline = getChallengeTimeline(item.startsAt, item.durationDays);

  if (timeline.status === "upcoming") {
    return {
      label: `En ${timeline.startsInDays} ${timeline.startsInDays === 1 ? "día" : "días"}`,
      tone: "pending" as const,
    };
  }

  if (timeline.status === "finished") {
    return { label: "Finalizado", tone: "done" as const };
  }

  return {
    label: `Día ${timeline.currentDay}/${timeline.totalDays}`,
    tone: "active" as const,
  };
};

const isFinishedChallenge = (item: EventFeedItem) =>
  item.type === "challenge" && getChallengeProgress(item)?.tone === "done";

const isUpcomingChallenge = (item: EventFeedItem) =>
  item.type === "challenge" && getChallengeTimeline(item.startsAt, item.durationDays).status === "upcoming";

const sortChallengesByStartsAt = (items: EventFeedItem[]) =>
  [...items].sort((left, right) => {
    const leftTime = left.startsAt ? new Date(left.startsAt).getTime() : Number.POSITIVE_INFINITY;
    const rightTime = right.startsAt ? new Date(right.startsAt).getTime() : Number.POSITIVE_INFINITY;
    return leftTime - rightTime;
  });

const isExpiredEvent = (item: EventFeedItem) =>
  item.type === "event" && eventHasExpired(item.schedule, item.startsAt);

const getVisibilityMeta = (visibility?: EventFeedItem["visibility"]) => {
  if (visibility === "friends") {
    return { icon: "people-outline" as const, label: "Solo amigos" };
  }
  if (visibility === "private") {
    return { icon: "lock-closed-outline" as const, label: "Privado" };
  }
  return { icon: "earth-outline" as const, label: "Público" };
};

const ParticipantStack = ({
  count,
  hostImage,
  avatarUrls,
}: {
  count: number;
  hostImage?: string | null;
  avatarUrls?: string[];
}) => {
  const uniqueAvatarUrls = Array.from(
    new Set((avatarUrls ?? []).filter((value) => typeof value === "string" && value.trim())),
  );
  const totalVisible = Math.max(1, Math.min(count || uniqueAvatarUrls.length || 1, 3));

  return (
    <AvatarGroup
      size={36}
      overlap={10}
      max={3}
      items={Array.from({ length: totalVisible }).map((_, index) => ({
        id: `participant-${index}`,
        uri: uniqueAvatarUrls[index] ?? (index === 0 ? hostImage : null),
      }))}
      style={localStyles.avatarStack}
    />
  );
};

const Events = ({
  pastOnly = false,
  embedded = false,
  section: requestedSection,
}: {
  pastOnly?: boolean;
  embedded?: boolean;
  section?: "event" | "challenge";
}) => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { data: session } = useAuthSession();
  const section: "event" | "challenge" =
    requestedSection ?? (route.params?.section === "challenge" ? "challenge" : "event");
  const title = pastOnly ? (section === "challenge" ? "Desafíos finalizados" : "Eventos pasados") : section === "challenge" ? "Desafíos" : "Eventos";
  const searchPlaceholder =
    section === "challenge" ? t("events.searchChallenges") : t("events.searchEvents");
  const [modality, setModality] = useState<EventModality | null>(null);
  const [category, setCategory] = useState<EventCategory | null>(null);
  const [spiritualPaths, setSpiritualPaths] = useCommunityFilter();
  const [participationType, setParticipationType] = useState<EventParticipationType | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [datePreset, setDatePreset] = useState<EventDatePreset | null>(null);
  const [draftDatePreset, setDraftDatePreset] = useState<EventDatePreset | null>(null);
  const [locationFilter, setLocationFilter] = useState("");
  const [draftDateFrom, setDraftDateFrom] = useState<Date | null>(null);
  const [draftDateTo, setDraftDateTo] = useState<Date | null>(null);
  const [draftLocation, setDraftLocation] = useState("");
  const [dateField, setDateField] = useState<"from" | "to" | null>(null);
  const today = getEventDatePreset("today").from;
  const minimumDate = pastOnly ? undefined : today;
  const endMinimumDate = draftDateFrom && (!minimumDate || draftDateFrom > minimumDate) ? draftDateFrom : minimumDate;
  const invalidDateRange = Boolean(
    (draftDateFrom && draftDateTo && draftDateFrom > draftDateTo) ||
    (!pastOnly && ((draftDateFrom && draftDateFrom < today) || (draftDateTo && draftDateTo < today)))
  );
  const [pricingType, setPricingType] = useState<"free" | "paid" | null>(null);
  const [frequentOnly, setFrequentOnly] = useState(false);
  const [draftFilters, setDraftFilters] = useState<{
    frequentOnly: boolean;
    pricingType: "free" | "paid" | null;
    category: EventCategory | null;
    participationType: EventParticipationType | null;
    modality: EventModality | null;
  }>({ frequentOnly: false, pricingType: null, category: null, participationType: null, modality: null });
  const activeFilterCount = [frequentOnly, category, participationType, modality, spiritualPaths.length > 0, dateFrom, dateTo, locationFilter.trim()].filter(Boolean).length;
  const [filterPanel, setFilterPanel] = useState<"date" | "location" | "other">("date");
  const openFilters = (panel: "date" | "location" | "other") => {
    setFilterPanel(panel);
    Keyboard.dismiss();
    setDraftFilters({ frequentOnly, pricingType, category, participationType, modality });
    setDraftDatePreset(datePreset);
    setDraftDateFrom(dateFrom);
    setDraftDateTo(dateTo);
    setDraftLocation(locationFilter);
    setDateField(null);
    setFiltersVisible(true);
  };

  const [search, setSearch] = useState("");
  const [startedOnly, setStartedOnly] = useState(false);
  // "private" is the internal key of "Mis desafíos" ("mine" is accepted too).
  const routeChallengeTab: ChallengeTab | null =
    route.params?.challengeTab === "private" || route.params?.challengeTab === "mine"
      ? "private"
      : route.params?.challengeTab === "vibes"
        ? "vibes"
        : route.params?.challengeTab === "public"
          ? "public"
          : null;
  const [challengeTab, setChallengeTabState] = useState<ChallengeTab>(routeChallengeTab ?? "public");
  // Once the user taps a tab (or a route param picked one) the initial-tab
  // logic below must not change it again.
  const challengeTabDecided = useRef(routeChallengeTab !== null);
  const setChallengeTab = (tab: ChallengeTab) => {
    challengeTabDecided.current = true;
    setChallengeTabState(tab);
    // "Ya comenzados" only exists in Público.
    if (tab !== "public") setStartedOnly(false);
  };
  // Lazy loading: the feed loads page by page while scrolling. Search,
  // filters and the views that group or sort the whole set (past, already
  // started, private) need every row, so they load the remaining pages.
  const needsFullFeed =
    pastOnly ||
    startedOnly ||
    (section === "challenge" && challengeTab !== "public") ||
    normalizeSearchText(search).length > 0 ||
    activeFilterCount > 0 ||
    pricingType !== null;
  const eventsQuery = useEventsFeedQuery({ loadAll: section === "event" });
  const challengesQuery = useChallengesFeedQuery({ loadAll: section === "challenge" && needsFullFeed });
  const groupsQuery = useMyEventGroupsQuery(session?.user?.id);
  const { data: myEventGroups = [], isLoading: myEventGroupsLoading } = groupsQuery;
  const activeFeed = section === "challenge" ? challengesQuery : eventsQuery;
  const {
    data: items = [],
    isLoading,
    error: feedError,
    hasNextPage: feedHasNextPage,
    isFetchingNextPage: feedIsFetchingNextPage,
    fetchNextPage: fetchNextFeedPage,
  } = activeFeed;
  const error = feedError ?? (section === "challenge" ? groupsQuery.error : null);
  const locationOptions = useMemo(() => getEventLocationOptions(items), [items]);
  const availableEvents = useMemo(() => items.filter(item => item.type === "event" && (pastOnly ? isExpiredEvent(item) : !isExpiredEvent(item))), [items, pastOnly]);
  const availableCategories = useMemo(() => EVENT_CATEGORIES.filter(option => availableEvents.some(item => item.category === option.id)), [availableEvents]);
  const availableParticipationTypes = useMemo(() => EVENT_PARTICIPATION_TYPES.filter(option => availableEvents.some(item => item.participationType === option.id)), [availableEvents]);
  const { fontScale } = useWindowDimensions();
  const eventImageSize = Math.ceil(88 * Math.max(1, fontScale));
  const reducedMotion = useReducedMotion();
  const filtersProgress = useRef(new Animated.Value(1)).current;
  const [filtersHeight, setFiltersHeight] = useState(0);
  const scrollPosition = useRef(0);
  const scrollDirection = useRef(0);
  const scrollDistance = useRef(0);
  const filtersHidden = useRef(false);
  const revealFilters = (hidden: boolean) => {
    if (filtersHidden.current === hidden) return;
    filtersHidden.current = hidden;
    Animated.timing(filtersProgress, { toValue: hidden ? 0 : 1, duration: reducedMotion ? 0 : 180, useNativeDriver: true }).start();
  };

  const loadMoreFeed = useCallback(() => {
    if (feedHasNextPage && !feedIsFetchingNextPage) void fetchNextFeedPage();
  }, [feedHasNextPage, feedIsFetchingNextPage, fetchNextFeedPage]);
  const [restartTarget, setRestartTarget] = useState<EventFeedItem | null>(null);
  const viewerId = session?.user?.id;
  const invitationsQuery = useReceivedChallengeInvitationsQuery(section === "challenge" ? viewerId : undefined);
  const respondInvitation = useRespondChallengeInvitationMutation();

  const errorMessage =
    error instanceof Error && error.message.trim()
      ? error.message
      : section === "challenge"
        ? "No se pudieron cargar los desafíos."
        : "No se pudieron cargar los eventos.";
  const joinedChallengeIds = useMemo(
    () =>
      new Set(
        myEventGroups
          .filter((group) => group.eventType === "challenge")
          .map((group) => group.eventId),
      ),
    [myEventGroups],
  );

  const isMyChallenge = useCallback(
    // Joined challenges, plus private ones the viewer created (so they never
    // disappear). Public ones created but not joined stay in Público.
    (item: EventFeedItem) =>
      joinedChallengeIds.has(item.id) || (Boolean(viewerId) && item.createdBy === viewerId && item.visibility === "private"),
    [joinedChallengeIds, viewerId],
  );
  const normalizedSearch = normalizeSearchText(search);
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (section === "challenge" && !pastOnly && startedOnly && challengeTab === "public" && (isUpcomingChallenge(item) || isFinishedChallenge(item))) return false;
      if (section === "challenge") {
        const curated = isCuratedChallenge(item);
        // Curated challenges live only in "Por Vibes", as a catalog to restart.
        if (challengeTab === "vibes") { if (!curated) return false; }
        // "Mis desafíos": everything the viewer created or joined, public or private
        // (restarted copies of curated challenges are private, so they land here).
        else if (challengeTab === "private") { if (curated || !isMyChallenge(item)) return false; }
        // "Público": public challenges the viewer is not in yet.
        else if (curated || item.visibility === "private" || isMyChallenge(item)) return false;
      }
      if (section === "event" && !matchesEventDateAndLocation(item, dateFrom, dateTo, locationFilter)) return false;
      if (section === "event" && !matchesEventClassification(item, category, participationType, modality)) return false;
      // Challenges have no community tags, so the community filter only applies to events.
      if (section === "event" && !matchesCommunities(item, spiritualPaths)) return false;
      if (section === "event" && frequentOnly && !getEventRecurrence(item.schedule)) return false;
      if (section === "event" && pricingType && item.pricingType !== pricingType) return false;
      if (!normalizedSearch) return true;
      const haystack = normalizeSearchText(
        [
          getEventCategoryLabel(item.category),
          getEventParticipationLabel(item.participationType),
          item.title,
          item.subtitle,
          item.description,
          item.date,
          item.location,
          item.hostName,
          item.modality === "online" ? "online" : "presencial",
          item.pricingType === "paid" ? "pago" : "gratis",
        ]
          .filter(Boolean)
          .join(" "),
      );

      return haystack.includes(normalizedSearch);
    });
  }, [items, isMyChallenge, spiritualPaths, frequentOnly, challengeTab, startedOnly, pastOnly, pricingType, normalizedSearch, section, category, participationType, modality, dateFrom, dateTo, locationFilter]);

  const visibleItems = useMemo(() => {
    if (section !== "challenge") {
      return sortEventsByDate(filteredItems.filter((item) => pastOnly ? isExpiredEvent(item) : !isExpiredEvent(item)));
    }
    return filteredItems;
  }, [filteredItems, section, pastOnly]);

  const expiredEventItems = useMemo(() => {
    if (section !== "event") return [];
    return filteredItems.filter(isExpiredEvent);
  }, [filteredItems, section]);

  const finishedChallengeItems = useMemo(() => {
    if (section !== "challenge") return [];
    return filteredItems.filter(isFinishedChallenge);
  }, [filteredItems, section]);

  const upcomingChallengeItems = useMemo(() => {
    if (section !== "challenge") return [];
    return sortChallengesByStartsAt(filteredItems.filter(isUpcomingChallenge));
  }, [filteredItems, section]);

  const activeChallengeItems = useMemo(() => {
    if (section !== "challenge") return [];
    return filteredItems.filter(
      (item) => item.type === "challenge" && !isFinishedChallenge(item) && !isUpcomingChallenge(item),
    );
  }, [filteredItems, section]);

  const joinedChallengeItems = useMemo(() => {
    if (section !== "challenge") return [];
    return activeChallengeItems.filter((item) => joinedChallengeIds.has(item.id));
  }, [activeChallengeItems, joinedChallengeIds, section]);

  const joinedUpcomingChallengeItems = useMemo(() => {
    if (section !== "challenge") return [];
    return upcomingChallengeItems.filter((item) => joinedChallengeIds.has(item.id));
  }, [joinedChallengeIds, section, upcomingChallengeItems]);

  const generalChallengeItems = useMemo(() => {
    if (section !== "challenge") return [];
    return activeChallengeItems.filter((item) => !joinedChallengeIds.has(item.id));
  }, [activeChallengeItems, joinedChallengeIds, section]);

  const upcomingGeneralChallengeItems = useMemo(() => {
    if (section !== "challenge") return [];
    return upcomingChallengeItems.filter((item) => !joinedChallengeIds.has(item.id));
  }, [joinedChallengeIds, section, upcomingChallengeItems]);

  const baseListItems = useMemo<FeedListItem[]>(() => {
    if (section !== "challenge") {
      const joinedIds = new Set(myEventGroups.filter((group) => group.eventType === "event").map((group) => group.eventId));
      const joined = visibleItems.filter((item) => joinedIds.has(item.id));
      const others = visibleItems.filter((item) => !joinedIds.has(item.id));
      return [
        ...(joined.length ? [{ kind: "section" as const, id: "your-events", title: `Tus eventos (${joined.length})` }] : []),
        ...joined.map((item) => ({ kind: "feed" as const, item })),
        ...(others.length && !pastOnly ? [{ kind: "section" as const, id: "discover-events", title: "Explorá más" }] : []),
        ...others.map((item) => ({ kind: "feed" as const, item })),
      ];
    }

    if (pastOnly) {
      return finishedChallengeItems.map((item) => ({ kind: "feed" as const, item, restartable: true }));
    }

    if (challengeTab === "vibes") {
      return [...filteredItems]
        .sort((a, b) => a.title.localeCompare(b.title, "es"))
        .map((item) => ({ kind: "feed" as const, item, restartable: true, keyPrefix: "vibes" }));
    }

    if (challengeTab === "private") {
      const invitations = (invitationsQuery.data ?? []).filter(
        (invitation) =>
          invitation.status !== "accepted" &&
          (!normalizedSearch || normalizeSearchText(invitation.challenge.title).includes(normalizedSearch)),
      );
      const active = sortChallengesByStartsAt(activeChallengeItems);
      const sections: Array<[string, string, FeedListItem[]]> = [
        ["my-invitations", t("challengeRestart.blockInvitations"), invitations.map((invitation) => ({
          kind: "feed" as const,
          item: invitation.challenge,
          invitation,
          keyPrefix: "invitation",
          reveal: true,
        }))],
        ["my-active", "En curso", active.map((item) => ({ kind: "feed" as const, item, keyPrefix: "mine", reveal: true }))],
        ["my-upcoming", "Empiezan pronto", upcomingChallengeItems.map((item) => ({ kind: "feed" as const, item, keyPrefix: "mine", reveal: true }))],
      ];
      return sections
        .filter(([, , rows]) => rows.length > 0)
        .flatMap(([id, title, rows]) => [{ kind: "section" as const, id, title }, ...rows]);
    }

    if (startedOnly) return sortChallengesByStartsAt(activeChallengeItems).map(item => ({ kind: "feed" as const, item }));
    return upcomingChallengeItems.length
      ? [{ kind: "section" as const, id: "upcoming-challenges", title: "Empieza pronto" }, ...upcomingChallengeItems.map(item => ({ kind: "feed" as const, item }))]
      : [];
  }, [
    myEventGroups,
    expiredEventItems,
    finishedChallengeItems,
    activeChallengeItems,
    upcomingChallengeItems,
    section,
    pastOnly,
    visibleItems,
    challengeTab,
    startedOnly,
    filteredItems,
    invitationsQuery.data,
    normalizedSearch,
    t,
    viewerId,
  ]);

  // "Para ti": one public, not-joined, still-open item picked with the Home
  // scoring, shown first in the default list (not in past/private/started views).
  // For events it gets its own "Para vos" section, below "Tus eventos".
  const preferences = useUserPreferencesQuery(viewerId).data;
  const featuredItem = useMemo(() => {
    if (pastOnly || startedOnly || (section === "challenge" && challengeTab !== "public")) return null;
    const joined = myEventGroups.map((group) => group.event).filter(Boolean);
    return pickFeaturedItem(
      filteredItems.filter((item) => item.type === section),
      joined,
      preferences,
      Date.now(),
    );
  }, [challengeTab, filteredItems, myEventGroups, pastOnly, preferences, section, startedOnly]);

  const listItems = useMemo<FeedListItem[]>(() => {
    if (!featuredItem) return baseListItems;
    const featuredRow: FeedListItem = { kind: "feed", item: featuredItem, featured: true, keyPrefix: "featured" };
    const rest = baseListItems.filter(
      (row) => !(row.kind === "feed" && row.item.id === featuredItem.id),
    );
    if (section === "event") {
      // Drop section headers left without rows after moving the featured item.
      const cleaned = rest.filter(
        (row, index) => row.kind !== "section" || rest[index + 1]?.kind === "feed",
      );
      const recommendation: FeedListItem[] = [
        { kind: "section", id: "for-you", title: "Para vos" },
        featuredRow,
      ];
      // Keep joined events first, followed by the recommendation and exploration.
      const exploreIndex = cleaned.findIndex(row => row.kind === "section" && row.id === "discover-events");
      const insertAt = exploreIndex < 0 ? cleaned.length : exploreIndex;
      return [...cleaned.slice(0, insertAt), ...recommendation, ...cleaned.slice(insertAt)];
    }
    // Challenges: joined "En curso" stay first; "Para ti" goes first inside
    // the next section ("Empieza pronto").
    const mineId = "active-challenges";
    const nextId = "upcoming-challenges";
    const nextTitle = "Empieza pronto";
    const mineIndex = rest.findIndex((row) => row.kind === "section" && row.id === mineId);
    if (mineIndex === -1) {
      const cleaned = rest.filter((row, index) => row.kind !== "section" || rest[index + 1]?.kind === "feed");
      return [featuredRow, ...cleaned];
    }
    const nextIndex = rest.findIndex((row) => row.kind === "section" && row.id === nextId);
    if (nextIndex !== -1) {
      return [...rest.slice(0, nextIndex + 1), featuredRow, ...rest.slice(nextIndex + 1)];
    }
    return [...rest, { kind: "section" as const, id: nextId, title: nextTitle }, featuredRow];
  }, [baseListItems, featuredItem, section]);

  // Initial tab: without a route param, open "Mis desafíos" when the viewer has
  // something there (in progress, upcoming or a pending invitation), else
  // "Público". Decided once, after groups and invitations load, and never
  // after the user has tapped a tab.
  useEffect(() => {
    if (section !== "challenge" || pastOnly || challengeTabDecided.current) return;
    if (!viewerId) { challengeTabDecided.current = true; return; }
    if (myEventGroupsLoading || invitationsQuery.isLoading) return;
    challengeTabDecided.current = true;
    const hasOwn =
      myEventGroups.some(
        (group) => group.eventType === "challenge" && group.event && !isFinishedChallenge(group.event) && !isCuratedChallenge(group.event),
      ) ||
      items.some((item) => item.type === "challenge" && isMyChallenge(item) && !isFinishedChallenge(item) && !isCuratedChallenge(item));
    const hasInvitation = (invitationsQuery.data ?? []).some((invitation) => invitation.status !== "accepted");
    if (hasOwn || hasInvitation) setChallengeTabState("private");
  }, [invitationsQuery.data, invitationsQuery.isLoading, isMyChallenge, items, myEventGroups, myEventGroupsLoading, pastOnly, section, viewerId]);

  const listIsLoading =
    isLoading ||
    // Searching or filtering shows results only once every page is in, so
    // a match on a later page never shows up as "no results".
    activeFeed.isLoadingAll || (section === "challenge" && Boolean(session?.user?.id) && myEventGroupsLoading);

  useFocusEffect(
    useCallback(() => {
      if (section === "event") {
        void queryClient.refetchQueries({
          queryKey: eventsKeys.all,
          type: "active",
        });
        return;
      }

      void queryClient.refetchQueries({
        queryKey: challengesKeys.all,
        type: "active",
      });
      void queryClient.refetchQueries({
        queryKey: challengeInvitationKeys.all,
        type: "active",
      });

      if (session?.user?.id) {
        void queryClient.refetchQueries({
          queryKey: myEventGroupsKeys.all(session.user.id),
          type: "active",
        });
      }
    }, [queryClient, section, session?.user?.id]),
  );

  return (
    <ScreenContainer edges={pastOnly || (section === "challenge" && !embedded) ? ["top", "left", "right"] : []} style={styles.bg}>
      <View style={[styles.eventsContainer, localStyles.eventsContainer, (pastOnly || embedded || section === "challenge") && { paddingTop: ds.spacing[3] }]}>
        {!embedded && <View style={[localStyles.headerRow, section === "challenge" && !pastOnly && localStyles.challengeHeaderRow]}>
          {pastOnly && section !== "challenge" ? (
            <BackButton accessibilityRole="button" accessibilityLabel="Volver" onPress={() => navigation.goBack()} style={localStyles.filterButton} />
          ) : null}
          <View style={[localStyles.titleRow, section === "challenge" && !pastOnly && localStyles.challengeTitleRow]}>
            {!embedded && <Text style={[pastOnly && styles.eventsTitle, localStyles.screenTitle, !pastOnly && { ...ds.textStyles.display }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{title}</Text>}

          </View>
          <View style={[localStyles.headerActions, section === "challenge" && !pastOnly && localStyles.challengeHeaderActions]}>
          {!pastOnly ? <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.78}
            style={[localStyles.filterButton, localStyles.headerAction]}
            accessibilityLabel={section === "challenge" ? "Crear desafío" : "Crear evento"}
            onPress={() => {
              if (section === "challenge") {
                navigation.navigate("CreateChallenge" as never);
                return;
              }
              navigation.navigate("CreateEvent" as never);
            }}
          >
            <Icon name="add" size={ds.iconSize.md} color={vibesTheme.colors.primaryText} style={localStyles.createIcon} />
          </TouchableOpacity> : null}
          {section === "challenge" ? <TouchableOpacity
            accessibilityRole="button" accessibilityLabel={pastOnly ? "Volver a desafíos" : "Ver todos los desafíos"}
            onPress={() => {
              if (pastOnly) { navigation.goBack(); return; }
              setStartedOnly(false);
              setSearch("");
            }}
            style={[localStyles.filterButton, localStyles.headerAction]}
          ><Icon name={pastOnly ? "arrow-back" : "home-outline"} size={ds.iconSize.lg} color={vibesTheme.colors.primaryText} /></TouchableOpacity> : null}
          {!pastOnly && section === "challenge" && challengeTab === "public" ? <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Ya comenzados"
            accessibilityState={{ selected: startedOnly }}
            onPress={() => setStartedOnly(value => !value)}
            style={[localStyles.filterButton, localStyles.headerAction, startedOnly && { borderWidth: 1, borderColor: vibesTheme.colors.primaryText }]}
          ><Icon name="time-outline" size={ds.iconSize.lg} color={vibesTheme.colors.primaryText} /></TouchableOpacity> : null}
            {!pastOnly ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={section === "challenge" ? "Finalizados" : "Ver eventos pasados"}
                onPress={() => section === "challenge" ? navigation.navigate("PastChallenges" as never, { section: "challenge", challengeTab } as never) : navigation.navigate("PastEvents" as never)}
                style={[localStyles.filterButton, localStyles.headerAction]}
              >
                <Icon name="archive-outline" size={ds.iconSize.lg} color={vibesTheme.colors.primaryText} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>}
        {section === "challenge" && !pastOnly ? <>
          <View style={[pillTabStyles.selector, localStyles.challengeTabs]} accessibilityRole="tablist">
            {([ ["public", "Público"], ["private", "Mis desafíos"], ["vibes", "Por Vibes"] ] as const).map(([mode, label]) => <TouchableOpacity key={mode} accessibilityRole="tab" accessibilityState={{ selected: challengeTab === mode }} onPress={() => setChallengeTab(mode)} style={[pillTabStyles.tab, localStyles.challengeTab, challengeTab === mode && pillTabStyles.selected]}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[pillTabStyles.label, localStyles.challengeTabLabel, challengeTab === mode && pillTabStyles.selectedLabel]}>{label}</Text></TouchableOpacity>)}
          </View>
        </> : null}
        <View style={{ flex: 1, overflow: "hidden" }}>
        <Animated.View style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 2,
          backgroundColor: vibesTheme.colors.background,
          transform: [{ translateY: filtersProgress.interpolate({ inputRange: [0, 1], outputRange: [-filtersHeight, 0] }) }] }}>
        <View onLayout={event => { const height = event.nativeEvent.layout.height; if (height > 0) setFiltersHeight(height); }}>
        <View style={[styles.eventsSearchBar, localStyles.searchBar, localStyles.challengeSearch]}>
          <Icon name="search" size={ds.iconSize.md} color={TEXT_SECONDARY} />
          <TextInput
            style={[styles.eventsSearchInput, localStyles.searchInput, { ...ds.textStyles.body }]}
            placeholder={searchPlaceholder}
            placeholderTextColor={ds.colors.scrim}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />

        </View>

        {section === "event" ? <>
          <View style={localStyles.eventFilterRow}>
            {([
              ["date", "calendar-outline", "Fecha", Boolean(dateFrom || dateTo)],
              ["location", "location-outline", "Ubicación", Boolean(locationFilter)],
              ["other", "options-outline", "Más filtros", Boolean(frequentOnly || category || pricingType || participationType || modality)],
            ] as const).map(([panel, icon, label, active]) => <TouchableOpacity key={label} accessibilityRole="button" accessibilityLabel={`Filtrar por ${label}`} accessibilityState={{ expanded: filtersVisible && filterPanel === panel }} onPress={() => openFilters(panel)} style={[localStyles.eventFilterChip, active && { borderColor: vibesTheme.colors.primaryText, backgroundColor: ds.colors.bg.subtle }]}>
              <Icon name={icon} size={ds.iconSize.md} color={vibesTheme.colors.primaryText} />
              <Text numberOfLines={1} style={localStyles.eventFilterLabel}>{label}</Text>
              <Icon name="chevron-down" size={ds.iconSize.sm} color={vibesTheme.colors.primaryText} />
            </TouchableOpacity>)}
          </View>
          <DiscoverPathCards selected={spiritualPaths}
            onToggle={path => setSpiritualPaths(current => current.includes(path) ? current.filter(value => value !== path) : [...current, path])}
            onClear={() => setSpiritualPaths([])} />
        </> : null}
        </View>
        </Animated.View>
        {section === "challenge" && startedOnly && !pastOnly ? <Text style={localStyles.feedSectionTitle}>Ya comenzados</Text> : null}
        <FlatList
          data={listIsLoading ? [] : listItems}
          ListHeaderComponent={<View style={{ height: filtersHeight }} />}
          scrollEventThrottle={16}
          onScroll={event => {
            const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
            // Ignore bounce at either edge; the list viewport never changes height.
            const maxY = Math.max(0, contentSize.height - layoutMeasurement.height);
            const y = Math.min(maxY, Math.max(0, contentOffset.y));
            const delta = y - scrollPosition.current;
            scrollPosition.current = y;
            if (y < 16) { revealFilters(false); scrollDistance.current = 0; return; }
            if (Math.abs(delta) < 1) return;
            const direction = Math.sign(delta);
            if (direction !== scrollDirection.current) scrollDistance.current = 0;
            scrollDirection.current = direction;
            scrollDistance.current += Math.abs(delta);
            if (scrollDistance.current > 28) revealFilters(direction > 0);
          }}
          onEndReached={loadMoreFeed}
          onEndReachedThreshold={0.5}
          ListFooterComponent={feedIsFetchingNextPage && !listIsLoading ? <VibesLoader size={32} /> : null}
          keyExtractor={(item) =>
            item.kind === "feed" ? `${item.keyPrefix ?? "feed"}-${item.item.id}` : `${item.kind}-${item.id}`
          }
          contentContainerStyle={[
            styles.eventsListContent,
            localStyles.eventsListContent,
            { paddingBottom: pastOnly ? insets.bottom + ds.spacing[6] : getBottomTabContentPadding(insets.bottom, TAB_BAR_CONTENT_CLEARANCE + EVENTS_LIST_EXTRA_CLEARANCE) },
          ]}
          ListFooterComponentStyle={[
            localStyles.listFooter,
            section === "event" && expiredEventItems.length > 0
              ? localStyles.bottomAlignedListFooter
              : null,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={localStyles.emptyState}>
              {listIsLoading ? <VibesLoader size={48} /> : null}
              {!listIsLoading ? <Text style={localStyles.emptyTitle}>
                {error
                    ? "No se pudieron cargar"
                    : pastOnly
                      ? section === "challenge" ? "No hay desafíos finalizados" : "No hay eventos pasados"
                    : normalizedSearch
                      ? section === "challenge"
                        ? "No encontramos desafíos"
                        : "No encontramos eventos"
                    : section === "event" && expiredEventItems.length > 0
                      ? "No hay eventos vigentes"
                    : section === "challenge" && challengeTab === "vibes"
                      ? "Todavía no hay desafíos de Vibes"
                    : section === "challenge" && !startedOnly && challengeTab === "public" && generalChallengeItems.length > 0
                      ? "No hay desafíos próximos"
                    : section === "challenge" && startedOnly
                      ? "No hay desafíos ya comenzados"
                    : section === "challenge" && (upcomingGeneralChallengeItems.length > 0 || finishedChallengeItems.length > 0)
                      ? "No hay desafíos vigentes"
                    : section === "challenge"
                      ? challengeTab === "private" ? "Todavía no estás en ningún desafío" : "Todavía no hay desafíos públicos"
                      : t("events.noEventsYet")}
              </Text> : null}
              {!listIsLoading ? <Text style={localStyles.emptyText}>
                {error
                    ? errorMessage
                    : pastOnly
                      ? "Probá con otros filtros."
                    : normalizedSearch
                      ? "Probá con otro nombre, lugar o fecha."
                    : section === "event" && expiredEventItems.length > 0
                      ? pastOnly ? "Probá con otros filtros." : "Podés consultar el historial en Eventos pasados."
                    : section === "challenge" && challengeTab === "vibes"
                      ? "Pronto vas a encontrar acá desafíos pensados por Vibes para hacer cuando quieras."
                    : section === "challenge" && !startedOnly && challengeTab === "public" && generalChallengeItems.length > 0
                      ? "Encontrá los desafíos vigentes en Ya comenzados, junto al botón Crear."
                    : section === "challenge" && startedOnly
                      ? "Los desafíos aparecerán acá cuando llegue su fecha de inicio."
                    : section === "challenge" && upcomingGeneralChallengeItems.length > 0
                      ? "Los próximos están guardados abajo para que te sumes cuando quieras."
                    : section === "challenge" && finishedChallengeItems.length > 0
                      ? "Podés consultar los finalizados desde el ícono de archivo junto al título."
                    : section === "challenge"
                      ? "Creá un desafío para empezar."
                      : t("events.eventsEmpty")}
              </Text> : null}
              {error && !listIsLoading ? (
                <TouchableOpacity accessibilityRole="button" onPress={() => {
                  void (section === "challenge" ? challengesQuery : eventsQuery).refetch();
                  if (section === "challenge") void groupsQuery.refetch();
                }} style={{ padding: ds.spacing[4] }}>
                  <Text style={{ color: vibesTheme.colors.accentBlue, ...ds.textStyles.body }}>Reintentar</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          renderItem={({ item: listItem }) => {
            if (listItem.kind === "section") {
              return (
                <View style={[localStyles.feedSectionHeader, section === "event" && { marginTop: ds.spacing[4] }]}>
                  <Text style={[
                    localStyles.feedSectionTitle,
                    listItem.id === "general-challenges" && localStyles.activeChallengesTitle,
                    listItem.id === "joined-challenges" && localStyles.joinedChallengesTitle,
                  ]}>{listItem.title}</Text>
                  {listItem.subtitle ? (
                    <Text style={localStyles.feedSectionSubtitle}>
                      {listItem.subtitle}
                    </Text>
                  ) : null}
                </View>
              );
            }

            const item = listItem.item;
            const participantCount = parseParticipantCount(item.attendees);
            if (item.type === "event") {
              const sessions = normalizeSchedule(item.schedule, item.startsAt);
              const upcoming = nextEventSession(sessions);
              const startsAt = upcoming ? new Date(upcoming.startsAt) : sessions.length ? new Date(sessions[sessions.length - 1].startsAt) : null;
              const dateLabel = startsAt && !Number.isNaN(startsAt.getTime())
                ? `${startsAt.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "")} · ${startsAt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}`
                : item.date;
              const frequencyLabel = formatEventRecurrence(sessions);
              const scheduleLabel = sessions.length > 1 ? `${dateLabel} · ${sessions.length} horarios` : dateLabel;
              const count = item.participantCount ?? participantCount;
              const participantsLabel = `${count} ${count === 1 ? "participante" : "participantes"}`;
              return (
                <TouchableOpacity
                  style={localStyles.eventListRow}
                  activeOpacity={0.78}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver ${item.title}, ${scheduleLabel}, ${participantsLabel}`}
                  onPress={() => navigation.navigate("EventDetail" as never, { event: item } as never)}
                >
                  <View style={{ width: eventImageSize, height: eventImageSize }}>
                    <MediaImage
                      source={typeof item.image === "string" ? { uri: item.image } : item.image}
                      style={[localStyles.eventThumbnail, { width: eventImageSize, height: eventImageSize }]}
                    />
                    {listItem.featured ? <View style={{ position: "absolute", bottom: 4, left: 4 }}><ForYouTag /></View> : null}
                  </View>
                  <View style={localStyles.eventCopy}>
                    <Text style={localStyles.eventTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={localStyles.eventMetadataRow}>
                      <Icon name="calendar-outline" size={ds.iconSize.sm} color={vibesTheme.colors.accentBlue} />
                      <Text style={[localStyles.eventMetadataText, { color: vibesTheme.colors.accentBlue, fontFamily: vibesTheme.fonts.semibold }]} numberOfLines={1}>{dateLabel}</Text>
                    </View>
                    {item.location || item.modality === "online" ? <View style={localStyles.eventMetadataRow}>
                      <Icon name={item.modality === "online" ? "videocam-outline" : "location"} size={ds.iconSize.sm} color={vibesTheme.colors.secondaryText} />
                      <Text style={localStyles.eventMetadataText} numberOfLines={1}>{item.modality === "online" ? "Online" : item.location}</Text>
                    </View> : null}
                    {frequencyLabel || sessions.length > 1 || count > 1 ? <View style={localStyles.eventMetadataRow}>
                      <Icon name={sessions.length > 1 ? "repeat" : "people"} size={ds.iconSize.sm} color={vibesTheme.colors.secondaryText} />
                      <Text style={localStyles.eventMetadataText} numberOfLines={1}>{[frequencyLabel || (sessions.length > 1 ? `${sessions.length} horarios` : null), count > 1 ? `${count} personas` : null].filter(Boolean).join(" · ")}</Text>
                    </View> : null}
                  </View>
                  <View style={localStyles.eventViewButton}>
                    <Icon name="chevron-forward" size={ds.iconSize.md} color={vibesTheme.colors.secondaryText} />
                  </View>
                </TouchableOpacity>
              );
            }
            const challengeRow = (
              <ChallengeFeedCard item={item} featured={listItem.featured} joined={joinedChallengeIds.has(item.id)} onPress={() => navigation.navigate("ChallengeDetailScreen" as never, { event: item } as never)} footer={listItem.invitation || (listItem.restartable && viewerId) ? <>
                  {listItem.invitation ? (
                    <View style={localStyles.cardActions}>
                      <Text style={restartStyles.statusText}>
                        {t(
                          listItem.invitation.status === "rejected"
                            ? "challengeRestart.statusRejected"
                            : "challengeRestart.statusPending",
                        )}
                      </Text>
                      <TouchableOpacity
                        accessibilityRole="button"
                        style={restartStyles.pill}
                        disabled={respondInvitation.isPending}
                        onPress={() =>
                          viewerId &&
                          respondInvitation.mutate({ id: listItem.invitation!.id, accept: true, userId: viewerId })
                        }
                      >
                        <Text style={restartStyles.pillText}>{t("challengeRestart.accept")}</Text>
                      </TouchableOpacity>
                      {listItem.invitation.status === "pending" ? (
                        <TouchableOpacity
                          accessibilityRole="button"
                          style={restartStyles.pill}
                          disabled={respondInvitation.isPending}
                          onPress={() =>
                            viewerId &&
                            respondInvitation.mutate({ id: listItem.invitation!.id, accept: false, userId: viewerId })
                          }
                        >
                          <Text style={restartStyles.pillText}>{t("challengeRestart.reject")}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ) : null}
                  {listItem.restartable && viewerId ? (
                    <View style={localStyles.cardActions}>
                      <TouchableOpacity
                        accessibilityRole="button"
                        style={restartStyles.pill}
                        onPress={() => setRestartTarget(item)}
                      >
                        <Icon name="refresh-outline" size={ds.iconSize.sm} color={vibesTheme.colors.accentBlue} />
                        <Text style={restartStyles.pillText}>{t(isCuratedChallenge(item) ? "challengeRestart.start" : "challengeRestart.restart")}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
              </> : null} />
            );
            return listItem.reveal ? (
              <AccordionReveal>{challengeRow}</AccordionReveal>
            ) : challengeRow;
          }}
        />
        </View>
      </View>
      <KeyboardSheetModal visible={filtersVisible && section === "event"} onClose={() => setFiltersVisible(false)}>
        <View style={[localStyles.filtersSheet, { maxHeight: "100%" }]}>
        <View style={localStyles.filterHandle} />
        <View style={localStyles.filterHeader}>
          <Text style={localStyles.filterTitle}>{filterPanel === "date" ? "Fecha" : filterPanel === "location" ? "Ubicación" : "Otros filtros"}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar filtros" onPress={() => setFiltersVisible(false)} style={localStyles.filterButton}>
            <Icon name="close" size={ds.iconSize.lg} color={vibesTheme.colors.primaryText} />
          </TouchableOpacity>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={localStyles.filterContent} showsVerticalScrollIndicator={false}>
          {filterPanel === "location" ? <>
          <EventClassificationPicker
            filter
            searchable
            label="Ubicación"
            options={locationOptions}
            value={draftLocation || null}
            onChange={(value) => setDraftLocation(value ?? "")}
          />
          </> : null}
          {filterPanel === "date" ? <>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={localStyles.filterActionText}>Fecha</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Restablecer filtro de fecha"
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            onPress={() => {
              Keyboard.dismiss();
              setDateField(null);
              setDraftDatePreset(null);
              setDraftDateFrom(null);
              setDraftDateTo(null);
            }}
          >
            <Icon name="refresh-outline" size={ds.iconSize.md} color={vibesTheme.colors.primaryText} />
          </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", gap: ds.spacing[3] }}>
            {(["from", "to"] as const).map((field) => {
              const date = field === "from" ? draftDateFrom : draftDateTo;
              const label = field === "from" ? "Desde" : "Hasta";
              return (
                <View key={field} style={localStyles.dateField}>
                  {date ? <Text style={localStyles.dateFieldLabel}>{label}</Text> : null}
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={date ? `${label}: ${formatEventFilterDate(date)}` : label}
                    style={[localStyles.filterClear, localStyles.dateFilterButton]}
                    onPress={() => { Keyboard.dismiss(); setDateField(field); }}
                  >
                    <Text style={localStyles.dateFieldText}>{date ? formatEventFilterDate(date) : label}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
          {!pastOnly ? (
            <View style={localStyles.datePresets}>
              {([
                ["today", "Hoy"], ["tomorrow", "Mañana"],
                ["week", "Esta semana"], ["month", "Este mes"],
              ] as const).map(([preset, label]) => {
                const range = getEventDatePreset(preset);
                const selected = draftDatePreset === preset;
                return (
                  <TouchableOpacity key={preset} accessibilityRole="button" accessibilityState={{ selected }}
                    style={[localStyles.datePreset, selected && localStyles.datePresetSelected]}
                    onPress={() => {
                      Keyboard.dismiss();
                      setDateField(null);
                      setDraftDatePreset(selected ? null : preset);
                      setDraftDateFrom(selected ? null : range.from);
                      setDraftDateTo(selected ? null : range.to);
                    }}>
                    <Text style={[localStyles.datePresetText, selected && { color: vibesTheme.colors.surface }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
          {dateField ? <DateTimePicker
            value={new Date(Math.max(
              ((dateField === "from" ? draftDateFrom : draftDateTo) ?? today).getTime(),
              (dateField === "from" ? minimumDate : endMinimumDate)?.getTime() ?? -Infinity
            ))}
            minimumDate={dateField === "from" ? minimumDate : endMinimumDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, date) => {
              if (Platform.OS !== "ios") setDateField(null);
              if (event.type === "set" && date) {
                const normalized = new Date(date);
                normalized.setHours(0, 0, 0, 0);
                if (minimumDate && normalized < minimumDate) return;
                setDraftDatePreset(null);
                if (dateField === "from") {
                  setDraftDateFrom(normalized);
                  if (draftDateTo && draftDateTo < normalized) setDraftDateTo(normalized);
                }
                else setDraftDateTo(normalized);
              }
            }}
          /> : null}
          {invalidDateRange ? <Text style={{ color: vibesTheme.colors.primaryText }}>La fecha final debe ser igual o posterior a la inicial.</Text> : null}
          </> : null}
          {filterPanel === "other" ? <>
          <EventClassificationPicker filter label="Frecuencia" options={[{ id: "frequent", label: "Frecuentes" }] as const} value={draftFilters.frequentOnly ? "frequent" : null} onChange={(value) => setDraftFilters(draft => ({ ...draft, frequentOnly: value === "frequent" }))} />
          <EventClassificationPicker filter label="Precio" options={[{ id: "free", label: "Gratis" }, { id: "paid", label: "Pago" }] as const} value={draftFilters.pricingType} onChange={(value) => setDraftFilters((draft) => ({ ...draft, pricingType: value }))} />
          <EventClassificationPicker filter label="Tipo de evento" options={availableCategories} value={draftFilters.category} onChange={(value) => setDraftFilters((draft) => ({ ...draft, category: value }))} />
          <EventClassificationPicker filter label="Participación" options={availableParticipationTypes} value={draftFilters.participationType} onChange={(value) => setDraftFilters((draft) => ({ ...draft, participationType: value }))} />
          <EventClassificationPicker filter label="Modalidad" options={EVENT_MODALITIES} value={draftFilters.modality} onChange={(value) => setDraftFilters((draft) => ({ ...draft, modality: value }))} />
          </> : null}
        </ScrollView>
        <View style={[localStyles.filterFooter, { paddingBottom: Math.max(insets.bottom, ds.spacing[4]) }]}>
          <TouchableOpacity accessibilityRole="button" style={localStyles.filterClear} onPress={() => {
            if (filterPanel === "other") setDraftFilters({ frequentOnly: false, pricingType: null, category: null, participationType: null, modality: null });
            if (filterPanel === "date") { setDraftDatePreset(null); setDraftDateFrom(null); setDraftDateTo(null); setDateField(null); }
            if (filterPanel === "location") setDraftLocation("");
          }}>
            <Text style={localStyles.filterActionText}>Limpiar</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" disabled={filterPanel === "date" && invalidDateRange} style={[localStyles.filterApply, filterPanel === "date" && invalidDateRange && { opacity: 0.5 }]} onPress={() => {
            if (filterPanel === "date") {
              setDatePreset(draftDatePreset); setDateFrom(draftDateFrom); setDateTo(draftDateTo);
            }
            if (filterPanel === "location") setLocationFilter(draftLocation.trim());
            if (filterPanel === "other") {
              setFrequentOnly(draftFilters.frequentOnly); setCategory(draftFilters.category); setPricingType(draftFilters.pricingType); setParticipationType(draftFilters.participationType); setModality(draftFilters.modality);
            }
            setFiltersVisible(false);
          }}>
            <Text style={localStyles.filterActionText}>Aplicar</Text>
          </TouchableOpacity>
        </View>
        </View>
      </KeyboardSheetModal>
      <RestartChallengeConfirmSheet
        visible={Boolean(restartTarget)}
        curated={Boolean(restartTarget && isCuratedChallenge(restartTarget))}
        onClose={() => setRestartTarget(null)}
        onConfirm={() => {
          const source = restartTarget;
          setRestartTarget(null);
          if (source) navigation.navigate("RestartChallenge" as never, { source } as never);
        }}
      />
    </ScreenContainer>
  );
};

export default Events;

const localStyles = StyleSheet.create({
  headerAction: { borderRadius: ds.radii.lg, backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.subtle) },
tabRow: {
    flexDirection: "row",
    gap: vibesTheme.spacing[2],
    marginBottom: vibesTheme.spacing[6],
  },
tab: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: vibesTheme.radii.pill,
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.scrim),
    backgroundColor: "transparent",
  },
tabSelected: {
    borderColor: vibesTheme.colors.accentMustard,
    backgroundColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.strong),
  },
tabText: { color: vibesTheme.colors.secondaryText, ...ds.textStyles.subtitle },
tabTextSelected: { color: vibesTheme.colors.primaryText },
cardActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: vibesTheme.spacing[2],
    marginTop: vibesTheme.spacing[2],
  },
filterButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
filterBadge: { position: "absolute", top: 0, right: 0, minWidth: 18, height: 18, borderRadius: ds.radii.pill, alignItems: "center", justifyContent: "center", backgroundColor: vibesTheme.colors.accentMustard },
filterBadgeText: { color: vibesTheme.colors.primaryText, ...ds.textStyles.micro },
filtersSheet: { maxHeight: "85%", backgroundColor: vibesTheme.colors.background, borderTopLeftRadius: ds.radii.xl, borderTopRightRadius: ds.radii.xl },
filterHandle: { width: 40, height: 4, borderRadius: ds.radii.pill, alignSelf: "center", marginTop: ds.spacing[3], backgroundColor: ds.withAlpha(ds.colors.base.ink, ds.opacity.medium) },
filterHeader: { paddingHorizontal: ds.spacing[5], paddingTop: ds.spacing[3], flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
filterTitle: { ...ds.textStyles.title, color: vibesTheme.colors.primaryText },
filterContent: { paddingHorizontal: ds.spacing[5], paddingBottom: ds.spacing[4] },
filterFooter: { flexDirection: "row", gap: ds.spacing[3], paddingHorizontal: ds.spacing[5], paddingTop: ds.spacing[3], borderTopWidth: 1, borderTopColor: ds.colors.border.subtle },
filterClear: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: ds.withAlpha(ds.colors.base.ink, ds.opacity.medium), borderRadius: ds.radii.xl, alignItems: "center", justifyContent: "center" },
datePresets: { flexDirection: "row", flexWrap: "wrap", gap: ds.spacing[2], marginTop: ds.spacing[3] },
datePreset: { minHeight: 44, paddingHorizontal: ds.spacing[3], borderRadius: ds.radii.xl, borderWidth: 1, borderColor: vibesTheme.colors.secondaryText, backgroundColor: vibesTheme.colors.surface, justifyContent: "center" },
datePresetSelected: { backgroundColor: vibesTheme.colors.primaryText, borderColor: vibesTheme.colors.primaryText },
datePresetText: { ...ds.textStyles.bodySmall, color: vibesTheme.colors.primaryText },
dateField: { flex: 1, justifyContent: "flex-end", gap: ds.spacing[2] },
dateFieldLabel: { color: vibesTheme.colors.primaryText, ...ds.textStyles.bodySmall, paddingLeft: ds.spacing[3] },
dateFieldText: { color: vibesTheme.colors.primaryText, ...ds.textStyles.body },
dateFilterButton: { flex: 0, backgroundColor: vibesTheme.colors.accentMustard, borderColor: vibesTheme.colors.primaryText },
filterApply: { flex: 1, minHeight: 48, borderRadius: ds.radii.xl, alignItems: "center", justifyContent: "center", backgroundColor: vibesTheme.colors.accentMustard },
filterActionText: { color: vibesTheme.colors.primaryText, ...ds.textStyles.subtitle },
eventListRow: {
    width: "100%", flexDirection: "row", alignItems: "center", gap: ds.spacing[3],
    padding: ds.spacing[3], marginBottom: ds.spacing[3], borderRadius: ds.radii.lg,
    borderWidth: 1, borderColor: ds.colors.border.default,
    backgroundColor: vibesTheme.colors.surface,
  },
eventThumbnail: {
    width: 88, height: 88, borderRadius: ds.radii.md,
    backgroundColor: ds.colors.feedback.infoBg,
  },
eventCopy: { flex: 1, minWidth: 0, gap: ds.spacing[1] },
eventTitle: {
    ...ds.textStyles.subtitle, 
    color: vibesTheme.colors.primaryText,
  },
eventMetadataRow: { flexDirection: "row", alignItems: "center", gap: ds.spacing[2] },
eventMetadataText: {
    flex: 1, ...ds.textStyles.bodySmall, color: vibesTheme.colors.secondaryText,
  },
eventViewButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: ds.spacing[1],
    minWidth: 22, minHeight: 44,
  },
eventViewText: {
    ...ds.textStyles.label, color: vibesTheme.colors.primaryText,
  },
eventsContainer: {
    paddingTop: /* ds-lint-allow layout: paddingTop 68 (medida de layout fuera de la escala) */ 68,
  },
challengeHeaderRow: { flexDirection: "row", alignItems: "center", gap: ds.spacing[2], marginBottom: ds.spacing[4] },
challengeHeaderActions: { alignSelf: "center" },
challengeTabs: { marginBottom: ds.spacing[3] },
challengeTab: { paddingHorizontal: ds.spacing[3], paddingVertical: ds.spacing[2] },
challengeTabLabel: { flexShrink: 1, textAlign: "center" },
challengeTitleRow: { flex: 1, minWidth: 0 },
headerActions: { flexDirection: "row", alignItems: "center", alignSelf: "flex-end", gap: ds.spacing[2] },
headerRow: {
    minHeight: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: ds.spacing[2],
    marginBottom: ds.spacing[5],
  },
screenTitle: {
    flexShrink: 1,
    color: TEXT_PRIMARY,
    ...ds.textStyles.title,
    marginBottom: 0,
    textAlign: "left",
  },
titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
listFooter: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: ds.spacing[2],
    marginBottom: ds.spacing[5],
  },
bottomAlignedListFooter: {
    marginTop: "auto",
  },
eventsListContent: {
    flexGrow: 1,
  },
createIcon: { lineHeight: ds.iconSize.md, includeFontPadding: false },
searchBar: {
    height: 40,
    paddingVertical: 0,
  },
searchInput: {
    paddingVertical: 0,
    ...ds.textStyles.labelMedium,
    color: vibesTheme.colors.primaryText,
  },
feedSectionHeader: {
    marginTop: ds.spacing[1],
    marginBottom: ds.spacing[3],
    paddingHorizontal: ds.spacing[1],
  },
feedSectionTitle: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.title,
  },
activeChallengesTitle: {
    ...ds.textStyles.heading,
  },
joinedChallengesTitle: {
    marginTop: ds.spacing[3],
    ...ds.textStyles.heading,
    color: vibesTheme.colors.primaryText,
  },
feedSectionSubtitle: {
    marginTop: ds.spacing[1],
    color: ds.withAlpha(ds.colors.base.ink, ds.opacity.high),
    ...ds.textStyles.subtitleMedium,
  },
feedRowCard: {
    minHeight: 98,
    borderRadius: ds.radii.xl,
    backgroundColor: vibesTheme.colors.background,
    borderWidth: 1,
    borderColor: ds.colors.border.subtle,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[3],
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[4],
    marginBottom: ds.spacing[3],
    ...ds.shadows.md,
  },
feedRowThumb: {
    width: 64,
    height: 64,
    borderRadius: ds.radii.pill,
    backgroundColor: vibesTheme.colors.background,
  },
feedRowThumbWrap: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
feedRowContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
  },
feedRowContentChallenge: {
    alignItems: "flex-start",
  },
feedRowCopy: {
    flex: 1,
    justifyContent: "center",
  },
feedRowTopMeta: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: ds.spacing[2],
  },
feedRowTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[2],
  },
feedRowTitle: {
    flex: 1,
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.heading,
  },
feedRowMeta: {
    marginTop: ds.spacing[1],
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.subtitle,
  },
communityTodayRow: {
    marginTop: ds.spacing[2],
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[1],
  },
communityTodayText: {
    flex: 1,
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.label,
  },
feedThumbProgressPill: {
    position: "absolute",
    top: -6,
    alignSelf: "center",
    borderRadius: ds.radii.pill,
    minWidth: 84,
    paddingHorizontal: ds.spacing[2],
    paddingVertical: ds.spacing[1],
    backgroundColor: ds.colors.base.blue,
    borderWidth: 1,
    borderColor: ds.colors.bg.surfaceTranslucent,
  },
feedThumbProgressPillPending: {
    backgroundColor: ds.colors.bg.surfaceTranslucent,
    borderColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.higher),
  },
feedThumbProgressText: {
    color: vibesTheme.colors.background,
    ...ds.textStyles.caption,
    textAlign: "center",
  },
feedThumbProgressTextPending: {
    color: vibesTheme.colors.primaryText,
  },
feedInlineProgressPill: {
    borderRadius: ds.radii.pill,
    paddingHorizontal: ds.spacing[3],
    paddingVertical: ds.spacing[1],
    flexShrink: 0,
  },
feedInlineProgressText: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.caption,
  },
feedRowBottom: {
    width: "100%",
    marginTop: ds.spacing[3],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: ds.spacing[3],
  },
feedParticipantsWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[2],
  },
feedParticipantsCount: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.label,
  },
feedParticipantsCountWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[1],
  },
feedRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
  },
avatarStack: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
stackAvatar: {
    width: 36,
    height: 36,
    borderRadius: ds.radii.pill,
    borderWidth: 2,
    borderColor: vibesTheme.colors.background,
    backgroundColor: ds.withAlpha(ds.colors.base.coral, ds.opacity.medium),
  },
feedRowArrow: {
    width: 34,
    height: 34,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
progressPill: {
    alignSelf: "flex-start",
    marginTop: ds.spacing[2],
    borderRadius: ds.radii.pill,
    paddingHorizontal: ds.spacing[3],
    paddingVertical: ds.spacing[1],
    backgroundColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.medium),
  },
progressPillPending: {
    backgroundColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.medium),
  },
progressPillDone: {
    backgroundColor: ds.withAlpha(ds.colors.base.coral, ds.opacity.medium),
  },
progressPillText: {
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.label,
  },
emptyState: {
    paddingHorizontal: ds.spacing[8],
    paddingVertical: ds.spacing[12],
    alignItems: "center",
  },
emptyTitle: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.title,
    textAlign: "center",
  },
emptyText: {
    marginTop: ds.spacing[3],
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.subtitleMedium,
    textAlign: "center",
  },
eventFilterRow: { flexDirection: "row", gap: ds.spacing[2], marginBottom: ds.spacing[3] },
eventFilterChip: { flex: 1, minHeight: 44, borderRadius: ds.radii.md, borderWidth: 1, borderColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.medium), flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: ds.spacing[2], gap: ds.spacing[2] },
eventFilterLabel: { flexShrink: 1, ...ds.textStyles.labelMedium, color: vibesTheme.colors.primaryText },
eventCategoriesScroll: { flexGrow: 0, flexShrink: 0 },
eventCategories: { gap: ds.spacing[2], paddingBottom: ds.spacing[3] },
eventCategory: { borderRadius: ds.radii.xl, paddingHorizontal: ds.spacing[4], minHeight: 44, justifyContent: "center", backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.subtle) },
eventCategoryLabel: { ...ds.textStyles.label, color: vibesTheme.colors.secondaryText },
challengeSearch: { minHeight: 48, borderRadius: ds.radii.lg, backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.subtle), borderWidth: 1, borderColor: vibesTheme.colors.borderSoft },
challengeCount: { color: vibesTheme.colors.accentBlue, ...ds.textStyles.body },
challengeExploreButton: { backgroundColor: vibesTheme.colors.primaryText, padding: ds.spacing[4], borderRadius: ds.radii.xl, marginTop: ds.spacing[4] },
footerToggleGroup: {
    gap: ds.spacing[3],
  },
finishedSectionSubtitle: {
    marginTop: ds.spacing[1],
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.labelMedium,
  }
});
