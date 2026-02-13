/** @format */

import React from "react";
import {
  View,
  Text,
  ImageBackground,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY, TEXT_SECONDARY } from "../assets/styles";
import Icon from "../components/Icon";

const EVENTS = [
  {
    id: "1",
    title: "Meditación al atardecer",
    subtitle: "Meditación · Caminata · Char...",
    date: "28 abril · 18:00",
    attendees: "12/20",
    image: require("../assets/images/events/evento_meditation.png"),
  },
  {
    id: "2",
    title: "Caminata consciente",
    subtitle: "Sendero Vicente López",
    date: "5 mayo · 10:00",
    attendees: "8/15",
    image: require("../assets/images/events/event_walk.png"),
  },
  {
    id: "3",
    title: "Charla sobre el despertar",
    subtitle: "Filosofía · Meditación",
    date: "12 mayo · 19:30",
    attendees: "15/25",
    image: require("../assets/images/events/event_meditation2.png"),
  },
];

const Events = () => {
  const navigation = useNavigation();

  return (
    <ImageBackground
      source={require("../assets/images/backgroundSimple.png")}
      style={styles.bg}
    >
      <View style={styles.eventsContainer}>
        <Text style={styles.eventsTitle}>Eventos</Text>

        <View style={styles.eventsSearchBar}>
          <Icon name="search" size={20} color={TEXT_SECONDARY} />
          <TextInput
            style={styles.eventsSearchInput}
            placeholder="Buscar eventos..."
            placeholderTextColor={TEXT_SECONDARY}
          />
          <Icon name="chevron-forward" size={20} color={TEXT_SECONDARY} />
        </View>

        <FlatList
          data={EVENTS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.eventsListContent}
          showsVerticalScrollIndicator={false}
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
              <Image source={item.image} style={styles.eventCardImage} />
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
                  <TouchableOpacity style={styles.eventCardButton}>
                    <Text style={styles.eventCardButtonText}>Ver evento</Text>
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
    </ImageBackground>
  );
};

export default Events;
