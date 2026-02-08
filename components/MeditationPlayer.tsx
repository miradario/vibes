import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import styles, { DARK_GRAY, WHITE } from "../assets/styles";
import Icon from "./Icon";

type MeditationPlayerProps = {
  title: string;
  duration?: string;
  level?: string;
  progress?: number;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onSkipNext?: () => void;
  onSkipPrev?: () => void;
  onOpen?: () => void;
};

const clampProgress = (value?: number) => {
  if (value === undefined || Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
};

const MeditationPlayer = ({
  title,
  duration,
  level,
  progress = 0,
  isPlaying = false,
  onPlayPause,
  onSkipNext,
  onSkipPrev,
  onOpen,
}: MeditationPlayerProps) => {
  const progressWidth = `${clampProgress(progress) * 100}%`;

  return (
    <View style={styles.meditationPlayer}>
      <View style={styles.meditationPlayerHeader}>
        <View style={styles.meditationPlayerInfo}>
          <Text style={styles.meditationPlayerLabel}>Now Playing</Text>
          <Text style={styles.meditationPlayerTitle}>{title}</Text>
          {(duration || level) && (
            <Text style={styles.meditationPlayerMeta}>
              {duration || "—"} {duration && level ? "·" : ""} {level || ""}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.meditationPlayerOpen}
          onPress={onOpen}
          disabled={!onOpen}
        >
          <Icon name="open-outline" size={16} color={WHITE} />
          <Text style={styles.meditationPlayerOpenText}>Open</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.meditationPlayerProgress}>
        <View style={styles.meditationPlayerTrack}>
          <View style={[styles.meditationPlayerFill, { width: progressWidth }]} />
        </View>
      </View>

      <View style={styles.meditationPlayerControls}>
        <TouchableOpacity
          style={styles.meditationPlayerControl}
          onPress={onSkipPrev}
          disabled={!onSkipPrev}
        >
          <Icon name="play-skip-back" size={18} color={DARK_GRAY} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.meditationPlayerMain}
          onPress={onPlayPause}
          disabled={!onPlayPause}
        >
          <Icon name={isPlaying ? "pause" : "play"} size={20} color={WHITE} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.meditationPlayerControl}
          onPress={onSkipNext}
          disabled={!onSkipNext}
        >
          <Icon name="play-skip-forward" size={18} color={DARK_GRAY} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MeditationPlayer;
