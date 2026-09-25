import { vibesTheme } from "../src/theme/vibesTheme";
import React, { useMemo, useState } from "react";
import { StyleSheet, View, type ImageStyle, type StyleProp } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Icon from "./Icon";
import VibesLoader from "./VibesLoader";

type ProfileMediaImageProps = {
  source?: any;
  style?: StyleProp<ImageStyle>;
  fallbackBackgroundColor?: string;
  fallbackIconColor?: string;
  transition?: number;
  contentFit?: "cover" | "contain";
  onDisplay?: () => void;
  blurBackground?: boolean;
  showLoading?: boolean;
  priority?: "low" | "normal" | "high";
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
  fallbackBackgroundColor = "rgba(216, 140, 122, 0.25)",
  fallbackIconColor = vibesTheme.colors.secondaryText,
  transition = 250,
  contentFit = "cover",
  onDisplay,
  blurBackground = false,
  showLoading = false,
  priority = "high",
}: ProfileMediaImageProps) => {
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [displayedKey, setDisplayedKey] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ key: string; width: number; height: number } | null>(null);

  const canRenderSource = useMemo(() => {
    if (typeof source === "number") return true;
    if (hasValidUri(source)) return true;
    return false;
  }, [source]);

  const sourceKey =
    typeof source === "number"
      ? `asset:${source}`
      : hasValidUri(source)
        ? `uri:${source.uri}`
        : "";

  const isPortrait = imageSize?.key === sourceKey && imageSize.height > imageSize.width;
  const hasError = errorKey === sourceKey;
  const loading = showLoading && canRenderSource && !hasError && displayedKey !== sourceKey;

  return (
    <View style={[styles.container, { backgroundColor: fallbackBackgroundColor }, style]}>
      {!loading && <Icon name="person-outline" size={44} color={fallbackIconColor} />}
      {canRenderSource && !hasError ? (
        <>
        {blurBackground && imageSize?.key === sourceKey && !(isPortrait && contentFit === "cover") ? (
          <ExpoImage
            recyclingKey={`background-${sourceKey}`}
            source={source}
            style={[StyleSheet.absoluteFillObject, { transform: [{ scale: 1.08 }] }]}
            cachePolicy="memory-disk"
            contentFit="cover"
            priority="low"
            blurRadius={24}
            transition={0}
            accessible={false}
          />
        ) : null}
        <ExpoImage
          recyclingKey={sourceKey}
          source={source}
          style={StyleSheet.absoluteFillObject}
          cachePolicy="memory-disk"
          priority={priority}
          contentFit={blurBackground ? (isPortrait && contentFit === "cover" ? "cover" : "contain") : contentFit}
          onLoad={({ source: image }) => {
            setImageSize({ key: sourceKey, width: image.width, height: image.height });
          }}
          onDisplay={() => { setDisplayedKey(sourceKey); onDisplay?.(); }}
          transition={transition}
          onError={() => { setErrorKey(sourceKey); onDisplay?.(); }}
        />
        </>
      ) : null}
      {loading ? (
        <View pointerEvents="none" style={styles.loading} accessible accessibilityLabel="Cargando foto" accessibilityRole="progressbar">
          <VibesLoader size={64} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  loading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  container: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ProfileMediaImage;
