import React from "react";
import {
  View,
  Text,
  ImageBackground,
  FlatList,
  TouchableOpacity,
} from "react-native";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";

const EVENTS = [
  {
    id: "1",
    title: "Full Moon Gathering",
    date: "Mar 12",
    location: "Sedona, AZ",
    access: "Free",
  },
  {
    id: "2",
    title: "Breath & Sound Circle",
    date: "Mar 24",
    location: "Red Rock Park",
    access: "Paid",
  },
  {
    id: "3",
    title: "Sunrise Flow",
    date: "Apr 2",
    location: "Cathedral Rock",
    access: "Free",
  },
];

const Events = () => (
  <ImageBackground
      source={require("../assets/images/backgroundSimple.png")}
    style={styles.bg}
  >
    <View style={styles.containerMeditations}>
      <View style={styles.top}>
        <Text style={styles.title}>Events</Text>
        <TouchableOpacity>
          <Icon name="ellipsis-vertical" color={DARK_GRAY} size={20} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={EVENTS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.meditationList}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.meditationCard}>
            <View>
              <Text style={styles.meditationTitle}>{item.title}</Text>
              <Text style={styles.meditationMeta}>
                {item.date} · {item.location} · {item.access}
              </Text>
            </View>
            <View style={styles.meditationPlay}>
              <Icon name="calendar" size={16} color={DARK_GRAY} />
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  </ImageBackground>
);

export default Events;
