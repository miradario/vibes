import React, { useState } from "react";
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { ResizeMode, Video, type AVPlaybackSource } from "expo-av";

type Props = {
  source: AVPlaybackSource;
  posterSource?: ImageSourcePropType | null;
  style?: StyleProp<ViewStyle>;
  resizeMode?: ResizeMode;
  shouldPlay?: boolean;
  isMuted?: boolean;
  isLooping?: boolean;
  rate?: number;
};

const LoopingVideo = ({
  source,
  posterSource,
  style,
  resizeMode = ResizeMode.COVER,
  shouldPlay = true,
  isMuted = true,
  isLooping = true,
  rate = 1,
}: Props) => {
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <View style={[localStyles.wrap, style]}>
      {posterSource ? (
        <Image
          source={posterSource}
          style={[
            localStyles.fill,
            isReady && !hasError ? localStyles.posterHidden : null,
          ]}
        />
      ) : null}
      <Video
        source={source}
        style={localStyles.fill}
        resizeMode={resizeMode}
        shouldPlay={shouldPlay}
        isMuted={isMuted}
        isLooping={isLooping}
        rate={rate}
        shouldCorrectPitch={false}
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
  wrap: {
    overflow: "hidden",
    position: "relative",
  },
  fill: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  posterHidden: {
    opacity: 0,
  },
});

export default LoopingVideo;
