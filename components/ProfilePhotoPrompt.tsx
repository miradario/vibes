import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
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
      accessibilityLabel="Agregar una foto a mi perfil"
      activeOpacity={0.85}
      onPress={onPress ?? (() => navigation.navigate("EditProfile" as never))}
      style={s.card}
    >
      <View style={s.content}>
        <View style={s.camera}>
          <Icon name="camera-outline" size={28} color={vibesTheme.colors.primaryText} />
        </View>
        <View style={s.copy}>
          <Text style={s.title}>Agregá una foto para ver la foto de los perfiles</Text>
        </View>
      </View>
      <View style={s.action}>
        <Text style={s.actionText}>Agregar una foto</Text>
        <Icon name="arrow-forward" size={20} color={vibesTheme.colors.primaryText} />
      </View>
    </TouchableOpacity>
  );
}
const s = StyleSheet.create({
  card: {
    gap: 18,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 24,
    backgroundColor: "rgba(57, 120, 184, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(57, 120, 184, 0.24)",
  },
  content: { flexDirection: "row", alignItems: "center", gap: 14 },
  camera: { width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(244, 163, 64, 0.22)" },
  copy: { flex: 1, gap: 6 },
  title: { color: vibesTheme.colors.primaryText, fontSize: 21, lineHeight: 26, fontFamily: vibesTheme.fonts.medium },
  description: { color: vibesTheme.colors.secondaryText, fontSize: 16, lineHeight: 22 },
  action: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10, minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, backgroundColor: vibesTheme.colors.accentMustard },
  actionText: { color: vibesTheme.colors.primaryText, fontSize: 17, fontFamily: vibesTheme.fonts.medium },
  text: { flex: 1, color: vibesTheme.colors.primaryText, fontSize: 15 },
});
