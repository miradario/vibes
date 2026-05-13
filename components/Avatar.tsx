import React, { useMemo, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Icon from "./Icon";

type AvatarProps = {
  source?: any;
  uri?: string | null;
  size: number;
  version?: string | number | null;
  shape?: "circle" | "rounded";
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
  fallbackBackgroundColor?: string;
  fallbackIconColor?: string;
  borderRadius?: number;
};

const DEFAULT_BG = "#F3E7D3";
const DEFAULT_ICON = "#B08A57";

const Avatar = ({
  source,
  uri,
  size,
  version,
  shape = "circle",
  style,
  iconSize,
  fallbackBackgroundColor = DEFAULT_BG,
  fallbackIconColor = DEFAULT_ICON,
  borderRadius,
}: AvatarProps) => {
  const [hasError, setHasError] = useState(false);
  const sourceUri =
    source && typeof source === "object" && "uri" in source && typeof source.uri === "string"
      ? source.uri
      : null;
  const trimmedUri = typeof uri === "string" ? uri.trim() : sourceUri?.trim() ?? "";
  const hasUri = trimmedUri.length > 0;
  const hasSource = Boolean(source);

  const resolvedUri = useMemo(() => {
    if (!hasUri || version == null || String(version).trim().length === 0) {
      return trimmedUri;
    }

    const separator = trimmedUri.includes("?") ? "&" : "?";
    return `${trimmedUri}${separator}v=${encodeURIComponent(String(version))}`;
  }, [hasUri, trimmedUri, version]);

  const resolvedRadius =
    typeof borderRadius === "number"
      ? borderRadius
      : shape === "circle"
        ? size / 2
        : Math.round(size * 0.28);

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: resolvedRadius,
          backgroundColor: fallbackBackgroundColor,
        },
        style,
      ]}
    >
      <Icon
        name="person-outline"
        size={iconSize ?? Math.max(14, Math.round(size * 0.44))}
        color={fallbackIconColor}
      />
      {(hasSource || hasUri) && !hasError ? (
        <ExpoImage
          source={hasUri ? { uri: resolvedUri } : source}
          style={[StyleSheet.absoluteFillObject, { borderRadius: resolvedRadius }]}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
          onError={() => setHasError(true)}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});

export default Avatar;
