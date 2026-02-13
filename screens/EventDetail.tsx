/** @format */

import React from "react";
import {
  View,
  Text,
  ImageBackground,
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
          <Icon name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.eventDetailMenuButton}>
          <Icon name="ellipsis-horizontal" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.eventDetailContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eventDetailTitle}>{event.title}</Text>
        <Text style={styles.eventDetailDescription}>
          Nos encontraremos al atardecer para meditar en silencio y conectar con
          la energía del sol.
        </Text>

        <View style={styles.eventDetailHostSection}>
          <Image
            source={require("../assets/images/01.jpg")}
            style={styles.eventDetailHostAvatar}
          />
          <Text style={styles.eventDetailHostName}>Vale Martínez</Text>
        </View>

        <View style={styles.eventDetailInfoSection}>
          <View style={styles.eventDetailInfoRow}>
            <Icon name="calendar" size={20} color={TEXT_SECONDARY} />
            <Text style={styles.eventDetailInfoText}>{event.date}</Text>
          </View>

          <View style={styles.eventDetailInfoRow}>
            <Icon name="location" size={20} color={TEXT_SECONDARY} />
            <Text style={styles.eventDetailInfoText}>
              {event.location || "Parque Palermo, Buenos Aires"}
            </Text>
          </View>

          <View style={styles.eventDetailInfoRow}>
            <Icon name="leaf" size={20} color={TEXT_SECONDARY} />
            <Text style={styles.eventDetailInfoText}>
              calma · apertura · silencio
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.eventDetailJoinButton}
          onPress={() =>
            navigation.navigate("EventChat" as never, { event } as never)
          }
        >
          <Text style={styles.eventDetailJoinButtonText}>
            Sumarme al evento
          </Text>
        </TouchableOpacity>

        <Text style={styles.eventDetailJoinNote}>
          Al sumarte, entrás al grupo del evento.
        </Text>
      </ScrollView>
    </View>
  );
};

export default EventDetail;
