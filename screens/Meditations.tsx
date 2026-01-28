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

const MEDITATIONS = [
  { id: "1", title: "Morning Stillness", duration: "7 min", level: "Beginner" },
  { id: "2", title: "Heart Breath", duration: "10 min", level: "All levels" },
  { id: "3", title: "Calm Focus", duration: "12 min", level: "Intermediate" },
  { id: "4", title: "Evening Release", duration: "8 min", level: "Beginner" },
  { id: "5", title: "Gratitude Flow", duration: "9 min", level: "All levels" },
];

const Meditations = () => (
  <ImageBackground
    source={require("../assets/images/bg.png")}
    style={styles.bg}
  >
    <View style={styles.containerMeditations}>
      <View style={styles.top}>
        <Text style={styles.title}>Meditations</Text>
        <TouchableOpacity>
          <Icon name="ellipsis-vertical" color={DARK_GRAY} size={20} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={MEDITATIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.meditationList}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.meditationCard}>
            <View>
              <Text style={styles.meditationTitle}>{item.title}</Text>
              <Text style={styles.meditationMeta}>
                {item.duration} · {item.level}
              </Text>
            </View>
            <View style={styles.meditationPlay}>
              <Icon name="play" size={16} color={DARK_GRAY} />
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  </ImageBackground>
);

export default Meditations;
