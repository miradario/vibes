/** @format */

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import styles, { TEXT_SECONDARY } from "../assets/styles";
import Icon from "../components/Icon";
import AvatarGroup from "../components/AvatarGroup";
import VibesLoader from "../components/VibesLoader";
import {
  useChallengesFeedQuery,
  useEventsFeedQuery,
  useMyEventGroupsQuery,
} from "../src/queries/events.queries";
import type { EventFeedItem } from "../src/queries/events.queries";
import { useAuthSession } from "../src/auth/auth.queries";
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
  if (item.type !== "challenge" || !item.startsAt || !item.durationDays) return null;

  const startDate = new Date(item.startsAt);
  const today = new Date();
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.floor((current.getTime() - start.getTime()) / 86_400_000);

  if (diffDays < 0) {
    return { label: `Empieza en ${Math.abs(diffDays)}d`, tone: "pending" as const };
  }

  if (diffDays >= item.durationDays) {
    return { label: "Finalizado", tone: "done" as const };
  }

  return { label: `Día ${diffDays + 1}/${item.durationDays}`, tone: "active" as const };
};

const isFinishedChallenge = (item: EventFeedItem) =>
  item.type === "challenge" && getChallengeProgress(item)?.tone === "done";

const isExpiredEvent = (item: EventFeedItem) => {
  if (item.type !== "event" || !item.startsAt) return false;
  const startsAt = new Date(item.startsAt);
  if (Number.isNaN(startsAt.getTime())) return false;
  return startsAt.getTime() < Date.now();
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

const Events = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { t } = useI18n();
  const { data: session } = useAuthSession();
  const section: "event" | "challenge" =
    route.params?.section === "challenge" ? "challenge" : "event";
  const title = section === "challenge" ? "Desafíos" : "Eventos";
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
  const [search, setSearch] = useState("");
  const [showFinishedChallenges, setShowFinishedChallenges] = useState(false);
  const [showExpiredEvents, setShowExpiredEvents] = useState(false);

  const errorMessage =
    error instanceof Error && error.message.trim()
      ? error.message
      : section === "challenge"
        ? "No se pudieron cargar los desafíos."
        : "No se pudieron cargar los eventos.";
  const normalizedSearch = normalizeSearchText(search);
  const filteredItems = useMemo(() => {
    if (!normalizedSearch) return items;

    return items.filter((item) => {
      const haystack = normalizeSearchText(
        [
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
  }, [items, normalizedSearch]);

  const visibleItems = useMemo(() => {
    if (section !== "challenge") {
      return filteredItems.filter((item) => !isExpiredEvent(item));
    }
    return filteredItems.filter((item) => !isFinishedChallenge(item));
  }, [filteredItems, section]);

  const expiredEventItems = useMemo(() => {
    if (section !== "event") return [];
    return filteredItems.filter(isExpiredEvent);
  }, [filteredItems, section]);

  const finishedChallengeItems = useMemo(() => {
    if (section !== "challenge") return [];
    return filteredItems.filter(isFinishedChallenge);
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
    return visibleItems.filter((item) => joinedChallengeIds.has(item.id));
  }, [joinedChallengeIds, section, visibleItems]);

  const generalChallengeItems = useMemo(() => {
    if (section !== "challenge") return [];
    return visibleItems.filter((item) => !joinedChallengeIds.has(item.id));
  }, [joinedChallengeIds, section, visibleItems]);

  const listItems = useMemo<FeedListItem[]>(() => {
    if (section !== "challenge") {
      const nextItems: FeedListItem[] = visibleItems.map((item) => ({
        kind: "feed",
        item,
      }));

      if (showExpiredEvents && expiredEventItems.length > 0) {
        nextItems.push({
          kind: "section",
          id: "expired-events",
          title: "Eventos caducados",
          subtitle: "Eventos que ya pasaron",
        });
        nextItems.push(
          ...expiredEventItems.map((item) => ({ kind: "feed" as const, item })),
        );
      }

      return nextItems;
    }

    const nextItems: FeedListItem[] = [];

    if (joinedChallengeItems.length > 0) {
      nextItems.push({
        kind: "section",
        id: "joined-challenges",
        title: "Tus desafíos",
        subtitle: "Los caminos que ya estás transitando",
      });
      nextItems.push(
        ...joinedChallengeItems.map((item) => ({ kind: "feed" as const, item })),
      );
    }

    if (generalChallengeItems.length > 0) {
      nextItems.push({
        kind: "section",
        id: "general-challenges",
        title: "Desafíos generales",
        subtitle: "Explorá nuevas prácticas para sumarte",
      });
      nextItems.push(
        ...generalChallengeItems.map((item) => ({ kind: "feed" as const, item })),
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
    section,
    showExpiredEvents,
    showFinishedChallenges,
    visibleItems,
  ]);

  const listIsLoading =
    isLoading || (section === "challenge" && Boolean(session?.user?.id) && myEventGroupsLoading);

  return (
    <View style={styles.bg}>
      <View style={styles.eventsContainer}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={styles.eventsTitle}>{title}</Text>
          <TouchableOpacity
            style={[styles.eventCardButton, localStyles.createButton]}
            onPress={() => {
              if (section === "challenge") {
                navigation.navigate("CreateChallenge" as never);
                return;
              }
              navigation.navigate("CreateEvent" as never);
            }}
          >
            <Text style={[styles.eventCardButtonText, localStyles.createButtonText]}>
              Crear
            </Text>
            <Icon name="add" size={16} color={TEXT_SECONDARY} />
          </TouchableOpacity>
        </View>
        <View style={styles.eventsSearchBar}>
          <Icon name="search" size={20} color={TEXT_SECONDARY} />
          <TextInput
            style={[styles.eventsSearchInput, localStyles.searchInput]}
            placeholder={searchPlaceholder}
            placeholderTextColor={TEXT_SECONDARY}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          <Icon name="chevron-forward" size={20} color={TEXT_SECONDARY} />
        </View>

        <FlatList
          data={listIsLoading ? [] : listItems}
          keyExtractor={(item) => (item.kind === "section" ? item.id : item.item.id)}
          contentContainerStyle={styles.eventsListContent}
          showsVerticalScrollIndicator={false}
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
                    : normalizedSearch
                      ? section === "challenge"
                        ? "No encontramos desafíos"
                        : "No encontramos eventos"
                    : section === "event" && expiredEventItems.length > 0
                      ? "No hay eventos vigentes"
                    : section === "challenge" && finishedChallengeItems.length > 0
                      ? "No hay desafíos vigentes"
                    : section === "challenge"
                      ? "Todavía no hay desafíos reales"
                      : t("events.noEventsYet")}
              </Text>
              <Text style={localStyles.emptyText}>
                {listIsLoading
                  ? "Consultando Supabase..."
                    : error
                    ? errorMessage
                    : normalizedSearch
                      ? "Probá con otro nombre, lugar o fecha."
                    : section === "event" && expiredEventItems.length > 0
                      ? "Los eventos caducados están guardados abajo."
                    : section === "challenge" && finishedChallengeItems.length > 0
                      ? "Tus desafíos finalizados están guardados abajo."
                    : section === "challenge"
                      ? "Creá un desafío o conectá una fuente real para poblar esta lista."
                      : t("events.eventsEmpty")}
              </Text>
            </View>
          }
          ListFooterComponent={
            section === "event" && expiredEventItems.length > 0 ? (
              <TouchableOpacity
                style={localStyles.finishedSectionToggle}
                onPress={() => setShowExpiredEvents((prev) => !prev)}
                activeOpacity={0.85}
              >
                <View>
                  <Text style={localStyles.finishedSectionTitle}>
                    Eventos caducados
                  </Text>
                  <Text style={localStyles.finishedSectionSubtitle}>
                    {showExpiredEvents
                      ? "Ocultar caducados"
                      : `${expiredEventItems.length} guardados`}
                  </Text>
                </View>
                <Icon
                  name={showExpiredEvents ? "chevron-up" : "chevron-down"}
                  size={22}
                  color="#7A746D"
                />
              </TouchableOpacity>
            ) : section === "challenge" && finishedChallengeItems.length > 0 ? (
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
                  color="#7A746D"
                />
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item: listItem }) => {
            if (listItem.kind === "section") {
              return (
                <View style={localStyles.feedSectionHeader}>
                  <Text style={localStyles.feedSectionTitle}>{listItem.title}</Text>
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
            const challengeProgress = getChallengeProgress(item);
            const checkedInTodayCount = Math.max(
              0,
              Number(item.checkedInTodayCount ?? 0) || 0,
            );
            const visibilityMeta = getVisibilityMeta(item.visibility);

            return (
            <TouchableOpacity
              style={localStyles.feedRowCard}
              onPress={() =>
                navigation.navigate(
                  (item.type === "challenge"
                    ? "ChallengeDetailScreen"
                    : "EventDetail") as never,
                  { event: item } as never,
                )
              }
            >
              <View style={localStyles.feedRowThumbWrap}>
                <Image
                  source={
                    typeof item.image === "string" ? { uri: item.image } : item.image
                  }
                  style={localStyles.feedRowThumb}
                />
                {item.type === "challenge" && challengeProgress ? (
                  <View
                    style={[
                      localStyles.feedThumbProgressPill,
                      challengeProgress.tone === "done"
                        ? localStyles.progressPillDone
                        : challengeProgress.tone === "pending"
                          ? localStyles.progressPillPending
                          : null,
                    ]}
                  >
                    <Text style={localStyles.feedThumbProgressText}>
                      {challengeProgress.label}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View
                style={[
                  localStyles.feedRowContent,
                  item.type === "challenge" || item.type === "event"
                    ? localStyles.feedRowContentChallenge
                    : null,
                ]}
              >
                <View style={localStyles.feedRowCopy}>
                  <View style={localStyles.feedRowTitleLine}>
                    {item.type === "challenge" ? (
                      <Icon
                        name={visibilityMeta.icon}
                        size={13}
                        color="#7A746D"
                      />
                    ) : null}
                    <Text style={localStyles.feedRowTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                  </View>
                  {item.type !== "challenge" ? (
                    <Text style={localStyles.feedRowMeta} numberOfLines={1}>
                      {item.date} {"  •  "} {item.attendees}
                    </Text>
                  ) : null}
                  {item.type === "challenge" && checkedInTodayCount > 0 ? (
                    <View style={localStyles.communityTodayRow}>
                      <Icon name="sparkles-outline" size={14} color="#D19443" />
                      <Text style={localStyles.communityTodayText} numberOfLines={1}>
                        {t("home.challengeCheckedInToday", {
                          count: checkedInTodayCount,
                        })}
                      </Text>
                    </View>
                  ) : null}
                  {item.type === "challenge" ? (
                    <View style={localStyles.feedRowBottom}>
                      <View style={localStyles.feedParticipantsWrap}>
                        <ParticipantStack
                          count={participantCount}
                          hostImage={item.hostImage}
                          avatarUrls={item.participantPreviewImages}
                        />
                        <Text style={localStyles.feedParticipantsCount}>
                          ({participantCount})
                        </Text>
                      </View>
                      <View style={localStyles.feedRowArrow}>
                        <Icon name="chevron-forward" size={18} color={TEXT_SECONDARY} />
                      </View>
                    </View>
                  ) : null}
                  {item.type === "event" ? (
                    <View style={localStyles.feedRowBottom}>
                      <ParticipantStack
                        count={participantCount}
                        hostImage={item.hostImage}
                        avatarUrls={item.participantPreviewImages}
                      />
                      <View style={localStyles.feedRowArrow}>
                        <Icon name="chevron-forward" size={18} color={TEXT_SECONDARY} />
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          )}}
        />
      </View>

    </View>
  );
};

export default Events;

const localStyles = StyleSheet.create({
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  createButtonText: {
    fontSize: 18,
    color: "#6C6965",
    fontFamily: vibesTheme.fonts.medium,
  },
  searchInput: {
    fontSize: 18,
    fontFamily: vibesTheme.fonts.medium,
    color: "#2B2B2B",
  },
  feedSectionHeader: {
    marginTop: 4,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  feedSectionTitle: {
    color: "#2B2B2B",
    fontSize: 25,
    lineHeight: 29,
    fontFamily: vibesTheme.fonts.bold,
  },
  feedSectionSubtitle: {
    marginTop: 2,
    color: "rgba(43, 43, 43, 0.58)",
    fontSize: 15,
    lineHeight: 19,
    fontFamily: vibesTheme.fonts.semibold,
  },
  feedRowCard: {
    minHeight: 98,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
    shadowColor: "#2B2B2B",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 2,
  },
  feedRowThumb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F6F6F4",
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
  feedRowTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  feedRowTitle: {
    flex: 1,
    color: "#252323",
    fontSize: 20,
    lineHeight: 24,
    fontFamily: vibesTheme.fonts.medium,
  },
  feedRowMeta: {
    marginTop: 4,
    color: "#4E4944",
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
    color: "#7C5620",
    fontSize: 14,
    lineHeight: 17,
    fontFamily: vibesTheme.fonts.semibold,
  },
  feedThumbProgressPill: {
    position: "absolute",
    top: -6,
    alignSelf: "center",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(174, 191, 209, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
  },
  feedThumbProgressText: {
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 14,
    fontFamily: vibesTheme.fonts.semibold,
  },
  feedRowBottom: {
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
    color: "#4E4944",
    fontSize: 14,
    lineHeight: 17,
    fontFamily: vibesTheme.fonts.semibold,
  },
  feedRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 56,
    justifyContent: "flex-end",
  },
  stackAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: "#F1EAE2",
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
    backgroundColor: "rgba(174, 191, 209, 0.18)",
  },
  progressPillPending: {
    backgroundColor: "rgba(228, 183, 110, 0.18)",
  },
  progressPillDone: {
    backgroundColor: "rgba(216, 140, 122, 0.18)",
  },
  progressPillText: {
    color: "#5F6E7D",
    fontSize: 13,
    lineHeight: 16,
    fontFamily: vibesTheme.fonts.semibold,
  },
  finishedSectionToggle: {
    minHeight: 72,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  finishedSectionTitle: {
    color: "#2B2B2B",
    fontSize: 18,
    lineHeight: 22,
    fontFamily: vibesTheme.fonts.medium,
  },
  finishedSectionSubtitle: {
    marginTop: 3,
    color: "#7A746D",
    fontSize: 14,
    lineHeight: 18,
    fontFamily: vibesTheme.fonts.medium,
  },
  emptyState: {
    paddingHorizontal: 28,
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#2B2B2B",
    fontSize: 24,
    fontFamily: vibesTheme.fonts.medium,
    textAlign: "center",
  },
  emptyText: {
    marginTop: 10,
    color: "#6E6E6E",
    fontSize: 16,
    lineHeight: 22,
    fontFamily: vibesTheme.fonts.medium,
    textAlign: "center",
  },
});
