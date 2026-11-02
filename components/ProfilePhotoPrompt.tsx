import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuthSession } from "../src/auth/auth.queries";
import { useOwnInvalidPhotoQuery, useProfileQuery } from "../src/queries/profile.queries";
import { hasProfilePhotos } from "../src/lib/profilePhotos";
import { vibesTheme } from "../src/theme/vibesTheme";
import { Text } from "./Typography";
import Icon from "./Icon";
import * as ds from "../src/theme/tokens";

/**
 * Subtle, non-dismissable notice shown at the top while the viewer has no
 * (valid) photo and therefore can't see other people's photos. Tapping it
 * still opens the photo editor.
 */
export default function ProfilePhotoPrompt({
  onPress,
}: {
  onPress?: () => void;
}) {
  const navigation = useNavigation();
  const { data: session } = useAuthSession();
  const profile = useProfileQuery(session?.user.id);
  const withoutPhoto = profile.isSuccess && !hasProfilePhotos(profile.data);
  const invalidPhoto = useOwnInvalidPhotoQuery(session?.user.id, withoutPhoto);
  if (profile.isError)
    return (
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => void profile.refetch()}
        style={s.notice}
      >
        <Text style={s.text} numberOfLines={2}>
          No pudimos verificar tu foto. Tocá para reintentar.
        </Text>
      </TouchableOpacity>
    );
  if (!withoutPhoto) return null;
  const message = invalidPhoto.data
    ? "Tu foto no fue aprobada. Subí otra para ver las fotos de los perfiles."
    : "Agregá una foto para ver las fotos de los perfiles.";
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={message}
      accessibilityHint="Abre la edición de tu perfil para agregar una foto"
      activeOpacity={0.7}
      onPress={onPress ?? (() => navigation.navigate("EditProfile" as never, { photoRequestId: Date.now() } as never))}
      style={s.notice}
    >
      <Icon name="camera-outline" size={ds.iconSize.sm} color={vibesTheme.colors.accentBlue} />
      <Text style={s.text} numberOfLines={2}>{message}</Text>
      <Text style={s.action}>Agregar</Text>
    </TouchableOpacity>
  );
}
const s = StyleSheet.create({
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[2],
    minHeight: 36,
    paddingVertical: ds.spacing[2],
    paddingHorizontal: ds.spacing[3],
    borderRadius: ds.radii.md,
    backgroundColor: ds.colors.bg.surfaceTranslucent,
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.medium),
  },
  text: { flex: 1, color: vibesTheme.colors.secondaryText, ...ds.textStyles.bodySmall },
  action: { color: vibesTheme.colors.accentBlue, ...ds.textStyles.labelMedium },
});
