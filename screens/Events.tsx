import MediaImage from "../components/MediaImage";
import DateTimePicker from "@react-native-community/datetimepicker";
import ScreenContainer from "../components/ScreenContainer";
import { matchesEventDateAndLocation, getEventLocationOptions, getEventDatePreset, formatEventFilterDate, type EventDatePreset } from "../src/lib/eventFilters";
import KeyboardSheetModal from "../components/KeyboardSheetModal";
import EventClassificationPicker from "../components/EventClassificationPicker";
import { EVENT_MODALITIES, EVENT_CATEGORIES, EVENT_PARTICIPATION_TYPES, getEventCategoryLabel, getEventParticipationLabel, matchesEventClassification, type EventCategory, type EventParticipationType } from "../src/constants/eventClassification";
/** @format */

import React, { useCallback, useMemo, useState } from "react";
import { View, FlatList, TouchableOpacity, StyleSheet, ScrollView, Keyboard, Platform } from "react-native";
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

const isExpiredEvent = (item: EventFeedItem) => {
  if (item.type !== "event" || !item.startsAt) return false;
  const startsAt = new Date(item.startsAt);
  if (Number.isNaN(startsAt.getTime())) return false;
  const endOfEventDay = new Date(startsAt);
  endOfEventDay.setHours(23, 59, 59, 999);
  return endOfEventDay.getTime() < Date.now();
};

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

const Events = ({ pastOnly = false }: { pastOnly?: boolean }) => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { data: session } = useAuthSession();
  const section: "event" | "challenge" =
    route.params?.section === "challenge" ? "challenge" : "event";
  const title = pastOnly ? "Eventos pasados" : section === "challenge" ? "Desafíos" : "Eventos";
  const searchPlaceholder =
    section === "challenge" ? t("events.searchChallenges") : t("events.searchEvents");
  const eventsQuery = useEventsFeedQuery();
  const challengesQuery = useChallengesFeedQuery();
  const { data: myEventGroups = [], isLoading: myEventGroupsLoading } =
    useMyEventGroupsQuery(session?.user?.id);
  const {
    data: items = [],
    isLoading,
    error,
  } = section === "challenge" ? challengesQuery : eventsQuery;
  const locationOptions = useMemo(() => getEventLocationOptions(items), [items]);
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
  const [draftFilters, setDraftFilters] = useState<{
    category: EventCategory | null;
    participationType: EventParticipationType | null;
    modality: EventModality | null;
  }>({ category: null, participationType: null, modality: null });
  const activeFilterCount = [category, participationType, modality, dateFrom, dateTo, locationFilter.trim()].filter(Boolean).length;
  const openFilters = () => {
    Keyboard.dismiss();
    setDraftFilters({ category, participationType, modality });
    setDraftDatePreset(datePreset);
    setDraftDateFrom(dateFrom);
    setDraftDateTo(dateTo);
    setDraftLocation(locationFilter);
    setDateField(null);
    setFiltersVisible(true);
  };

  const [search, setSearch] = useState("");
  const [showFinishedChallenges, setShowFinishedChallenges] = useState(false);
  const [showUpcomingChallenges, setShowUpcomingChallenges] = useState(false);

  const errorMessage =
    error instanceof Error && error.message.trim()
      ? error.message
      : section === "challenge"
        ? "No se pudieron cargar los desafíos."
        : "No se pudieron cargar los eventos.";
  const normalizedSearch = normalizeSearchText(search);
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (section === "event" && !matchesEventDateAndLocation(item, dateFrom, dateTo, locationFilter)) return false;
      if (section === "event" && !matchesEventClassification(item, category, participationType, modality)) return false;
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
  }, [items, normalizedSearch, section, category, participationType, modality, dateFrom, dateTo, locationFilter]);

  const visibleItems = useMemo(() => {
    if (section !== "challenge") {
      return filteredItems.filter((item) => pastOnly ? isExpiredEvent(item) : !isExpiredEvent(item));
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
      const nextItems: FeedListItem[] = visibleItems.map((item) => ({
        kind: "feed",
        item,
      }));

      return nextItems;
    }

    const nextItems: FeedListItem[] = [];

    if (joinedChallengeItems.length > 0 || joinedUpcomingChallengeItems.length > 0) {
      nextItems.push({
        kind: "section",
        id: "joined-challenges",
        title: "Tus desafíos",
      });
      nextItems.push(
        ...joinedChallengeItems.map((item) => ({ kind: "feed" as const, item })),
      );
      nextItems.push(
        ...joinedUpcomingChallengeItems.map((item) => ({ kind: "feed" as const, item })),
      );
    }

    if (generalChallengeItems.length > 0) {
      nextItems.push({
        kind: "section",
        id: "general-challenges",
        title: "Desafíos vigentes",
        subtitle: "",
      });
      nextItems.push(
        ...generalChallengeItems.map((item) => ({ kind: "feed" as const, item })),
      );
    }

    if (showUpcomingChallenges && upcomingGeneralChallengeItems.length > 0) {
      nextItems.push({
        kind: "section",
        id: "upcoming-challenges",
        title: "Desafíos próximos",
        subtitle: "Empiezan más adelante y todavía no te anotaste",
      });
      nextItems.push(
        ...upcomingGeneralChallengeItems.map((item) => ({ kind: "feed" as const, item })),
      );
    }

    if (showFinishedChallenges && finishedChallengeItems.length > 0) {
      nextItems.push({
        kind: "section",
        id: "finished-challenges",
        title: "Desafíos finalizados",
      });
      nextItems.push(
        ...finishedChallengeItems.map((item) => ({ kind: "feed" as const, item })),
      );
    }

    return nextItems;
  }, [
    expiredEventItems,
    finishedChallengeItems,
    generalChallengeItems,
    joinedChallengeItems,
    joinedUpcomingChallengeItems,
    section,
    showFinishedChallenges,
    showUpcomingChallenges,
    upcomingGeneralChallengeItems,
    visibleItems,
  ]);

  const listIsLoading =
    isLoading || (section === "challenge" && Boolean(session?.user?.id) && myEventGroupsLoading);

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
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver" onPress={() => navigation.goBack()} style={localStyles.filterButton}>
              <Icon name="chevron-back" size={26} color={vibesTheme.colors.primaryText} />
            </TouchableOpacity>
          ) : null}
          <View style={localStyles.titleRow}>
            <Text style={[styles.eventsTitle, localStyles.screenTitle]}>{title}</Text>
            {!pastOnly && section === "event" ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Ver eventos pasados"
                onPress={() => navigation.navigate("PastEvents" as never)}
                style={localStyles.filterButton}
              >
                <Icon name="archive-outline" size={23} color={vibesTheme.colors.accentBlue} />
              </TouchableOpacity>
            ) : null}
          </View>
          {!pastOnly ? <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.78}
            style={localStyles.createButton}
            onPress={() => {
              if (section === "challenge") {
                navigation.navigate("CreateChallenge" as never);
                return;
              }
              navigation.navigate("CreateEvent" as never);
            }}
          >
            <Icon name="add" size={20} color={vibesTheme.colors.primaryText} style={localStyles.createIcon} />
            <Text style={localStyles.createButtonText} numberOfLines={1}>
              {section === "challenge" ? "Crear desafío" : "Crear evento"}
            </Text>
          </TouchableOpacity> : null}
          {section === "event" ? (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Filtros de eventos${activeFilterCount ? `, ${activeFilterCount} activos` : ""}`} accessibilityState={{ expanded: filtersVisible }} onPress={openFilters} style={localStyles.filterButton}>
              <Icon name="options-outline" size={28} color={vibesTheme.colors.accentBlue} />
              {activeFilterCount > 0 ? <View style={localStyles.filterBadge}><Text style={localStyles.filterBadgeText}>{activeFilterCount}</Text></View> : null}
            </TouchableOpacity>
           ) : null}
        </View>
        <View style={[styles.eventsSearchBar, localStyles.searchBar]}>
          <Icon name="search" size={20} color={TEXT_SECONDARY} />
          <TextInput
            style={[styles.eventsSearchInput, localStyles.searchInput]}
            placeholder={searchPlaceholder}
            placeholderTextColor="rgba(43, 43, 43, 0.34)"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />

        </View>

        <FlatList
          data={listIsLoading ? [] : listItems}
          keyExtractor={(item) => (item.kind === "section" ? item.id : item.item.id)}
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
          ListHeaderComponent={section === "event" && !listIsLoading && !error ? (
            <View style={localStyles.upcomingHeader}>
              <Text style={localStyles.upcomingTitle}>{pastOnly ? "Eventos pasados" : "Próximos eventos"}</Text>
              <Text style={localStyles.eventCount}>
                {visibleItems.length} {visibleItems.length === 1 ? "evento" : "eventos"}
              </Text>
            </View>
          ) : null}
          ListEmptyComponent={
            <View style={localStyles.emptyState}>
              {listIsLoading ? <VibesLoader size={72} /> : null}
              <Text style={localStyles.emptyTitle}>
                {listIsLoading
                  ? section === "challenge"
                    ? "Cargando desafíos..."
                    : t("events.loadingEvents")
                  : error
                    ? "No se pudieron cargar"
                    : pastOnly
                      ? "No hay eventos pasados"
                    : normalizedSearch
                      ? section === "challenge"
                        ? "No encontramos desafíos"
                        : "No encontramos eventos"
                    : section === "event" && expiredEventItems.length > 0
                      ? "No hay eventos vigentes"
                    : section === "challenge" && (upcomingGeneralChallengeItems.length > 0 || finishedChallengeItems.length > 0)
                      ? "No hay desafíos vigentes"
                    : section === "challenge"
                      ? "Todavía no hay desafíos reales"
                      : t("events.noEventsYet")}
              </Text>
              <Text style={localStyles.emptyText}>
                {listIsLoading
                  ? "Cargando eventos..."
                    : error
                    ? errorMessage
                    : normalizedSearch
                      ? "Probá con otro nombre, lugar o fecha."
                    : section === "event" && expiredEventItems.length > 0
                      ? pastOnly ? "Probá con otros filtros." : "Podés consultar el historial en Eventos pasados."
                    : section === "challenge" && upcomingGeneralChallengeItems.length > 0
                      ? "Los próximos están guardados abajo para que te sumes cuando quieras."
                    : section === "challenge" && finishedChallengeItems.length > 0
                      ? "Tus desafíos finalizados están guardados abajo."
                    : section === "challenge"
                      ? "Creá un desafío o conectá una fuente real para poblar esta lista."
                      : t("events.eventsEmpty")}
              </Text>
            </View>
          }
          ListFooterComponent={
            !pastOnly && section === "event" && expiredEventItems.length > 0 ? (
              <TouchableOpacity
                style={localStyles.finishedSectionToggle}
                onPress={() => navigation.navigate("PastEvents" as never)}
                activeOpacity={0.85}
              >
                <View>
                  <Text style={localStyles.finishedSectionTitle}>
                    Eventos pasados
                  </Text>
                  <Text style={localStyles.finishedSectionSubtitle}>
                    {`${expiredEventItems.length} guardados`}
                  </Text>
                </View>
                <Icon
                  name="chevron-forward"
                  size={22}
                  color={vibesTheme.colors.secondaryText}
                />
              </TouchableOpacity>
            ) : section === "challenge" && (upcomingGeneralChallengeItems.length > 0 || finishedChallengeItems.length > 0) ? (
              <View style={localStyles.footerToggleGroup}>
                {upcomingGeneralChallengeItems.length > 0 ? (
                  <TouchableOpacity
                    style={localStyles.finishedSectionToggle}
                    onPress={() => setShowUpcomingChallenges((prev) => !prev)}
                    activeOpacity={0.85}
                  >
                    <View>
                      <Text style={localStyles.finishedSectionTitle}>
                        Desafíos próximos
                      </Text>
                      <Text style={localStyles.finishedSectionSubtitle}>
                        {showUpcomingChallenges
                          ? "Ocultar próximos"
                          : `${upcomingGeneralChallengeItems.length} guardados`}
                      </Text>
                    </View>
                    <Icon
                      name={showUpcomingChallenges ? "chevron-up" : "chevron-down"}
                      size={22}
                      color={vibesTheme.colors.secondaryText}
                    />
                  </TouchableOpacity>
                ) : null}
                {finishedChallengeItems.length > 0 ? (
                  <TouchableOpacity
                    style={localStyles.finishedSectionToggle}
                    onPress={() => setShowFinishedChallenges((prev) => !prev)}
                    activeOpacity={0.85}
                  >
                    <View>
                      <Text style={localStyles.finishedSectionTitle}>
                        Desafíos finalizados
                      </Text>
                      <Text style={localStyles.finishedSectionSubtitle}>
                        {showFinishedChallenges
                          ? "Ocultar finalizados"
                          : `${finishedChallengeItems.length} guardados`}
                      </Text>
                    </View>
                    <Icon
                      name={showFinishedChallenges ? "chevron-up" : "chevron-down"}
                      size={22}
                      color={vibesTheme.colors.secondaryText}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null
          }
          renderItem={({ item: listItem }) => {
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
              const startsAt = item.startsAt ? new Date(item.startsAt) : null;
              const dateLabel = startsAt && !Number.isNaN(startsAt.getTime())
                ? `${startsAt.toLocaleDateString("es-AR", { day: "numeric", month: "short" }).replace(/\./g, "")} · ${startsAt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}`
                : item.date;
              const count = item.participantCount ?? participantCount;
              const participantsLabel = `${count} ${count === 1 ? "participante" : "participantes"}`;
              return (
                <TouchableOpacity
                  style={localStyles.eventListRow}
                  activeOpacity={0.78}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver ${item.title}, ${dateLabel}, ${participantsLabel}`}
                  onPress={() => navigation.navigate("EventDetail" as never, { event: item } as never)}
                >
                  <MediaImage
                    source={typeof item.image === "string" ? { uri: item.image } : item.image}
                    style={localStyles.eventThumbnail}
                  />
                  <View style={localStyles.eventCopy}>
                    <Text style={localStyles.eventTitle} numberOfLines={2}>{item.title}</Text>
                    <View style={localStyles.eventMetadataRow}>
                      <Icon name="calendar-outline" size={17} color={vibesTheme.colors.secondaryText} />
                      <Text style={localStyles.eventMetadataText}>{dateLabel}</Text>
                    </View>
                    <View style={localStyles.eventMetadataRow}>
                      <Icon name="people" size={17} color={vibesTheme.colors.secondaryText} />
                      <Text style={localStyles.eventMetadataText}>{count}</Text>
                    </View>
                  </View>
                  <View style={localStyles.eventViewButton}>
                    <Icon name="chevron-forward" size={17} color={vibesTheme.colors.accentMustard} />
                  </View>
                </TouchableOpacity>
              );
            }
            const challengeProgress = getChallengeProgress(item);
            const checkedInTodayCount = Math.max(
              0,
              Number(item.checkedInTodayCount ?? 0) || 0,
            );
            const visibilityMeta = getVisibilityMeta(item.visibility);

            const count = item.participantCount ?? participantCount;
            const participantsLabel = `${count} ${count === 1 ? "participante" : "participantes"}`;
            return (
              <TouchableOpacity
                style={localStyles.eventListRow}
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityLabel={`Ver ${item.title}, ${participantsLabel}`}
                onPress={() => navigation.navigate("ChallengeDetailScreen" as never, { event: item } as never)}
              >
                <MediaImage
                  source={typeof item.image === "string" ? { uri: item.image } : item.image}
                  style={localStyles.eventThumbnail}
                />
                <View style={localStyles.eventCopy}>
                  <View style={localStyles.feedRowTitleLine}>
                    <Icon name={visibilityMeta.icon} size={13} color={vibesTheme.colors.secondaryText} />
                    <Text style={[localStyles.eventTitle, { flex: 1 }]} numberOfLines={2}>{item.title}</Text>
                  </View>
                  <View style={localStyles.eventMetadataRow}>
                    <Icon name="people" size={17} color={vibesTheme.colors.secondaryText} />
                    <Text style={localStyles.eventMetadataText}>{count}</Text>
                  </View>
                  {challengeProgress ? (
                    <View style={localStyles.eventMetadataRow}>
                      <Icon
                        name={challengeProgress.tone === "done" ? "checkmark-circle" : "time-outline"}
                        size={17}
                        color={challengeProgress.tone === "done" ? vibesTheme.colors.accentBlue : vibesTheme.colors.accentMustard}
                      />
                      <Text style={localStyles.eventMetadataText}>{challengeProgress.label}</Text>
                    </View>
                  ) : null}
                  {checkedInTodayCount > 0 ? (
                    <View style={localStyles.eventMetadataRow}>
                      <Icon name="sparkles-outline" size={17} color={vibesTheme.colors.accentMustard} />
                      <Text style={localStyles.eventMetadataText}>
                        {t(
                          checkedInTodayCount === 1
                            ? "home.challengeCheckedInTodayOne"
                            : "home.challengeCheckedInToday",
                          { count: checkedInTodayCount },
                        )}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={localStyles.eventViewButton}>
                  <Icon name="chevron-forward" size={17} color={vibesTheme.colors.accentMustard} />
                </View>
              </TouchableOpacity>
          )}}
        />
      </View>
      <KeyboardSheetModal visible={filtersVisible && section === "event"} onClose={() => setFiltersVisible(false)}>
        <View style={[localStyles.filtersSheet, { maxHeight: "100%" }]}>
        <View style={localStyles.filterHandle} />
        <View style={localStyles.filterHeader}>
          <Text style={localStyles.filterTitle}>Filtros de eventos</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar filtros" onPress={() => setFiltersVisible(false)} style={localStyles.filterButton}>
            <Icon name="close" size={22} color={vibesTheme.colors.primaryText} />
          </TouchableOpacity>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={localStyles.filterContent} showsVerticalScrollIndicator={false}>
          <EventClassificationPicker
            filter
            searchable
            label="Ubicación"
            options={locationOptions}
            value={draftLocation || null}
            onChange={(value) => setDraftLocation(value ?? "")}
          />
          <Text style={localStyles.filterActionText}>Fecha</Text>
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
                    onPress={() => { Keyboard.dismiss(); setDateField(null); setDraftDatePreset(preset); setDraftDateFrom(range.from); setDraftDateTo(range.to); }}>
                    <Text style={localStyles.datePresetText}>{label}</Text>
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
          <EventClassificationPicker filter label="Categoría" options={EVENT_CATEGORIES} value={draftFilters.category} onChange={(value) => setDraftFilters((draft) => ({ ...draft, category: value }))} />
          <EventClassificationPicker filter label="Tipo" options={EVENT_PARTICIPATION_TYPES} value={draftFilters.participationType} onChange={(value) => setDraftFilters((draft) => ({ ...draft, participationType: value }))} />
          <EventClassificationPicker filter label="Modalidad" options={EVENT_MODALITIES} value={draftFilters.modality} onChange={(value) => setDraftFilters((draft) => ({ ...draft, modality: value }))} />
        </ScrollView>
        <View style={[localStyles.filterFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity accessibilityRole="button" style={localStyles.filterClear} onPress={() => { setDraftFilters({ category: null, participationType: null, modality: null }); setDraftDatePreset(null); setDraftDateFrom(null); setDraftDateTo(null); setDraftLocation(""); setDateField(null); }}>
            <Text style={localStyles.filterActionText}>Limpiar</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" disabled={invalidDateRange} style={[localStyles.filterApply, invalidDateRange && { opacity: 0.5 }]} onPress={() => {
            setDatePreset(draftDatePreset);
            setDateFrom(draftDateFrom);
            setDateTo(draftDateTo);
            setLocationFilter(draftLocation.trim());
            setCategory(draftFilters.category);
            setParticipationType(draftFilters.participationType);
            setModality(draftFilters.modality);
            setFiltersVisible(false);
          }}>
            <Text style={localStyles.filterActionText}>Aplicar</Text>
          </TouchableOpacity>
        </View>
        </View>
      </KeyboardSheetModal>
    </ScreenContainer>
  );
};

export default Events;

const localStyles = StyleSheet.create({
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
  datePresetSelected: { backgroundColor: vibesTheme.colors.accentBlue, borderColor: vibesTheme.colors.primaryText },
  datePresetText: { fontSize: 14, color: vibesTheme.colors.primaryText },
  dateField: { flex: 1, justifyContent: "flex-end", gap: 6 },
  dateFieldLabel: { color: vibesTheme.colors.primaryText, fontSize: 14, fontFamily: vibesTheme.fonts.regular, paddingLeft: 12 },
  dateFieldText: { color: vibesTheme.colors.primaryText, fontSize: 16, fontFamily: vibesTheme.fonts.regular },
  dateFilterButton: { flex: 0, backgroundColor: vibesTheme.colors.accentMustard, borderColor: vibesTheme.colors.primaryText },
  filterApply: { flex: 1, minHeight: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: vibesTheme.colors.accentMustard },
  filterActionText: { color: vibesTheme.colors.primaryText, fontSize: 16, fontFamily: vibesTheme.fonts.bold },
  upcomingHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    gap: 12, paddingVertical: 12,
  },
  upcomingTitle: {
    flex: 1, fontSize: 21, lineHeight: 27,
    fontFamily: vibesTheme.fonts.semibold, color: vibesTheme.colors.primaryText,
  },
  eventCount: { fontSize: 13, color: vibesTheme.colors.secondaryText },
  eventListRow: {
    width: "100%", flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(110, 110, 110, 0.30)",
  },
  eventThumbnail: {
    width: 64, height: 72, borderRadius: 10,
    backgroundColor: "rgba(57, 120, 184, 0.13)",
  },
  eventCopy: { flex: 1, minWidth: 0, gap: 4 },
  eventTitle: {
    fontSize: 16, lineHeight: 21, fontFamily: vibesTheme.fonts.bold,
    color: vibesTheme.colors.primaryText,
  },
  eventMetadataRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  eventMetadataText: {
    flex: 1, fontSize: 13, lineHeight: 18, color: vibesTheme.colors.secondaryText,
  },
  eventViewButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2,
    minWidth: 34, minHeight: 44,
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
    gap: 12,
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
    marginTop: 8,
    marginBottom: 20,
  },
  bottomAlignedListFooter: {
    marginTop: "auto",
  },
  eventsListContent: {
    flexGrow: 1,
  },
  createButton: {
    minHeight: 48,
    maxWidth: "48%",
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: vibesTheme.colors.primaryText,
  },
  createIcon: { lineHeight: 20, includeFontPadding: false },
  createButtonText: {
    flexShrink: 1,
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: "center",
    fontSize: 14,
    color: vibesTheme.colors.primaryText,
    fontFamily: vibesTheme.fonts.semibold,
  },
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
  finishedSectionToggle: {
    minHeight: 72,
    borderRadius: 22,
    backgroundColor: "rgba(254, 254, 253, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerToggleGroup: {
    gap: 12,
  },
  finishedSectionTitle: {
    color: vibesTheme.colors.primaryText,
    fontSize: 18,
    lineHeight: 22,
    fontFamily: vibesTheme.fonts.semibold,
  },
  finishedSectionSubtitle: {
    marginTop: 3,
    color: vibesTheme.colors.secondaryText,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: vibesTheme.fonts.subtitle,
  },
  emptyState: {
    paddingHorizontal: 28,
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyTitle: {
    color: vibesTheme.colors.primaryText,
    fontSize: 24,
    fontFamily: vibesTheme.fonts.thin,
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
});
