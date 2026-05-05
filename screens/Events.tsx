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

const normalizeSearchText = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const Events = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const [section, setSection] = useState<"event" | "challenge">(
    route.params?.section === "challenge" ? "challenge" : "event",
  );
  const title = section === "challenge" ? "Challenges" : "Eventos";
  const searchPlaceholder =
    section === "challenge" ? "Buscar challenges..." : "Buscar eventos...";
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
        ? "No se pudieron cargar los challenges."
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
            style={styles.eventCardButton}
            onPress={() => {
              if (section === "challenge") {
                navigation.navigate("CreateChallenge" as never);
                return;
              }
              navigation.navigate("CreateEvent" as never);
            }}
          >
            <Text style={styles.eventCardButtonText}>Crear</Text>
            <Icon name="add" size={16} color={TEXT_SECONDARY} />
          </TouchableOpacity>
        </View>

        <View style={localStyles.segmentedControl}>
          {(
            [
              { value: "event", label: "Eventos" },
              { value: "challenge", label: "Challenges" },
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
            style={styles.eventsSearchInput}
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
                  ? "Loading challenges..."
                    : "Loading events..."
                  : error
                    ? "No se pudieron cargar"
                    : normalizedSearch
                      ? section === "challenge"
                        ? "No encontramos challenges"
                        : "No encontramos eventos"
                    : section === "challenge"
                      ? "No real challenges yet"
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
                      ? "Create a challenge or connect a real source to populate this list."
                      : "Create an event or connect a real events source to populate this list."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.eventCard}
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
                style={styles.eventCardImage}
              />
              <View style={styles.eventCardContent}>
                <View style={styles.eventCardHeader}>
                  <Text style={styles.eventCardTitle}>{item.title}</Text>
                  <Text style={styles.eventCardAttendees}>
                    {item.attendees}
                  </Text>
                </View>
                <Text style={styles.eventCardSubtitle}>{item.subtitle}</Text>
                <View style={styles.eventCardFooter}>
                  <Text style={styles.eventCardDate}>{item.date}</Text>
                  <TouchableOpacity
                    style={styles.eventCardButton}
                    onPress={() =>
                      navigation.navigate(
                        (item.type === "challenge"
                          ? "ChallengeDetailScreen"
                          : "EventDetail") as never,
                        { event: item } as never,
                      )
                    }
                  >
                    <Text style={styles.eventCardButtonText}>
                      {item.type === "challenge" ? "Ver challenge" : "Ver evento"}
                    </Text>
                    <Icon
                      name="chevron-forward"
                      size={14}
                      color={TEXT_SECONDARY}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

    </View>
  );
};

export default Events;

const localStyles = StyleSheet.create({
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
    color: "#6E6E6E",
    fontSize: 16,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  segmentTextActive: {
    color: "#F6F6F4",
  },
  emptyState: {
    paddingHorizontal: 28,
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#2B2B2B",
    fontSize: 24,
    fontFamily: "CormorantGaramond_600SemiBold",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 10,
    color: "#6E6E6E",
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "CormorantGaramond_500Medium",
    textAlign: "center",
  },
});
