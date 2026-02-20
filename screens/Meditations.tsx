import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";
import MeditationPlayer from "../components/MeditationPlayer";

const MEDITATIONS = [
  { id: "1", title: "Morning Stillness", duration: "7 min", level: "Beginner" },
  { id: "2", title: "Heart Breath", duration: "10 min", level: "All levels" },
  { id: "3", title: "Calm Focus", duration: "12 min", level: "Intermediate" },
  { id: "4", title: "Evening Release", duration: "8 min", level: "Beginner" },
  { id: "5", title: "Gratitude Flow", duration: "9 min", level: "All levels" },
];

const Meditations = () => {
  const navigation = useNavigation();
  const defaultMeditation =
    MEDITATIONS[0] ?? {
      id: "0",
      title: "Gentle Reset",
      duration: "5 min",
      level: "All levels",
    };
  const [activeMeditation, setActiveMeditation] = React.useState(defaultMeditation);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0.25);

  return (
    <View style={styles.bg}>
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
          <TouchableOpacity
            style={styles.meditationCard}
            onPress={() => {
              setActiveMeditation(item);
              setIsPlaying(true);
              setProgress(0.1);
            }}
          >
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

      <View style={styles.meditationPlayerDock}>
        <MeditationPlayer
          title={activeMeditation.title}
          duration={activeMeditation.duration}
          level={activeMeditation.level}
          progress={progress}
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying((current) => !current)}
          onSkipPrev={() => setProgress((current) => Math.max(0, current - 0.1))}
          onSkipNext={() => setProgress((current) => Math.min(1, current + 0.1))}
          onOpen={() => navigation.navigate("Tab" as never)}
        />
      </View>
      </View>
    </View>
  );
};

export default Meditations;
