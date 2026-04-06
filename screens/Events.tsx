/** @format */

import React from "react";
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

const Events = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const section = route.params?.section === "challenge" ? "challenge" : "event";
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
  const errorMessage =
    error instanceof Error && error.message.trim()
      ? error.message
      : section === "challenge"
        ? "No se pudieron cargar los challenges."
        : "No se pudieron cargar los eventos.";

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

        <View style={styles.eventsSearchBar}>
          <Icon name="search" size={20} color={TEXT_SECONDARY} />
          <TextInput
            style={styles.eventsSearchInput}
            placeholder={searchPlaceholder}
            placeholderTextColor={TEXT_SECONDARY}
          />
          <Icon name="chevron-forward" size={20} color={TEXT_SECONDARY} />
        </View>

        <FlatList
          data={items}
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
                    : section === "challenge"
                      ? "No real challenges yet"
                      : "No real events yet"}
              </Text>
              <Text style={localStyles.emptyText}>
                {isLoading
                  ? "Consultando Supabase..."
                  : error
                    ? errorMessage
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
                  "EventDetail" as never,
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
                        "EventDetail" as never,
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
