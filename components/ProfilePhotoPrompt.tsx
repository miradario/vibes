import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuthSession } from "../src/auth/auth.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import { hasProfilePhotos } from "../src/lib/profilePhotos";
import { vibesTheme } from "../src/theme/vibesTheme";
import { Text } from "./Typography";
import Icon from "./Icon";

export default function ProfilePhotoPrompt({
  onPress,
}: {
  onPress?: () => void;
}) {
  const navigation = useNavigation();
  const { data: session } = useAuthSession();
  const profile = useProfileQuery(session?.user.id);
  if (profile.isError)
    return (
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => void profile.refetch()}
        style={s.card}
      >
        <Text style={s.text}>
          No pudimos verificar tu foto. Tocá para reintentar.
        </Text>
      </TouchableOpacity>
    );
  if (!profile.isSuccess || hasProfilePhotos(profile.data)) return null;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress ?? (() => navigation.navigate("EditProfile" as never))}
      style={s.card}
    >
      <Icon
        name="camera-outline"
        size={24}
        color={vibesTheme.colors.primaryText}
      />
      <Text style={s.text}>
        Agregá una foto tuya para ver las fotos de otros perfiles.
      </Text>
      <Icon
        name="chevron-forward"
        size={20}
        color={vibesTheme.colors.primaryText}
      />
    </TouchableOpacity>
  );
}
const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    marginVertical: 12,
    borderRadius: 16,
    backgroundColor: vibesTheme.colors.surface,
    borderWidth: 1,
    borderColor: vibesTheme.colors.accentBlue,
  },
  text: { flex: 1, color: vibesTheme.colors.primaryText, fontSize: 15 },
});
