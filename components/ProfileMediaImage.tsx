import React, { useMemo, useState } from "react";
import { StyleSheet, View, type ImageStyle, type StyleProp } from "react-native";
import { Image as ExpoImage } from "expo-image";
import BrandImagePlaceholder from "./BrandImagePlaceholder";
import { vibesTheme } from "../src/theme/vibesTheme";

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

// Share dimensions between the preview underneath a swipe and the active card.
const knownImageSizes = new Map<string, { width: number; height: number }>();

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
  source: inputSource,
  style,
  fallbackBackgroundColor = vibesTheme.colors.background,
  transition = 250,
  contentFit = "cover",
  onDisplay,
  blurBackground = false,
  priority = "high",
}: ProfileMediaImageProps) => {
  const source = useMemo(
    () => typeof inputSource === "string"
      ? (inputSource.trim() ? { uri: inputSource.trim() } : undefined)
      : inputSource,
    [inputSource],
  );
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

  const resolvedSize = imageSize?.key === sourceKey ? imageSize : knownImageSizes.get(sourceKey);
  const isPortrait = resolvedSize && resolvedSize.height > resolvedSize.width;
  const layoutReady = !blurBackground || Boolean(resolvedSize);
  const resolvedFit = blurBackground ? (isPortrait && contentFit === "cover" ? "cover" : "contain") : contentFit;
  const hasError = errorKey === sourceKey;
  const loading = !canRenderSource || hasError || displayedKey !== sourceKey;

  return (
    <View style={[styles.container, { backgroundColor: fallbackBackgroundColor }, style]}>
      {canRenderSource && !hasError ? (
        <>
        {blurBackground && resolvedSize && !(isPortrait && contentFit === "cover") ? (
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
          key={`${sourceKey}-${resolvedFit}`}
          recyclingKey={sourceKey}
          source={source}
          style={[StyleSheet.absoluteFillObject, { opacity: layoutReady ? 1 : 0 }]}
          cachePolicy="memory-disk"
          priority={priority}
          contentFit={resolvedFit}
          onLoad={({ source: image }) => {
            if (knownImageSizes.size >= 300) knownImageSizes.delete(knownImageSizes.keys().next().value!);
            knownImageSizes.set(sourceKey, { width: image.width, height: image.height });
            setImageSize({ key: sourceKey, width: image.width, height: image.height });
          }}
          onDisplay={() => {
            const size = knownImageSizes.get(sourceKey);
            const finalFit = blurBackground ? (size && size.height > size.width && contentFit === "cover" ? "cover" : "contain") : contentFit;
            if (blurBackground && (!size || finalFit !== resolvedFit)) return;
            setDisplayedKey(sourceKey);
            onDisplay?.();
          }}
          transition={transition}
          onError={() => { setErrorKey(sourceKey); onDisplay?.(); }}
        />
        </>
      ) : null}
      {loading ? (
        <View pointerEvents="none" style={styles.loading} accessible accessibilityLabel="Cargando foto" accessibilityRole="progressbar">
          <BrandImagePlaceholder />
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
