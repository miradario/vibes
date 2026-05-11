/** @format */

import React, { useEffect, useMemo, useState } from "react";
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
import {
  useChallengesFeedQuery,
  useEventsFeedQuery,
} from "../src/queries/events.queries";
import type { EventFeedItem } from "../src/queries/events.queries";
import { vibesTheme } from "../src/theme/vibesTheme";

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
    <View style={localStyles.avatarStack}>
      {Array.from({ length: totalVisible }).map((_, index) => {
        const avatarUrl = uniqueAvatarUrls[index] ?? (index === 0 ? hostImage : null);
        return avatarUrl ? (
          <Image
            key={`${avatarUrl}-${index}`}
            source={{ uri: avatarUrl }}
            style={[
              localStyles.stackAvatar,
              { marginLeft: index === 0 ? 0 : -10, zIndex: totalVisible - index },
            ]}
          />
        ) : (
          <View
            key={`placeholder-${index}`}
            style={[
              localStyles.stackAvatar,
              localStyles.stackAvatarPlaceholder,
              { marginLeft: index === 0 ? 0 : -10, zIndex: totalVisible - index },
            ]}
          />
        );
      })}
    </View>
  );
};

const Events = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const [section, setSection] = useState<"event" | "challenge">(
    route.params?.section === "challenge" ? "challenge" : "event",
  );
  const title = section === "challenge" ? "Desafíos" : "Eventos";
  const searchPlaceholder =
    section === "challenge" ? "Buscar desafíos..." : "Buscar eventos...";
  const eventsQuery = useEventsFeedQuery();
  const challengesQuery = useChallengesFeedQuery();
  const {
    data: items = [],
    isLoading,
    error,
  } = section === "challenge" ? challengesQuery : eventsQuery;
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSection(route.params?.section === "challenge" ? "challenge" : "event");
  }, [route.params?.section]);

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

        <View style={localStyles.segmentedControl}>
          {(
            [
              { value: "event", label: "Eventos" },
              { value: "challenge", label: "Desafíos" },
            ] as const
          ).map((item) => {
            const isActive = section === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                style={[
                  localStyles.segmentButton,
                  isActive && localStyles.segmentButtonActive,
                ]}
                onPress={() => setSection(item.value)}
              >
                <Text
                  style={[
                    localStyles.segmentText,
                    isActive && localStyles.segmentTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
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
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.eventsListContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={localStyles.emptyState}>
              <Text style={localStyles.emptyTitle}>
                {isLoading
                  ? section === "challenge"
                  ? "Cargando desafíos..."
                    : "Loading events..."
                  : error
                    ? "No se pudieron cargar"
                    : normalizedSearch
                      ? section === "challenge"
                        ? "No encontramos desafíos"
                        : "No encontramos eventos"
                    : section === "challenge"
                      ? "Todavía no hay desafíos reales"
                      : "No real events yet"}
              </Text>
              <Text style={localStyles.emptyText}>
                {isLoading
                  ? "Consultando Supabase..."
                  : error
                    ? errorMessage
                    : normalizedSearch
                      ? "Probá con otro nombre, lugar o fecha."
                    : section === "challenge"
                      ? "Creá un desafío o conectá una fuente real para poblar esta lista."
                      : "Create an event or connect a real events source to populate this list."}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const participantCount = parseParticipantCount(item.attendees);
            const challengeProgress = getChallengeProgress(item);

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
              <Image
                source={
                  typeof item.image === "string" ? { uri: item.image } : item.image
                }
                style={localStyles.feedRowThumb}
              />
              <View style={localStyles.feedRowContent}>
                <View style={localStyles.feedRowCopy}>
                  <Text style={localStyles.feedRowTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={localStyles.feedRowMeta} numberOfLines={1}>
                    {item.date} {"  •  "} {item.attendees}
                  </Text>
                  {item.type === "challenge" && challengeProgress ? (
                    <View
                      style={[
                        localStyles.progressPill,
                        challengeProgress.tone === "done"
                          ? localStyles.progressPillDone
                          : challengeProgress.tone === "pending"
                            ? localStyles.progressPillPending
                            : null,
                      ]}
                    >
                      <Text style={localStyles.progressPillText}>
                        {challengeProgress.label}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={localStyles.feedRowRight}>
                  <ParticipantStack
                    count={participantCount}
                    hostImage={item.hostImage}
                    avatarUrls={item.participantPreviewImages}
                  />
                  <View style={localStyles.feedRowArrow}>
                    <Icon name="chevron-forward" size={18} color={TEXT_SECONDARY} />
                  </View>
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
  segmentedControl: {
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
    flexDirection: "row",
    padding: 4,
    marginTop: 18,
    marginBottom: 14,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentButtonActive: {
    backgroundColor: "#AEBFD1",
  },
  segmentText: {
    color: "#5F5A55",
    fontSize: 17,
    fontFamily: vibesTheme.fonts.medium,
  },
  segmentTextActive: {
    color: "#FFFFFF",
  },
  searchInput: {
    fontSize: 18,
    fontFamily: vibesTheme.fonts.medium,
    color: "#2B2B2B",
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
  feedRowContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  feedRowCopy: {
    flex: 1,
    justifyContent: "center",
  },
  feedRowTitle: {
    color: "#252323",
    fontSize: 20,
    lineHeight: 24,
    fontFamily: vibesTheme.fonts.medium,
  },
  feedRowMeta: {
    marginTop: 4,
    color: "#66605B",
    fontSize: 15,
    lineHeight: 19,
    fontFamily: vibesTheme.fonts.medium,
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
  stackAvatarPlaceholder: {
    backgroundColor: "#E7D9C8",
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
