import React, { useMemo, useState } from "react";
import {
  Image,
  StyleSheet,
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
    source: require("../assets/videos/challenges/name/name.mp4"),
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
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const media = useMemo(
    () =>
      ONBOARDING_VIDEO_SOURCES[
        Math.floor(Math.random() * ONBOARDING_VIDEO_SOURCES.length)
      ],
    [],
  );

  return (
    <View style={[localStyles.videoWrap, containerStyle]}>
      <Image
        source={media.poster ?? DEFAULT_POSTER}
        style={[
          localStyles.poster,
          isReady && !hasError ? localStyles.posterHidden : null,
        ]}
      />
      <Video
        source={media.source}
        style={localStyles.video}
        resizeMode={resizeMode}
        shouldPlay
        isMuted
        isLooping
        onReadyForDisplay={() => {
          setHasError(false);
          setIsReady(true);
        }}
        onError={() => {
          setHasError(true);
          setIsReady(false);
        }}
      />
    </View>
  );
};

const localStyles = StyleSheet.create({
  videoWrap: {
    width: "100%",
    overflow: "hidden",
  },
  poster: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 1,
  },
  posterHidden: {
    opacity: 0,
  },
  video: {
    width: "100%",
    height: "100%",
  },
});

export default OnboardingVideo;
