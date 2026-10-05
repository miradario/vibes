import React, { useState } from "react";
import { Image, StyleSheet, View, type ImageProps } from "react-native";
import BrandImagePlaceholder from "./BrandImagePlaceholder";

/** Shared placeholder for native image surfaces, including recycled list items. */
export default function MediaImage({ source, style, onLoad, onError, ...props }: ImageProps) {
  const key = JSON.stringify(source);
  const [loadedKey, setLoadedKey] = useState<string>();
  const [failedKey, setFailedKey] = useState<string>();
  const ready = Boolean(source) && loadedKey === key && failedKey !== key;
  return (
    <View style={[style, { overflow: "hidden" }]}>
      <Image {...props} key={key} source={source} style={[StyleSheet.absoluteFillObject, { width: "100%", height: "100%" }]}
        onLoad={(event) => { setLoadedKey(key); setFailedKey(undefined); onLoad?.(event); }}
        onError={(event) => { setFailedKey(key); onError?.(event); }} />
      {!ready && <BrandImagePlaceholder />}
    </View>
  );
}
