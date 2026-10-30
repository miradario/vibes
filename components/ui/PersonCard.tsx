import React from "react";
import { StyleSheet, TouchableOpacity, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "../Typography";
import ProfileMediaImage from "../ProfileMediaImage";
import * as ds from "../../src/theme/tokens";

type PersonCardProps = {
  name: string;
  /** Texto corto opcional debajo del nombre (afinidad, ciudad…). */
  tag?: string;
  source?: ImageSourcePropType | null;
  /** Desenfoca la foto cuando la persona todavía no puede ver fotos. */
  blurred?: boolean;
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
export default function PersonCard({ name, tag, source, blurred, onPress, accessibilityLabel, style }: PersonCardProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `Ver perfil de ${name}`}
      activeOpacity={ds.opacity.pressed}
      style={[styles.card, style]}
      onPress={onPress}
    >
      <ProfileMediaImage source={source as any} style={styles.photo} blurRadius={blurred ? ds.componentSize.personCardBlur : 0} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {tag ? <Text style={styles.tag} numberOfLines={2}>{tag}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: ds.componentSize.personCard,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: ds.colors.border.default,
    borderRadius: ds.radii.lg,
    backgroundColor: ds.colors.bg.surface,
  },
  photo: { width: "100%", height: ds.componentSize.personCard },
  info: { padding: ds.spacing[2] },
  name: { alignSelf: "stretch", color: ds.colors.text.primary, ...ds.textStyles.subtitle },
  tag: { alignSelf: "stretch", marginTop: ds.spacing[1], color: ds.colors.text.secondary, ...ds.textStyles.micro },
});
