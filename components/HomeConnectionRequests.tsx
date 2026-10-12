import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useIncomingLikesQuery } from "../src/queries/matches.queries";
import { vibesTheme } from "../src/theme/vibesTheme";
import AvatarGroup from "./AvatarGroup";
import Icon from "./Icon";
import { Text } from "./Typography";
import VibesLoader from "./VibesLoader";

export default function HomeConnectionRequests({ canViewPhotos }: { canViewPhotos: boolean }) {
  const navigation = useNavigation();
  const requests = useIncomingLikesQuery();
  const people = requests.data ?? [];
  const openRequests = () => navigation.navigate("Tab" as never, {
    screen: "Discover", params: { incomingRequestKey: Date.now() },
  } as never);

  if (requests.isLoading) {
    return <View style={s.status}><VibesLoader accessibilityLabel="Cargando solicitudes de conexión" /></View>;
  }
  if (requests.isError) {
    return <TouchableOpacity accessibilityRole="button" onPress={() => void requests.refetch()} style={s.card}>
      <Text style={s.title}>Solicitudes de conexión</Text>
      <Text style={s.hint}>No pudimos cargarlas. Tocá para reintentar.</Text>
    </TouchableOpacity>;
  }
  if (!people.length) return null;

  return (
    <TouchableOpacity accessibilityRole="button"
      accessibilityLabel={`Ver ${people.length} solicitudes de personas que quieren conectar con vos`}
      onPress={openRequests} activeOpacity={0.8} style={s.card}>
      <View style={s.heading}>
        <Text style={[s.title, { flex: 1 }]}>Quieren conectar con vos</Text>
        <View style={s.badge}><Text style={s.count}>{people.length}</Text></View>
      </View>
      <View style={s.people}>
        <AvatarGroup size={40} max={3} items={people.map(person => ({
          id: person.likerUserId, uri: canViewPhotos ? person.likerUserPhoto : null,
        }))} />
        <Text numberOfLines={2} style={[s.hint, { flex: 1 }]}>
          {people.slice(0, 3).map(person => person.likerUserName || "Una persona").join(", ")}
          {people.length > 3 ? ` y ${people.length - 3} más` : ""}
        </Text>
      </View>
      <View style={s.heading}>
        <Text style={s.action}>Ver solicitudes</Text>
        <Icon name="arrow-forward" size={20} color={vibesTheme.colors.accentBlue} />
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  status: { alignItems: "center", marginBottom: 18 },
  card: {
    padding: 18, marginBottom: 20, gap: 14, borderRadius: 22,
    borderWidth: 1, borderColor: `${vibesTheme.colors.accentBlue}40`,
    backgroundColor: vibesTheme.colors.surface,
  },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.bold, fontSize: 20 },
  badge: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: vibesTheme.colors.accentMustard },
  count: { color: vibesTheme.colors.primaryText, fontSize: 15 },
  people: { flexDirection: "row", alignItems: "center", gap: 12 },
  hint: { color: vibesTheme.colors.secondaryText, fontSize: 16, lineHeight: 22 },
  action: { color: vibesTheme.colors.accentBlue, fontSize: 17 },
});
