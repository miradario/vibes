import { imageCacheSource } from "../src/lib/imageCacheSource";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View, type ImageStyle, type StyleProp } from "react-native";
import { Text } from "./Typography";
import { Image as ExpoImage } from "expo-image";
import VibesLoader from "./VibesLoader";
import BrandImagePlaceholder from "./BrandImagePlaceholder";
import { vibesTheme } from "../src/theme/vibesTheme";

type ProfileMediaImageProps = {
  source?: any;
  previewSource?: any;
  style?: StyleProp<ImageStyle>;
  fallbackBackgroundColor?: string;
  fallbackIconColor?: string;
  transition?: number;
  contentFit?: "cover" | "contain";
  onDisplay?: () => void;
  blurBackground?: boolean;
  showLoading?: boolean;
  loadingVariant?: "spinner" | "vibes";
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
  previewSource,
  style,
  fallbackBackgroundColor = vibesTheme.colors.background,
  transition = 250,
  contentFit = "cover",
  onDisplay,
  blurBackground = false,
  showLoading = true,
  loadingVariant = "spinner",
  priority = "high",
}: ProfileMediaImageProps) => {
  const source = useMemo(
    () => typeof inputSource === "string"
      ? (inputSource.trim() ? { uri: inputSource.trim() } : undefined)
      : inputSource,
    [inputSource],
  );
  const preview = typeof previewSource === "string" ? { uri: previewSource } : previewSource;
  const canPreview = typeof preview === "number" || hasValidUri(preview);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [displayedKey, setDisplayedKey] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
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

  const request = useMemo(() => ({}), [sourceKey, attempt]);
  const activeRequest = useRef(request);
  activeRequest.current = request;
  const successfulRequest = useRef<object | null>(null);
  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifiedRequest = useRef<object | null>(null);
  const displayCallback = useRef(onDisplay);
  displayCallback.current = onDisplay;
  const clearLoadTimer = () => {
    if (loadTimer.current !== null) clearTimeout(loadTimer.current);
    loadTimer.current = null;
  };
  const confirmLoaded = () => {
    if (activeRequest.current !== request) return false;
    successfulRequest.current = request;
    clearLoadTimer();
    return true;
  };
  const failRequest = () => {
    if (activeRequest.current !== request || successfulRequest.current === request) return;
    clearLoadTimer();
    setErrorKey(sourceKey);
    displayCallback.current?.();
  };

  const resolvedSize = imageSize?.key === sourceKey ? imageSize : knownImageSizes.get(sourceKey);
  const isPortrait = resolvedSize && resolvedSize.height > resolvedSize.width;
  const layoutReady = !blurBackground || Boolean(resolvedSize);
  const resolvedFit = blurBackground ? (isPortrait && contentFit === "cover" ? "cover" : "contain") : contentFit;
  useEffect(() => {
    if (displayedKey !== sourceKey || !layoutReady || notifiedRequest.current === request) return;
    notifiedRequest.current = request;
    displayCallback.current?.();
  }, [displayedKey, sourceKey, layoutReady, request]);
  const hasError = errorKey === sourceKey;
  const loading = canRenderSource && !hasError && displayedKey !== sourceKey;
  useEffect(() => {
    if (!loading) return;
    if (successfulRequest.current === request) return;
    const timer = setTimeout(failRequest, 15000);
    loadTimer.current = timer;
    return () => { clearTimeout(timer); if (loadTimer.current === timer) loadTimer.current = null; };
  }, [loading, sourceKey, attempt]);

  return (
    <View style={[styles.container, { backgroundColor: fallbackBackgroundColor }, style]}>
      {!canRenderSource ? <BrandImagePlaceholder /> : null}
      {canRenderSource && !hasError ? (
        <>
        {canPreview ? <ExpoImage source={imageCacheSource(preview)} style={StyleSheet.absoluteFillObject}
          contentFit="cover" cachePolicy="memory-disk" transition={0}
          priority={priority} accessible={false} /> : null}
        {blurBackground && resolvedSize && !(isPortrait && contentFit === "cover") ? (
          <ExpoImage
            recyclingKey={`background-${sourceKey}`}
            source={imageCacheSource(source)}
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
          key={`${sourceKey}-${attempt}`}
          recyclingKey={sourceKey}
          source={imageCacheSource(source)}
          placeholder={canPreview ? imageCacheSource(preview) : undefined}
          placeholderContentFit={resolvedFit}
          style={[StyleSheet.absoluteFillObject, { opacity: layoutReady ? 1 : 0 }]}
          cachePolicy="memory-disk"
          priority={priority}
          contentFit={resolvedFit}
          onLoad={({ source: image }) => {
            if (!confirmLoaded()) return;
            if (knownImageSizes.size >= 300) knownImageSizes.delete(knownImageSizes.keys().next().value!);
            knownImageSizes.set(sourceKey, { width: image.width, height: image.height });
            setImageSize({ key: sourceKey, width: image.width, height: image.height });
          }}
          onDisplay={() => {
            if (!confirmLoaded()) return;
            setDisplayedKey(sourceKey);
          }}
          transition={transition}
          onError={failRequest}
        />
        </>
      ) : null}
      {loading && showLoading && !canPreview ? (
        <View pointerEvents="none" style={styles.loading} accessible accessibilityLabel="Cargando foto" accessibilityRole="progressbar">
          {loadingVariant === "vibes" ? <VibesLoader accessibilityLabel="Cargando foto" /> : <ActivityIndicator size="small" color={vibesTheme.colors.accentBlue} accessibilityLabel="Cargando foto" />}
        </View>
      ) : null}
      {hasError ? (
        <View style={[styles.loading, { backgroundColor: fallbackBackgroundColor }]}>
          <Text style={{ color: vibesTheme.colors.secondaryText, textAlign: "center", marginBottom: 12 }}>No se pudo cargar la foto.</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => {
            setErrorKey(null); setDisplayedKey(null); setAttempt(value => value + 1);
          }} style={{ padding: 12 }}>
            <Text style={{ color: vibesTheme.colors.accentBlue }}>Reintentar</Text>
          </TouchableOpacity>
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
