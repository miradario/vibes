import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "./Typography";
import { useNavigation } from "@react-navigation/native";
import Icon from "./Icon";
import { useMatchesQuery } from "../src/queries/matches.queries";
import { useCommunityUnreadQuery } from "../src/queries/communityReceipts.queries";
import { useConnectionViewsQuery } from "../src/queries/homeActivity.queries";
import {
  getHomeUnreadSummary,
  getNewConnections,
} from "../src/lib/homeActivity";
import { vibesTheme } from "../src/theme/vibesTheme";

export default function HomeActivityCard() {
  const navigation = useNavigation();
  const unread = useCommunityUnreadQuery();
  const matches = useMatchesQuery();
  const views = useConnectionViewsQuery();
  const messages = getHomeUnreadSummary(unread.isSuccess ? unread.data : []);
  const connections =
    matches.isSuccess && views.isSuccess
      ? getNewConnections(matches.data, views.data).length
      : 0;
  if (!messages.total && !connections) return null;
  const open = (target: "messages" | "connections") =>
    navigation.navigate(
      "Tab" as never,
      {
        screen: "Calendar",
        params: {
          initialSection: "chat",
          homeTarget: target,
          homeEntryKey: Date.now(),
          initialMessagesTab: messages.direct ? "messages" : "groups",
        },
      } as never
    );
  const row = (
    target: "messages" | "connections",
    count: number,
    title: string,
    hint: string,
    icon: string
  ) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${count} ${title}. ${hint}`}
      onPress={() => open(target)}
      style={s.row}
    >
      <View style={s.icon}>
        <Icon name={icon} size={23} color="#765B91" />
      </View>
      <View style={s.copy}>
        <Text style={s.title}>
          {count} {title}
        </Text>
        <Text style={s.hint}>{hint}</Text>
      </View>
      <Icon name="chevron-forward" size={20} color="#8A8178" />
    </TouchableOpacity>
  );
  return (
    <View style={s.card}>
      <Text style={s.eyebrow}>NOVEDADES EN TU COMUNIDAD</Text>
      {messages.total
        ? row(
            "messages",
            messages.total,
            messages.total === 1 ? "mensaje sin leer" : "mensajes sin leer",
            `${messages.direct} en chats privados · ${messages.groups} en grupos`,
            "chatbubble-ellipses-outline"
          )
        : null}
      {connections
        ? row(
            "connections",
            connections,
            connections === 1 ? "conexión nueva" : "conexiones nuevas",
            "Conocé a quienes conectaron con vos",
            "people-outline"
          )
        : null}
    </View>
  );
}
const s = StyleSheet.create({
  card: {
    backgroundColor: "#F3EDF8",
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
  },
  eyebrow: {
    color: "#765B91",
    fontSize: 11,
    letterSpacing: 1,
    fontFamily: vibesTheme.fonts.semibold,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1 },
  title: {
    fontSize: 20,
    lineHeight: 27,
    color: "#2B2B2B",
    fontFamily: vibesTheme.fonts.medium,
  },
  hint: { fontSize: 14, lineHeight: 20, color: "#6E6575", marginTop: 4 },
});
