import { imageCacheSource } from "../src/lib/imageCacheSource";
import React, { useState } from "react";
import { StyleSheet, View, type ImageProps } from "react-native";
import { Image, type ImageProps as ExpoImageProps } from "expo-image";
import BrandImagePlaceholder from "./BrandImagePlaceholder";

type MediaImageProps = Omit<ExpoImageProps, "onLoad" | "onError"> & Pick<ImageProps, "resizeMode" | "onLoad" | "onError">;

/** Use the same persistent image cache for feed thumbnails and their detail screens. */
export default function MediaImage({ source, style, onLoad, onError, onLoadStart, onLoadEnd, resizeMode, ...props }: MediaImageProps) {
  const key = JSON.stringify(source);
  const [loadedKey, setLoadedKey] = useState<string>();
  const [failedKey, setFailedKey] = useState<string>();
  const ready = Boolean(source) && loadedKey === key && failedKey !== key;
  return (
    <View style={[style, { overflow: "hidden" }]}>
      <Image {...props} recyclingKey={key} source={imageCacheSource(source)}
        style={[StyleSheet.absoluteFillObject, { width: "100%", height: "100%" }]}
        contentFit={resizeMode === "stretch" ? "fill" : resizeMode === "center" ? "none" : resizeMode === "contain" ? "contain" : "cover"}
        cachePolicy="memory-disk" transition={120}
        onLoadStart={onLoadStart}
        onLoadEnd={onLoadEnd}
        onLoad={(event) => {
          setLoadedKey(key); setFailedKey(undefined);
          onLoad?.({ nativeEvent: { source: { uri: event.source.url, width: event.source.width, height: event.source.height } } } as any);
        }}
        onError={(event) => { setFailedKey(key); onError?.({ nativeEvent: { error: event.error } } as any); }} />
      {!ready && <BrandImagePlaceholder />}
    </View>
  );
}
