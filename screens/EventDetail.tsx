/** @format */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import styles, { TEXT_SECONDARY } from "../assets/styles";
import Icon from "../components/Icon";

const EventDetail = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const event = (route.params as any)?.event;
  const isChallenge = event?.type === "challenge";
  const eventDescription =
    typeof event?.description === "string" && event.description.trim()
      ? event.description.trim()
      : typeof event?.subtitle === "string" && event.subtitle.trim()
        ? event.subtitle.trim()
        : null;
  const eventLocation =
    typeof event?.location === "string" && event.location.trim()
      ? event.location.trim()
      : null;
  const eventHostName =
    typeof event?.hostName === "string" && event.hostName.trim()
      ? event.hostName.trim()
      : null;
  const eventHostImage =
    typeof event?.hostImage === "string" && event.hostImage.trim()
      ? { uri: event.hostImage.trim() }
      : null;
  const eventTags = Array.isArray(event?.tags)
    ? event.tags.filter(
        (tag: unknown): tag is string =>
          typeof tag === "string" && tag.trim().length > 0,
      )
    : [];

  if (!event) {
    return null;
  }

  return (
    <View style={styles.eventDetailContainer}>
      <Image
        source={
          typeof event.image === "string" ? { uri: event.image } : event.image
        }
        style={styles.eventDetailHeroImage}
      />

      <View style={styles.eventDetailHeader}>
        <TouchableOpacity
          style={styles.eventDetailBackButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={24} color="#F6F6F4" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.eventDetailMenuButton}>
          <Icon name="ellipsis-horizontal" size={24} color="#F6F6F4" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.eventDetailContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eventDetailTitle}>{event.title}</Text>
        {eventDescription ? (
          <Text style={styles.eventDetailDescription}>{eventDescription}</Text>
        ) : null}

        {eventHostName ? (
          <View style={styles.eventDetailHostSection}>
            {eventHostImage ? (
              <Image
                source={eventHostImage}
                style={styles.eventDetailHostAvatar}
              />
            ) : null}
            <Text style={styles.eventDetailHostName}>{eventHostName}</Text>
          </View>
        ) : null}

        <View style={styles.eventDetailInfoSection}>
          <View style={styles.eventDetailInfoRow}>
            <Icon name="calendar" size={20} color={TEXT_SECONDARY} />
            <Text style={styles.eventDetailInfoText}>{event.date}</Text>
          </View>

          {eventLocation ? (
            <View style={styles.eventDetailInfoRow}>
              <Icon name="location" size={20} color={TEXT_SECONDARY} />
              <Text style={styles.eventDetailInfoText}>{eventLocation}</Text>
            </View>
          ) : null}

          {eventTags.length > 0 ? (
            <View style={styles.eventDetailInfoRow}>
              <Icon name="leaf" size={20} color={TEXT_SECONDARY} />
              <Text style={styles.eventDetailInfoText}>
                {eventTags.join(" · ")}
              </Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.eventDetailJoinButton}
          onPress={() =>
            navigation.navigate("EventChat" as never, { event } as never)
          }
        >
          <Text style={styles.eventDetailJoinButtonText}>
            {isChallenge ? "Sumarme al challenge" : "Sumarme al evento"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.eventDetailJoinNote}>
          {isChallenge
            ? "Al sumarte, entrás al grupo del challenge."
            : "Al sumarte, entrás al grupo del evento."}
        </Text>
      </ScrollView>
    </View>
  );
};

export default EventDetail;
