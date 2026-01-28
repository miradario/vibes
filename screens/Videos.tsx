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

const VIDEOS = [
  { id: "1", title: "Grounding Flow", duration: "12 min", access: "Free" },
  { id: "2", title: "Cacao Ritual", duration: "8 min", access: "Paid" },
  { id: "3", title: "Breath Reset", duration: "9 min", access: "Free" },
];

const Videos = () => (
  <ImageBackground
    source={require("../assets/images/bg.png")}
    style={styles.bg}
  >
    <View style={styles.containerMeditations}>
      <View style={styles.top}>
        <Text style={styles.title}>Videos</Text>
        <TouchableOpacity>
          <Icon name="ellipsis-vertical" color={DARK_GRAY} size={20} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={VIDEOS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.meditationList}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.meditationCard}>
            <View>
              <Text style={styles.meditationTitle}>{item.title}</Text>
              <Text style={styles.meditationMeta}>
                {item.duration} · {item.access}
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

export default Videos;
