import React, { useMemo, useState } from "react";
import {
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { ResizeMode, Video, type AVPlaybackSource } from "expo-av";

const DEFAULT_POSTER = require("../assets/images/challenges/vibesLogo.png");

const ONBOARDING_VIDEO_SOURCES: Array<{
  source: AVPlaybackSource;
  poster: ImageSourcePropType;
}> = [
  {
    source: require("../assets/videos/bienvenidx.mp4"),
    poster: require("../assets/images/challenges/vibesLogo.png"),
  },
  {
    source: require("../assets/videos/boarding.mp4"),
    poster: require("../assets/images/challenges/signup.png"),
  },
  {
    source: require("../assets/videos/connection.mp4"),
    poster: require("../assets/images/challenges/events.png"),
  },
  {
    source: require("../assets/videos/name.mp4"),
    poster: require("../assets/images/challenges/login.png"),
  },
  {
    source: require("../assets/videos/onboardingVibes.mp4"),
    poster: require("../assets/images/challenges/vibesLogo.png"),
  },
  {
    source: require("../assets/videos/signup.mp4"),
    poster: require("../assets/images/challenges/signup.png"),
  },
  {
    source: require("../assets/videos/welcome.mp4"),
    poster: require("../assets/images/challenges/vibesLogo.png"),
  },
];

type Props = {
  containerStyle?: StyleProp<ViewStyle>;
  resizeMode?: ResizeMode;
};

const OnboardingVideo = ({
  containerStyle,
  resizeMode = ResizeMode.CONTAIN,
}: Props) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const media = useMemo(
    () =>
      ONBOARDING_VIDEO_SOURCES[
        Math.floor(Math.random() * ONBOARDING_VIDEO_SOURCES.length)
      ],
    [],
  );

  return (
    <View style={[localStyles.videoWrap, containerStyle]}>
      {!isPlaying ? (
        <TouchableOpacity
          activeOpacity={0.92}
          style={localStyles.posterPressable}
          onPress={() => setIsPlaying(true)}
        >
          <Image
            source={media.poster ?? DEFAULT_POSTER}
            style={localStyles.poster}
          />
        </TouchableOpacity>
      ) : null}
      <Video
        source={media.source}
        style={localStyles.video}
        resizeMode={resizeMode}
        shouldPlay={isPlaying}
        isMuted
        isLooping
      />
    </View>
  );
};

const localStyles = StyleSheet.create({
  videoWrap: {
    width: "100%",
    overflow: "hidden",
  },
  posterPressable: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
  },
  poster: {
    width: "100%",
    height: "100%",
  },
  video: {
    width: "100%",
    height: "100%",
  },
});

export default OnboardingVideo;
