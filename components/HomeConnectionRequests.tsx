import React from "react";
import { TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useIncomingLikesQuery, useMatchesQuery } from "../src/queries/matches.queries";
import { useConnectionViewsQuery } from "../src/queries/homeActivity.queries";
import { getNewConnections } from "../src/lib/homeActivity";
import { vibesTheme } from "../src/theme/vibesTheme";
import ConnectionStrip from "./ConnectionStrip";
import { Text } from "./Typography";

export default function HomeConnectionRequests({ canViewPhotos }: { canViewPhotos: boolean }) {
  const navigation = useNavigation();
  const requests = useIncomingLikesQuery();
  const matches = useMatchesQuery();
  const views = useConnectionViewsQuery();
  const openConnections = () => navigation.navigate("Tab" as never, {
    screen: "Calendar", params: { homeEntryKey: Date.now(), homeTarget: "connections" },
  } as never);
  if (requests.isError && !requests.data?.length && !matches.data?.length) {
    return <TouchableOpacity accessibilityRole="button" onPress={() => void requests.refetch()} style={{ paddingVertical: 12 }}>
      <Text style={{ color: vibesTheme.colors.secondaryText }}>No pudimos cargar las conexiones. Tocá para reintentar.</Text>
    </TouchableOpacity>;
  }
  return <ConnectionStrip compact blurHiddenPhotos canViewPhotos={canViewPhotos}
    incomingLikes={requests.data ?? []}
    newConnections={views.isSuccess ? getNewConnections(matches.data ?? [], views.data) : []}
    onRequests={() => navigation.navigate("Tab" as never, { screen: "Calendar", params: { homeEntryKey: Date.now(), homeTarget: "incoming" } } as never)}
    onViewAll={openConnections}
    onConnection={item => navigation.navigate("Chat" as never, {
      matchId: item.id, otherUserId: item.otherUserId,
      otherUserName: item.otherUserName, otherUserPhoto: canViewPhotos ? item.otherUserPhoto : null,
    } as never)} />;
}
