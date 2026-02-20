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
import VideoPlayer from "../components/VideoPlayer";

const VIDEOS = [
  { id: "1", title: "Grounding Flow", duration: "12 min", access: "Free" },
  { id: "2", title: "Cacao Ritual", duration: "8 min", access: "Paid" },
  { id: "3", title: "Breath Reset", duration: "9 min", access: "Free" },
];

const Videos = () => {
  const navigation = useNavigation();
  const defaultVideo =
    VIDEOS[0] ?? { id: "0", title: "Grounding Flow", duration: "10 min", access: "Free" };
  const [activeVideo, setActiveVideo] = React.useState(defaultVideo);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0.15);

  return (
    <View style={styles.bg}>
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
            <TouchableOpacity
              style={styles.meditationCard}
              onPress={() => {
                setActiveVideo(item);
                setIsPlaying(true);
                setProgress(0.1);
              }}
            >
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

        <View style={styles.meditationPlayerDock}>
          <VideoPlayer
            title={activeVideo.title}
            duration={activeVideo.duration}
            access={activeVideo.access}
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

export default Videos;
