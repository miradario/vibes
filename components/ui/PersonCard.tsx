import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "../Typography";
import ProfileMediaImage from "../ProfileMediaImage";
import * as ds from "../../src/theme/tokens";
import { imageCacheSource } from "../../src/lib/imageCacheSource";

type PersonCardProps = {
  name: string;
  /** Texto corto opcional debajo del nombre (afinidad, ciudad…). */
  tag?: string;
  source?: ImageSourcePropType | null;
  /** Desenfoca la foto cuando la persona todavía no puede ver fotos. */
  blurred?: boolean;
  progressivePhoto?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * PersonCard (30/10, t915s3508): card chica de persona para carruseles.
 * Ancho y foto `componentSize.personCard` (96), `radii.lg`, borde `border/default`,
 * nombre `textStyles.subtitle`, tag `textStyles.micro` `text/secondary`. Toda la card es
 * tocable (>44), role button, pressed `opacity.pressed`.
 */
export default function PersonCard({ name, tag, source, blurred, progressivePhoto = false, onPress, accessibilityLabel, style }: PersonCardProps) {
  const sourceKey = JSON.stringify(imageCacheSource(source ?? null));
  const [readySource, setReadySource] = useState<string | null>(null);
  const waitingForPhoto = progressivePhoto && Boolean(source) && readySource !== sourceKey;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `Ver perfil de ${name}`}
      activeOpacity={ds.opacity.pressed}
      style={[styles.card, style]}
      onPress={onPress}
    >
      <View style={styles.photo}>
        <ProfileMediaImage source={source as any} style={styles.photo}
          showLoading={!progressivePhoto} blurBackground={!progressivePhoto}
          contentFit="cover" transition={0}
          onDisplay={() => setReadySource(sourceKey)}
          blurRadius={blurred ? ds.componentSize.personCardBlur : 0} />
        {waitingForPhoto ? <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.skeleton]} /> : null}
      </View>
      <View style={[styles.info, progressivePhoto && styles.reservedInfo]}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {tag ? <Text style={styles.tag} numberOfLines={2}>{tag}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

export function PersonCardSkeleton() {
  return (
    <View style={styles.card} accessible accessibilityLabel="Cargando persona" accessibilityState={{ busy: true }}>
      <View style={[styles.photo, styles.skeleton]} />
      <View style={styles.info}>
        <View style={[styles.skeleton, { height: 22, width: "85%" }]} />
        <View style={[styles.skeleton, { marginTop: ds.spacing[1], height: 28, width: "70%" }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: { backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.soft) },
  card: {
    width: ds.componentSize.personCard,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: ds.colors.border.default,
    borderRadius: ds.radii.lg,
    backgroundColor: ds.colors.bg.surface,
  },
  photo: { width: "100%", height: ds.componentSize.personCard },
  reservedInfo: { minHeight: 70 },
  info: { padding: ds.spacing[2] },
  name: { alignSelf: "stretch", color: ds.colors.text.primary, ...ds.textStyles.subtitle },
  tag: { alignSelf: "stretch", marginTop: ds.spacing[1], color: ds.colors.text.secondary, ...ds.textStyles.micro },
});
