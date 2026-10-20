import { sectionTabStyles } from "../components/SectionTabStyles";
import BackButton from "../components/BackButton";
import ChallengeFeedCard from "../components/ChallengeFeedCard";
import { eventHasExpired, normalizeSchedule, nextEventSession, sortEventsByDate } from "../src/lib/eventSchedule";
import MediaImage from "../components/MediaImage";
import DateTimePicker from "@react-native-community/datetimepicker";
import ScreenContainer from "../components/ScreenContainer";
import { matchesEventDateAndLocation, getEventLocationOptions, getEventDatePreset, formatEventFilterDate, type EventDatePreset } from "../src/lib/eventFilters";
import KeyboardSheetModal from "../components/KeyboardSheetModal";
import EventClassificationPicker from "../components/EventClassificationPicker";
import { EVENT_MODALITIES, EVENT_CATEGORIES, EVENT_PARTICIPATION_TYPES, getEventCategoryLabel, getEventParticipationLabel, matchesEventClassification, type EventCategory, type EventParticipationType } from "../src/constants/eventClassification";
/** @format */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, View, FlatList, TouchableOpacity, StyleSheet, ScrollView, Keyboard, Platform } from "react-native";
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
import { getBottomTabContentPadding } from "../src/lib/tabBarLayout";
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

type FeedListItem =
  | {
      kind: "section";
      id: string;
      title: string;
      subtitle?: string;
    }
  | {
      kind: "accordion";
      id: ChallengeBlock;
      title: string;
      count: number;
      open: boolean;
    }
  | {
      kind: "feed";
      item: EventFeedItem;
      restartable?: boolean;
      invitation?: ReceivedChallengeInvitation;
      keyPrefix?: string;
      reveal?: boolean;
    };

type PrivateBlock = "mine" | "invitations" | "participating";
type PublicBlock = "joined" | "active" | "upcoming";
type ChallengeBlock = PrivateBlock | PublicBlock;

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
  section: requestedSection,
}: {
  pastOnly?: boolean;
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
  const [draftFilters, setDraftFilters] = useState<{
    pricingType: "free" | "paid" | null;
    participationType: EventParticipationType | null;
    modality: EventModality | null;
  }>({ pricingType: null, participationType: null, modality: null });
  const activeFilterCount = [category, participationType, modality, dateFrom, dateTo, locationFilter.trim()].filter(Boolean).length;
  const [filterPanel, setFilterPanel] = useState<"date" | "location" | "other">("date");
  const openFilters = (panel: "date" | "location" | "other") => {
    setFilterPanel(panel);
    Keyboard.dismiss();
    setDraftFilters({ pricingType, participationType, modality });
    setDraftDatePreset(datePreset);
    setDraftDateFrom(dateFrom);
    setDraftDateTo(dateTo);
    setDraftLocation(locationFilter);
    setDateField(null);
    setFiltersVisible(true);
  };

  const [search, setSearch] = useState("");
  const [startedOnly, setStartedOnly] = useState(false);
  const [challengeTab, setChallengeTab] = useState<"public" | "private">(route.params?.challengeTab === "private" ? "private" : "public");
  // Lazy loading: the feed loads page by page while scrolling. Search,
  // filters and the views that group or sort the whole set (past, already
  // started, private) need every row, so they load the remaining pages.
  const needsFullFeed =
    pastOnly ||
    startedOnly ||
    (section === "challenge" && challengeTab === "private") ||
    normalizeSearchText(search).length > 0 ||
    activeFilterCount > 0 ||
    pricingType !== null;
  const eventsQuery = useEventsFeedQuery({ loadAll: section === "event" && needsFullFeed });
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
  const loadMoreFeed = useCallback(() => {
    if (feedHasNextPage && !feedIsFetchingNextPage) void fetchNextFeedPage();
  }, [feedHasNextPage, feedIsFetchingNextPage, fetchNextFeedPage]);
  const [openBlocks, setOpenBlocks] = useState<Record<ChallengeBlock, boolean>>({
    mine: true,
    invitations: false,
    participating: false,
    joined: true,
    active: true,
    upcoming: false,
  });
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
  const normalizedSearch = normalizeSearchText(search);
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Private challenges (restarted copies and other private ones) live only in the "Privada" tab.
      if (section === "challenge" && !pastOnly && startedOnly && (isUpcomingChallenge(item) || isFinishedChallenge(item))) return false;
      if (section === "challenge" && (item.visibility === "private") !== (challengeTab === "private")) return false;
      if (section === "event" && !matchesEventDateAndLocation(item, dateFrom, dateTo, locationFilter)) return false;
      if (section === "event" && !matchesEventClassification(item, category, participationType, modality)) return false;
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
  }, [items, challengeTab, startedOnly, pastOnly, pricingType, normalizedSearch, section, category, participationType, modality, dateFrom, dateTo, locationFilter]);

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

  const joinedChallengeIds = useMemo(
    () =>
      new Set(
        myEventGroups
          .filter((group) => group.eventType === "challenge")
          .map((group) => group.eventId),
      ),
    [myEventGroups],
  );

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

  const listItems = useMemo<FeedListItem[]>(() => {
    if (section !== "challenge") {
      const joinedIds = new Set(myEventGroups.filter((group) => group.eventType === "event").map((group) => group.eventId));
      const joined = visibleItems.filter((item) => joinedIds.has(item.id));
      const others = visibleItems.filter((item) => !joinedIds.has(item.id));
      return [
        ...(joined.length ? [{ kind: "section" as const, id: "your-events", title: "Tus eventos", subtitle: "En los que te anotaste" }] : []),
        ...joined.map((item) => ({ kind: "feed" as const, item })),
        ...(joined.length && others.length ? [{ kind: "section" as const, id: "discover-events", title: "Más eventos" }] : []),
        ...others.map((item) => ({ kind: "feed" as const, item })),
      ];
    }

    if (pastOnly) {
      return finishedChallengeItems.map((item) => ({ kind: "feed" as const, item, restartable: true }));
    }

    if (challengeTab === "private") {
      const mine = sortChallengesByStartsAt(
        filteredItems.filter((item) => item.createdBy === viewerId && !isFinishedChallenge(item)),
      );
      const participating = sortChallengesByStartsAt(
        filteredItems.filter(
          (item) => item.createdBy !== viewerId && joinedChallengeIds.has(item.id) && !isFinishedChallenge(item),
        ),
      );
      const invitations = (invitationsQuery.data ?? []).filter(
        (invitation) =>
          invitation.status !== "accepted" &&
          (!normalizedSearch || normalizeSearchText(invitation.challenge.title).includes(normalizedSearch)),
      );
      const blocks: Array<[PrivateBlock, FeedListItem[]]> = [
        ["mine", mine.map((item) => ({ kind: "feed" as const, item, keyPrefix: "mine", reveal: true }))],
        ["invitations", invitations.map((invitation) => ({
          kind: "feed" as const,
          item: invitation.challenge,
          invitation,
          keyPrefix: "invitation",
          reveal: true,
        }))],
        ["participating", participating.map((item) => ({ kind: "feed" as const, item, keyPrefix: "participating", reveal: true }))],
      ];
      const titles: Record<PrivateBlock, string> = {
        mine: t("challengeRestart.blockMine"),
        invitations: t("challengeRestart.blockInvitations"),
        participating: t("challengeRestart.blockParticipating"),
      };
      return blocks
        .filter(([, rows]) => rows.length > 0)
        .flatMap(([id, rows]) => [
          { kind: "accordion" as const, id, title: titles[id], count: rows.length, open: openBlocks[id] },
          ...(openBlocks[id] ? rows : []),
        ]);
    }

    const upcoming = sortChallengesByStartsAt([...joinedUpcomingChallengeItems, ...upcomingGeneralChallengeItems]);
    if (startedOnly) return sortChallengesByStartsAt([...joinedChallengeItems, ...generalChallengeItems]).map(item => ({ kind: "feed" as const, item }));
    return [
      ...(joinedChallengeItems.length ? [{ kind: "section" as const, id: "active-challenges", title: "En curso" }, ...joinedChallengeItems.map(item => ({ kind: "feed" as const, item }))] : []),
      ...(upcoming.length ? [{ kind: "section" as const, id: "upcoming-challenges", title: "Empieza pronto" }, ...upcoming.map(item => ({ kind: "feed" as const, item }))] : []),
    ];
  }, [
    myEventGroups,
    expiredEventItems,
    finishedChallengeItems,
    generalChallengeItems,
    joinedChallengeItems,
    joinedUpcomingChallengeItems,
    section,
    pastOnly,
    upcomingGeneralChallengeItems,
    visibleItems,
    challengeTab,
    startedOnly,
    filteredItems,
    invitationsQuery.data,
    joinedChallengeIds,
    normalizedSearch,
    openBlocks,
    t,
    viewerId,
  ]);

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
    <ScreenContainer edges={pastOnly ? ["top", "left", "right"] : []} style={styles.bg}>
      <View style={[styles.eventsContainer, localStyles.eventsContainer, pastOnly && { paddingTop: 12 }]}>
        <View style={localStyles.headerRow}>
          {pastOnly ? (
            <BackButton accessibilityRole="button" accessibilityLabel="Volver" onPress={() => navigation.goBack()} style={localStyles.filterButton} />
          ) : null}
          <View style={localStyles.titleRow}>
            <Text style={[styles.eventsTitle, localStyles.screenTitle, !pastOnly && { fontFamily: vibesTheme.fonts.extraBold, fontSize: 34, lineHeight: 42 }]}>{title}</Text>

          </View>
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
            <Icon name="add" size={20} color={vibesTheme.colors.primaryText} style={localStyles.createIcon} />
          </TouchableOpacity> : null}
          {section === "challenge" ? <TouchableOpacity
            accessibilityRole="button" accessibilityLabel="Ver todos los desafíos"
            onPress={() => {
              setStartedOnly(false);
              setSearch("");
              if (pastOnly) navigation.navigate("Events" as never, { section: "challenge" } as never);
            }}
            style={[localStyles.filterButton, localStyles.headerAction]}
          ><Icon name="home-outline" size={22} color={vibesTheme.colors.primaryText} /></TouchableOpacity> : null}
          {!pastOnly && section === "challenge" ? <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Ya comenzados"
            accessibilityState={{ selected: startedOnly }}
            onPress={() => setStartedOnly(value => !value)}
            style={[localStyles.filterButton, localStyles.headerAction, startedOnly && { borderWidth: 1, borderColor: vibesTheme.colors.primaryText }]}
          ><Icon name="time-outline" size={22} color={vibesTheme.colors.primaryText} /></TouchableOpacity> : null}
            {!pastOnly ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={section === "challenge" ? "Finalizados" : "Ver eventos pasados"}
                onPress={() => section === "challenge" ? navigation.navigate("PastChallenges" as never, { section: "challenge", challengeTab } as never) : navigation.navigate("PastEvents" as never)}
                style={[localStyles.filterButton, localStyles.headerAction]}
              >
                <Icon name="archive-outline" size={23} color={vibesTheme.colors.primaryText} />
              </TouchableOpacity>
            ) : null}
        </View>
        {section === "event" && !pastOnly ? <Text style={localStyles.eventSubtitle}>Encontrá tu próximo plan.</Text> : null}
        {section === "challenge" && !pastOnly ? <>
          <Text style={localStyles.challengeSubtitle}>Pequeños pasos, en buena compañía.</Text>
          <View style={sectionTabStyles.tabs} accessibilityRole="tablist">
            {([ ["public", "Público"], ["private", "Privado"] ] as const).map(([mode, label]) => <TouchableOpacity key={mode} accessibilityRole="tab" accessibilityState={{ selected: challengeTab === mode }} onPress={() => setChallengeTab(mode)} style={[sectionTabStyles.tab, challengeTab === mode && sectionTabStyles.active]}><Text style={[sectionTabStyles.text, challengeTab === mode && sectionTabStyles.activeText]}>{label}</Text></TouchableOpacity>)}
          </View>
        </> : null}
        <View style={[styles.eventsSearchBar, localStyles.searchBar, localStyles.challengeSearch]}>
          <Icon name="search" size={20} color={TEXT_SECONDARY} />
          <TextInput
            style={[styles.eventsSearchInput, localStyles.searchInput, { fontSize: 16 }]}
            placeholder={searchPlaceholder}
            placeholderTextColor="rgba(43, 43, 43, 0.34)"
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
              ["other", "options-outline", "Otros", Boolean(pricingType || participationType || modality)],
            ] as const).map(([panel, icon, label, active]) => <TouchableOpacity key={label} accessibilityRole="button" accessibilityLabel={`Filtrar por ${label}`} accessibilityState={{ expanded: filtersVisible && filterPanel === panel }} onPress={() => openFilters(panel)} style={[localStyles.eventFilterChip, active && { borderColor: vibesTheme.colors.primaryText, backgroundColor: `${vibesTheme.colors.primaryText}0C` }]}>
              <Icon name={icon} size={18} color={vibesTheme.colors.primaryText} />
              <Text numberOfLines={1} style={localStyles.eventFilterLabel}>{label}</Text>
              <Icon name="chevron-down" size={14} color={vibesTheme.colors.primaryText} />
            </TouchableOpacity>)}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={localStyles.eventCategoriesScroll} contentContainerStyle={localStyles.eventCategories}>
            {[{ id: null, label: "Todos" }, ...EVENT_CATEGORIES].map(option => <TouchableOpacity key={option.id ?? "all"} accessibilityRole="button" accessibilityState={{ selected: category === option.id }} onPress={() => setCategory(option.id)} style={[localStyles.eventCategory, category === option.id && { backgroundColor: vibesTheme.colors.primaryText }]}><Text style={[localStyles.eventCategoryLabel, category === option.id && { color: vibesTheme.colors.surface }]}>{option.label}</Text></TouchableOpacity>)}
          </ScrollView>
        </> : null}
        {section === "challenge" && startedOnly && !pastOnly ? <Text style={localStyles.feedSectionTitle}>Ya comenzados</Text> : null}
        <FlatList
          data={listIsLoading ? [] : listItems}
          onEndReached={loadMoreFeed}
          onEndReachedThreshold={0.5}
          ListFooterComponent={feedIsFetchingNextPage && !listIsLoading ? <VibesLoader size={32} /> : null}
          keyExtractor={(item) =>
            item.kind === "feed" ? `${item.keyPrefix ?? "feed"}-${item.item.id}` : `${item.kind}-${item.id}`
          }
          contentContainerStyle={[
            styles.eventsListContent,
            localStyles.eventsListContent,
            { paddingBottom: pastOnly ? insets.bottom + 24 : getBottomTabContentPadding(insets.bottom, 140) },
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
                    : section === "challenge" && !startedOnly && challengeTab === "public" && generalChallengeItems.length > 0
                      ? "No hay desafíos próximos"
                    : section === "challenge" && startedOnly
                      ? "No hay desafíos ya comenzados"
                    : section === "challenge" && (upcomingGeneralChallengeItems.length > 0 || finishedChallengeItems.length > 0)
                      ? "No hay desafíos vigentes"
                    : section === "challenge"
                      ? challengeTab === "private" ? "Todavía no tenés desafíos privados" : "Todavía no hay desafíos públicos"
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
                }} style={{ padding: 16 }}>
                  <Text style={{ color: vibesTheme.colors.accentBlue, fontSize: 18 }}>Reintentar</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          renderItem={({ item: listItem }) => {
            if (listItem.kind === "accordion") {
              return (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ expanded: listItem.open }}
                  style={[localStyles.feedSectionHeader, localStyles.accordionSectionHeader]}
                  activeOpacity={0.85}
                  onPress={() =>
                    setOpenBlocks((previous) => ({
                      ...previous,
                      [listItem.id]: !previous[listItem.id],
                    }))
                  }
                >
                  <Text style={[localStyles.feedSectionTitle, localStyles.accordionSectionTitle]}>
                    {listItem.title}{" "}
                    <Text style={localStyles.accordionSectionCount}>({listItem.count})</Text>
                  </Text>
                  <Icon
                    name={listItem.open ? "chevron-up" : "chevron-down"}
                    size={22}
                    color={vibesTheme.colors.accentBlue}
                  />
                </TouchableOpacity>
              );
            }
            if (listItem.kind === "section") {
              return (
                <View style={localStyles.feedSectionHeader}>
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
                  <MediaImage
                    source={typeof item.image === "string" ? { uri: item.image } : item.image}
                    style={localStyles.eventThumbnail}
                  />
                  <View style={localStyles.eventCopy}>
                    <Text style={localStyles.eventTitle} numberOfLines={2}>{item.title}</Text>
                    <View style={localStyles.eventMetadataRow}>
                      <Icon name="calendar-outline" size={17} color={vibesTheme.colors.accentBlue} />
                      <Text style={[localStyles.eventMetadataText, { color: vibesTheme.colors.accentBlue, fontFamily: vibesTheme.fonts.semibold }]}>{scheduleLabel}</Text>
                    </View>
                    {item.location || item.modality === "online" ? <View style={localStyles.eventMetadataRow}>
                      <Icon name={item.modality === "online" ? "videocam-outline" : "location"} size={17} color={vibesTheme.colors.secondaryText} />
                      <Text style={localStyles.eventMetadataText} numberOfLines={2}>{item.modality === "online" ? "Online" : item.location}</Text>
                    </View> : null}
                    {count > 1 ? <View style={localStyles.eventMetadataRow}>
                      <Icon name="people" size={17} color={vibesTheme.colors.secondaryText} />
                      <Text style={localStyles.eventMetadataText}>{count} personas de Vibes</Text>
                    </View> : null}
                  </View>
                  <View style={localStyles.eventViewButton}>
                    <Icon name="chevron-forward" size={20} color={vibesTheme.colors.secondaryText} />
                  </View>
                </TouchableOpacity>
              );
            }
            const challengeRow = (
              <ChallengeFeedCard item={item} joined={joinedChallengeIds.has(item.id)} onPress={() => navigation.navigate("ChallengeDetailScreen" as never, { event: item } as never)} footer={listItem.invitation || (listItem.restartable && viewerId) ? <>
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
                        <Icon name="refresh-outline" size={16} color={vibesTheme.colors.accentBlue} />
                        <Text style={restartStyles.pillText}>{t("challengeRestart.restart")}</Text>
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
      <KeyboardSheetModal visible={filtersVisible && section === "event"} onClose={() => setFiltersVisible(false)}>
        <View style={[localStyles.filtersSheet, { maxHeight: "100%" }]}>
        <View style={localStyles.filterHandle} />
        <View style={localStyles.filterHeader}>
          <Text style={localStyles.filterTitle}>{filterPanel === "date" ? "Fecha" : filterPanel === "location" ? "Ubicación" : "Otros filtros"}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar filtros" onPress={() => setFiltersVisible(false)} style={localStyles.filterButton}>
            <Icon name="close" size={22} color={vibesTheme.colors.primaryText} />
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
            <Icon name="refresh-outline" size={21} color={vibesTheme.colors.primaryText} />
          </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
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
          <EventClassificationPicker filter label="Precio" options={[{ id: "free", label: "Gratis" }, { id: "paid", label: "Pago" }] as const} value={draftFilters.pricingType} onChange={(value) => setDraftFilters((draft) => ({ ...draft, pricingType: value }))} />
          <EventClassificationPicker filter label="Tipo" options={EVENT_PARTICIPATION_TYPES} value={draftFilters.participationType} onChange={(value) => setDraftFilters((draft) => ({ ...draft, participationType: value }))} />
          <EventClassificationPicker filter label="Modalidad" options={EVENT_MODALITIES} value={draftFilters.modality} onChange={(value) => setDraftFilters((draft) => ({ ...draft, modality: value }))} />
          </> : null}
        </ScrollView>
        <View style={[localStyles.filterFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity accessibilityRole="button" style={localStyles.filterClear} onPress={() => {
            if (filterPanel === "other") setDraftFilters({ pricingType: null, participationType: null, modality: null });
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
              setPricingType(draftFilters.pricingType); setParticipationType(draftFilters.participationType); setModality(draftFilters.modality);
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
  headerAction: { borderRadius: 14, backgroundColor: `${vibesTheme.colors.secondaryText}0C` },
tabRow: {
    flexDirection: "row",
    gap: vibesTheme.spacing.sm,
    marginBottom: vibesTheme.spacing.lg,
  },
tab: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: vibesTheme.radii.pill,
    borderWidth: 1,
    borderColor: "rgba(110, 110, 110, 0.30)",
    backgroundColor: "transparent",
  },
tabSelected: {
    borderColor: vibesTheme.colors.accentMustard,
    backgroundColor: "rgba(244, 163, 64, 0.43)",
  },
tabText: { color: vibesTheme.colors.secondaryText, fontFamily: vibesTheme.fonts.bold, fontSize: 16 },
tabTextSelected: { color: vibesTheme.colors.primaryText },
cardActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: vibesTheme.spacing.sm,
    marginTop: vibesTheme.spacing.sm,
  },
filterButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
filterBadge: { position: "absolute", top: 0, right: 0, minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: vibesTheme.colors.accentMustard },
filterBadgeText: { color: vibesTheme.colors.primaryText, fontSize: 11, fontFamily: vibesTheme.fonts.bold },
filtersSheet: { maxHeight: "85%", backgroundColor: vibesTheme.colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
filterHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, backgroundColor: "rgba(43,43,43,0.2)" },
filterHeader: { paddingHorizontal: 20, paddingTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
filterTitle: { fontSize: 24, fontFamily: vibesTheme.fonts.bold, color: vibesTheme.colors.primaryText },
filterContent: { paddingHorizontal: 20, paddingBottom: 16 },
filterFooter: { flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(43,43,43,0.08)" },
filterClear: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: "rgba(43,43,43,0.2)", borderRadius: 24, alignItems: "center", justifyContent: "center" },
datePresets: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
datePreset: { minHeight: 44, paddingHorizontal: 12, borderRadius: 22, borderWidth: 1, borderColor: vibesTheme.colors.secondaryText, backgroundColor: vibesTheme.colors.surface, justifyContent: "center" },
datePresetSelected: { backgroundColor: vibesTheme.colors.primaryText, borderColor: vibesTheme.colors.primaryText },
datePresetText: { fontSize: 14, color: vibesTheme.colors.primaryText },
dateField: { flex: 1, justifyContent: "flex-end", gap: 6 },
dateFieldLabel: { color: vibesTheme.colors.primaryText, fontSize: 14, fontFamily: vibesTheme.fonts.regular, paddingLeft: 12 },
dateFieldText: { color: vibesTheme.colors.primaryText, fontSize: 16, fontFamily: vibesTheme.fonts.regular },
dateFilterButton: { flex: 0, backgroundColor: vibesTheme.colors.accentMustard, borderColor: vibesTheme.colors.primaryText },
filterApply: { flex: 1, minHeight: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: vibesTheme.colors.accentMustard },
filterActionText: { color: vibesTheme.colors.primaryText, fontSize: 16, fontFamily: vibesTheme.fonts.bold },
eventListRow: {
    width: "100%", flexDirection: "row", alignItems: "center", gap: 14,
    padding: 14, marginBottom: 12, borderRadius: 20,
    borderWidth: 1, borderColor: `${vibesTheme.colors.primaryText}24`,
    backgroundColor: vibesTheme.colors.surface,
  },
eventThumbnail: {
    width: 84, height: 96, borderRadius: 12, alignSelf: "flex-start",
    backgroundColor: "rgba(57, 120, 184, 0.13)",
  },
eventCopy: { flex: 1, minWidth: 0, gap: 9 },
eventTitle: {
    fontSize: 17, lineHeight: 23, fontFamily: vibesTheme.fonts.bold,
    color: vibesTheme.colors.primaryText,
  },
eventMetadataRow: { flexDirection: "row", alignItems: "center", gap: 6 },
eventMetadataText: {
    flex: 1, fontSize: 13, lineHeight: 18, color: vibesTheme.colors.secondaryText,
  },
eventViewButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2,
    minWidth: 22, minHeight: 44,
  },
eventViewText: {
    fontSize: 14, fontFamily: vibesTheme.fonts.semibold, color: vibesTheme.colors.primaryText,
  },
eventsContainer: {
    paddingTop: 68,
  },
headerRow: {
    minHeight: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
  },
screenTitle: {
    flexShrink: 1,
    color: TEXT_PRIMARY,
    fontFamily: vibesTheme.fonts.semibold,
    fontSize: 26,
    lineHeight: 32,
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
    marginTop: 8,
    marginBottom: 20,
  },
bottomAlignedListFooter: {
    marginTop: "auto",
  },
eventsListContent: {
    flexGrow: 1,
  },
createIcon: { lineHeight: 20, includeFontPadding: false },
searchBar: {
    height: 40,
    paddingVertical: 0,
  },
searchInput: {
    paddingVertical: 0,
    fontSize: 14,
    fontFamily: vibesTheme.fonts.medium,
    color: vibesTheme.colors.primaryText,
  },
feedSectionHeader: {
    marginTop: 4,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
accordionSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
accordionSectionTitle: {
    flex: 1,
  },
accordionSectionCount: {
    color: vibesTheme.colors.secondaryText,
    fontSize: 18,
    lineHeight: 29,
    fontFamily: vibesTheme.fonts.regular,
  },
feedSectionTitle: {
    color: vibesTheme.colors.primaryText,
    fontSize: 25,
    lineHeight: 29,
    fontFamily: vibesTheme.fonts.semibold,
  },
activeChallengesTitle: {
    fontSize: 20,
    lineHeight: 25,
  },
joinedChallengesTitle: {
    marginTop: 12,
    fontSize: 20,
    lineHeight: 25,
    color: vibesTheme.colors.primaryText,
    fontFamily: vibesTheme.fonts.regular,
  },
feedSectionSubtitle: {
    marginTop: 2,
    color: "rgba(43, 43, 43, 0.58)",
    fontSize: 15,
    lineHeight: 19,
    fontFamily: vibesTheme.fonts.subtitle,
  },
feedRowCard: {
    minHeight: 98,
    borderRadius: 24,
    backgroundColor: vibesTheme.colors.background,
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
    shadowColor: vibesTheme.colors.primaryText,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 2,
  },
feedRowThumb: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
    gap: 12,
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
    marginBottom: 6,
  },
feedRowTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
feedRowTitle: {
    flex: 1,
    color: vibesTheme.colors.primaryText,
    fontSize: 20,
    lineHeight: 24,
    fontFamily: vibesTheme.fonts.medium,
  },
feedRowMeta: {
    marginTop: 4,
    color: vibesTheme.colors.primaryText,
    fontSize: 15,
    lineHeight: 19,
    fontFamily: vibesTheme.fonts.semibold,
  },
communityTodayRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
communityTodayText: {
    flex: 1,
    color: vibesTheme.colors.primaryText,
    fontSize: 14,
    lineHeight: 17,
    fontFamily: vibesTheme.fonts.semibold,
  },
feedThumbProgressPill: {
    position: "absolute",
    top: -6,
    alignSelf: "center",
    borderRadius: 999,
    minWidth: 84,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(57, 120, 184, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(254, 254, 253, 0.9)",
  },
feedThumbProgressPillPending: {
    backgroundColor: "rgba(254, 254, 253, 0.94)",
    borderColor: "rgba(244, 163, 64, 0.82)",
  },
feedThumbProgressText: {
    color: vibesTheme.colors.background,
    fontSize: 12,
    lineHeight: 14,
    fontFamily: vibesTheme.fonts.semibold,
    textAlign: "center",
  },
feedThumbProgressTextPending: {
    color: vibesTheme.colors.primaryText,
  },
feedInlineProgressPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
feedInlineProgressText: {
    color: vibesTheme.colors.primaryText,
    fontSize: 12,
    lineHeight: 14,
    fontFamily: vibesTheme.fonts.semibold,
  },
feedRowBottom: {
    width: "100%",
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
feedParticipantsWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
feedParticipantsCount: {
    color: vibesTheme.colors.primaryText,
    fontSize: 14,
    lineHeight: 17,
    fontFamily: vibesTheme.fonts.semibold,
  },
feedParticipantsCountWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
feedRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
avatarStack: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
stackAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: vibesTheme.colors.background,
    backgroundColor: "rgba(216, 140, 122, 0.20)",
  },
feedRowArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
progressPill: {
    alignSelf: "flex-start",
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(57, 120, 184, 0.18)",
  },
progressPillPending: {
    backgroundColor: "rgba(244, 163, 64, 0.18)",
  },
progressPillDone: {
    backgroundColor: "rgba(216, 140, 122, 0.18)",
  },
progressPillText: {
    color: vibesTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 16,
    fontFamily: vibesTheme.fonts.semibold,
  },
emptyState: {
    paddingHorizontal: 28,
    paddingVertical: 48,
    alignItems: "center",
  },
emptyTitle: {
    color: vibesTheme.colors.primaryText,
    fontSize: 24,
    fontFamily: vibesTheme.fonts.regular,
    textAlign: "center",
  },
emptyText: {
    marginTop: 10,
    color: vibesTheme.colors.secondaryText,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: vibesTheme.fonts.medium,
    textAlign: "center",
  },
eventSubtitle: { fontSize: 15, lineHeight: 22, color: vibesTheme.colors.secondaryText, marginTop: -12, marginBottom: 16 },
eventFilterRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
eventFilterChip: { flex: 1, minHeight: 44, borderRadius: 13, borderWidth: 1, borderColor: `${vibesTheme.colors.secondaryText}40`, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 8, gap: 6 },
eventFilterLabel: { flexShrink: 1, fontSize: 13, fontFamily: vibesTheme.fonts.medium, color: vibesTheme.colors.primaryText },
eventCategoriesScroll: { flexGrow: 0, flexShrink: 0 },
eventCategories: { gap: 8, paddingBottom: 12 },
eventCategory: { borderRadius: 24, paddingHorizontal: 18, minHeight: 38, justifyContent: "center", backgroundColor: `${vibesTheme.colors.secondaryText}12` },
eventCategoryLabel: { fontSize: 14, fontFamily: vibesTheme.fonts.semibold, color: vibesTheme.colors.secondaryText },
challengeSearch: { height: 48, borderRadius: 20, backgroundColor: `${vibesTheme.colors.accentBlue}09`, borderWidth: 0 },
challengeSubtitle: { color: vibesTheme.colors.secondaryText, fontSize: 15, lineHeight: 22, marginBottom: 20 },
challengeCount: { color: vibesTheme.colors.accentBlue, fontSize: 16 },
challengeExploreButton: { backgroundColor: vibesTheme.colors.primaryText, padding: 16, borderRadius: 24, marginTop: 16 },
footerToggleGroup: {
    gap: 12,
  },
finishedSectionSubtitle: {
    marginTop: 3,
    color: vibesTheme.colors.secondaryText,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: vibesTheme.fonts.subtitle,
  }
});
