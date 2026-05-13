import React, { useMemo, useState } from "react";
import { StyleSheet, View, type ImageStyle, type StyleProp } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Icon from "./Icon";

type ProfileMediaImageProps = {
  source?: any;
  style?: StyleProp<ImageStyle>;
  fallbackBackgroundColor?: string;
  fallbackIconColor?: string;
  transition?: number;
};

const hasValidUri = (value: unknown): value is { uri: string } => {
  return (
    typeof value === "object" &&
    value !== null &&
    "uri" in value &&
    typeof (value as { uri?: unknown }).uri === "string" &&
    (value as { uri: string }).uri.trim().length > 0
  );
};

const ProfileMediaImage = ({
  source,
  style,
  fallbackBackgroundColor = "#E9E4DD",
  fallbackIconColor = "#7F776F",
  transition = 150,
}: ProfileMediaImageProps) => {
  const [hasError, setHasError] = useState(false);

  const canRenderSource = useMemo(() => {
    if (typeof source === "number") return true;
    if (hasValidUri(source)) return true;
    return false;
  }, [source]);

  return (
    <View style={[styles.container, { backgroundColor: fallbackBackgroundColor }, style]}>
      <Icon name="person-outline" size={44} color={fallbackIconColor} />
      {canRenderSource && !hasError ? (
        <ExpoImage
          source={source}
          style={StyleSheet.absoluteFillObject}
          cachePolicy="memory-disk"
          contentFit="cover"
          transition={transition}
          onError={() => setHasError(true)}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ProfileMediaImage;
