/** @format */

import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components";
import styles, { BG_MAIN, DARK_GRAY } from "../assets/styles";
import UserProfileSheet from "../components/UserProfileSheet";
import {
  useMatchesQuery,
  useIncomingLikesQuery,
  type MatchWithProfile,
  type IncomingLike,
} from "../src/queries/matches.queries";
import {
  useMyEventGroupsQuery,
  type EventGroupSummary,
} from "../src/queries/events.queries";
import { useAuthSession } from "../src/auth/auth.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";
import { mapCandidateToConnectionProfile } from "../src/lib/connectionProfiles";
import { useSwipeMutation } from "../src/queries/swipes.mutations";
import { handleApiError } from "../src/utils/handleApiError";

const LOGO = require("../assets/images/logo.png");

type NewConnectionItem =
  | { type: "match"; item: MatchWithProfile }
  | { type: "incoming"; item: IncomingLike };

const formatTime = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays === 0) {
    return d.toLocaleTimeString("es-AR", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) {
    const value = d.toLocaleDateString("es-AR", { weekday: "short" });
    return value.charAt(0).toUpperCase() + value.slice(1).replace(".", "");
  }
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
};

const getFirstName = (name: string) => name.trim().split(" ")[0] || "Vibes";

const Messages = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  const { data: matches, isLoading } = useMatchesQuery();
  const { data: incomingLikes = [] } = useIncomingLikesQuery();
  const swipeMutation = useSwipeMutation();
  const { data: eventGroups = [], isLoading: groupsLoading } =
    useMyEventGroupsQuery(userId);
  const [selectedIncomingLike, setSelectedIncomingLike] =
    useState<IncomingLike | null>(null);
  const [groupsCollapsed, setGroupsCollapsed] = useState(false);
  const { data: selectedIncomingProfile } = useProfileQuery(
    selectedIncomingLike?.likerUserId,
  );
  const { data: selectedIncomingPreferences } = useUserPreferencesQuery(
    selectedIncomingLike?.likerUserId,
  );

  const withMessages = (matches ?? []).filter((m) => m.lastMessage);
  const newConnections = (matches ?? []).filter((m) => !m.lastMessage);
  const topConnections: NewConnectionItem[] = [
    ...newConnections.map((item) => ({ type: "match" as const, item })),
    ...incomingLikes.map((item) => ({ type: "incoming" as const, item })),
  ];
  const selectedIncomingLikeCard = selectedIncomingLike
    ? mapCandidateToConnectionProfile({
        id: selectedIncomingLike.likerUserId,
        displayName:
          selectedIncomingProfile?.displayName ??
          selectedIncomingLike.likerUserName,
        ...(selectedIncomingProfile ?? {}),
        ...(selectedIncomingPreferences ?? {}),
        photos:
          selectedIncomingProfile?.photos ??
          (selectedIncomingLike.likerUserPhoto
            ? [selectedIncomingLike.likerUserPhoto]
            : []),
      })
    : null;

  const openMatchChat = (item: MatchWithProfile) => {
    navigation.navigate(
      "Chat" as never,
      {
        matchId: item.id,
        otherUserId: item.otherUserId,
        otherUserName: item.otherUserName,
        otherUserPhoto: item.otherUserPhoto,
      } as never,
    );
  };

  const openGroupChat = (item: EventGroupSummary) => {
    navigation.navigate("EventChat" as never, { event: item.event } as never);
  };

  const handleConnectIncomingLike = () => {
    if (!selectedIncomingLike || !selectedIncomingLikeCard) return;

    swipeMutation.mutate(
      {
        targetUserId: String(selectedIncomingLike.likerUserId),
        direction: "like",
      },
      {
        onSuccess: (response) => {
          if (response?.match) {
            navigation.navigate(
              "Match" as never,
              { profile: selectedIncomingLikeCard } as never,
            );
          }
          setSelectedIncomingLike(null);
        },
        onError: (error) =>
          handleApiError(error, { toastTitle: "Error al conectar" }),
      },
    );
  };

  const handleDismissIncomingLike = () => {
    if (!selectedIncomingLike) return;

    swipeMutation.mutate(
      {
        targetUserId: String(selectedIncomingLike.likerUserId),
        direction: "pass",
      },
      {
        onSuccess: () => setSelectedIncomingLike(null),
        onError: (error) =>
          handleApiError(error, { toastTitle: "Error al descartar" }),
      },
    );
  };

  const renderSectionHeader = (
    icon: string,
    title: string,
    count: number,
    seeAllLabel: string,
    options?: { collapsible?: boolean; collapsed?: boolean; onPress?: () => void },
  ) => (
    <View style={localStyles.sectionHeader}>
      <View style={localStyles.sectionTitleWrap}>
        <Icon name={icon as any} color={DARK_GRAY} size={19} />
        <Text style={localStyles.sectionTitle}>{title}</Text>
        <View style={localStyles.countBadge}>
          <Text style={localStyles.countText}>{count}</Text>
        </View>
      </View>
      <TouchableOpacity
        activeOpacity={0.75}
        style={localStyles.seeAllButton}
        onPress={options?.onPress}
      >
        <Text style={localStyles.seeAllText}>{seeAllLabel}</Text>
        <Icon
          name={
            options?.collapsible
              ? options.collapsed
                ? "chevron-down"
                : "chevron-up"
              : "chevron-forward"
          }
          color="#7B746C"
          size={17}
        />
      </TouchableOpacity>
    </View>
  );

  const renderNewConnection = (connection: NewConnectionItem) => {
    const isMatch = connection.type === "match";
    const name = isMatch
      ? connection.item.otherUserName
      : connection.item.likerUserName;
    const photo = isMatch
      ? connection.item.otherUserPhoto
      : connection.item.likerUserPhoto;

    return (
      <TouchableOpacity
        key={`${connection.type}-${connection.item.id}`}
        style={localStyles.newConnectionItem}
        activeOpacity={0.78}
        onPress={() =>
          isMatch
            ? openMatchChat(connection.item)
            : setSelectedIncomingLike(connection.item)
        }
      >
        <View style={localStyles.newAvatarFrame}>
          <Image
            source={photo ? { uri: photo } : LOGO}
            style={localStyles.newAvatar}
          />
          {isMatch ? <View style={localStyles.onlineDot} /> : null}
        </View>
        <Text style={localStyles.newName} numberOfLines={1}>
          {getFirstName(name)}
        </Text>
        <Text style={localStyles.newSubtitle}>Nueva conexión</Text>
      </TouchableOpacity>
    );
  };

  const renderGroupRow = (item: EventGroupSummary, index: number) => {
    const imgSource =
      typeof item.image === "string" ? { uri: item.image } : item.image;
    const isChallenge = item.eventType === "challenge";

    return (
      <TouchableOpacity
        key={item.eventId}
        style={[
          localStyles.cardRow,
          index > 0 && localStyles.cardRowWithDivider,
        ]}
        activeOpacity={0.78}
        onPress={() => openGroupChat(item)}
      >
        <Image source={imgSource} style={localStyles.groupAvatar} />
        <View style={localStyles.rowBody}>
          <View style={localStyles.rowTitleLine}>
            <Text style={localStyles.rowTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View
              style={[
                localStyles.typeBadge,
                isChallenge ? localStyles.challengeBadge : localStyles.eventBadge,
              ]}
            >
              <Text
                style={[
                  localStyles.typeBadgeText,
                  isChallenge
                    ? localStyles.challengeBadgeText
                    : localStyles.eventBadgeText,
                ]}
              >
                {isChallenge ? "Challenge" : "Evento"}
              </Text>
            </View>
          </View>
          <Text style={localStyles.lastMessage} numberOfLines={2}>
            {item.lastMessage ?? "No hay mensajes aún"}
          </Text>
        </View>
        <View style={localStyles.rowMeta}>
          <Text style={localStyles.rowTime}>{formatTime(item.lastMessageAt)}</Text>
          {item.hasUnread ? <View style={localStyles.unreadDot} /> : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderDirectRow = (item: MatchWithProfile, index: number) => (
    <TouchableOpacity
      key={item.id}
      style={[localStyles.cardRow, index > 0 && localStyles.cardRowWithDivider]}
      activeOpacity={0.78}
      onPress={() => openMatchChat(item)}
    >
      <Image
        source={item.otherUserPhoto ? { uri: item.otherUserPhoto } : LOGO}
        style={localStyles.directAvatar}
      />
      <View style={localStyles.rowBody}>
        <Text style={localStyles.rowTitle} numberOfLines={1}>
          {item.otherUserName}
        </Text>
        <Text style={localStyles.lastMessage} numberOfLines={1}>
          {item.lastMessage ?? "Nueva conexión"}
        </Text>
      </View>
      <View style={localStyles.rowMeta}>
        <Text style={localStyles.rowTime}>{formatTime(item.lastMessageAt)}</Text>
        {item.hasUnread ? <View style={localStyles.unreadDot} /> : null}
      </View>
    </TouchableOpacity>
  );

  const loading = isLoading || groupsLoading;

  return (
    <View style={styles.bg}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          localStyles.content,
          {
            paddingTop: Math.max(insets.top + 18, 46),
            paddingBottom: Math.max(insets.bottom + 90, 118),
          },
        ]}
      >
        {renderSectionHeader(
          "heart",
          "NUEVAS CONEXIONES",
          topConnections.length,
          "Ver todas",
        )}
        {topConnections.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={localStyles.newConnectionsList}
          >
            {topConnections.map(renderNewConnection)}
          </ScrollView>
        ) : (
          <Text style={localStyles.sectionEmpty}>No hay conexiones nuevas.</Text>
        )}

        {renderSectionHeader(
          "people",
          "GRUPOS",
          eventGroups.length,
          groupsCollapsed ? "Mostrar" : "Ocultar",
          {
            collapsible: true,
            collapsed: groupsCollapsed,
            onPress: () => setGroupsCollapsed((value) => !value),
          },
        )}
        {!groupsCollapsed ? (
          <View style={localStyles.rowsCard}>
            {loading ? (
              <View style={localStyles.loadingWrap}>
                <ActivityIndicator color="#E4B76E" size="small" />
              </View>
            ) : eventGroups.length > 0 ? (
              eventGroups.map(renderGroupRow)
            ) : (
              <Text style={localStyles.cardEmpty}>No hay grupos activos.</Text>
            )}
          </View>
        ) : null}

        {renderSectionHeader(
          "chatbubble-ellipses-outline",
          "MENSAJES",
          withMessages.length,
          "Ver todos",
        )}
        <View style={localStyles.rowsCard}>
          {loading ? (
            <View style={localStyles.loadingWrap}>
              <ActivityIndicator color="#E4B76E" size="small" />
            </View>
          ) : withMessages.length > 0 ? (
            withMessages.map(renderDirectRow)
          ) : (
            <Text style={localStyles.cardEmpty}>No hay mensajes todavía.</Text>
          )}
        </View>
      </ScrollView>

      <UserProfileSheet
        visible={Boolean(selectedIncomingLike && selectedIncomingLikeCard)}
        profile={selectedIncomingLikeCard}
        onClose={() => setSelectedIncomingLike(null)}
        onContactPress={handleConnectIncomingLike}
        secondaryActionLabel="Descartar"
        onSecondaryActionPress={handleDismissIncomingLike}
      />
    </View>
  );
};

export default Messages;

const localStyles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  sectionTitle: {
    marginLeft: 8,
    color: DARK_GRAY,
    fontSize: 16,
    letterSpacing: 0,
    fontFamily: "CormorantGaramond_700Bold",
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 8,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(228, 183, 110, 0.22)",
  },
  countText: {
    color: DARK_GRAY,
    fontSize: 15,
    fontFamily: "CormorantGaramond_700Bold",
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 10,
  },
  seeAllText: {
    color: "#7B746C",
    fontSize: 14,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  newConnectionsList: {
    paddingBottom: 14,
    gap: 12,
  },
  newConnectionItem: {
    width: 86,
    alignItems: "center",
  },
  newAvatarFrame: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 3,
    backgroundColor: "rgba(228, 183, 110, 0.26)",
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.42)",
  },
  newAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 31,
    backgroundColor: "#E4B76E",
  },
  onlineDot: {
    position: "absolute",
    right: 2,
    bottom: 7,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#F99A2D",
    borderWidth: 2,
    borderColor: BG_MAIN,
  },
  newName: {
    marginTop: 5,
    color: DARK_GRAY,
    fontSize: 15,
    lineHeight: 18,
    textAlign: "center",
    fontFamily: "CormorantGaramond_700Bold",
  },
  newSubtitle: {
    marginTop: 1,
    color: "#5F82A5",
    fontSize: 12,
    textAlign: "center",
    fontFamily: "CormorantGaramond_500Medium",
  },
  sectionEmpty: {
    marginBottom: 14,
    color: "#7B746C",
    fontSize: 15,
    fontFamily: "CormorantGaramond_500Medium",
  },
  rowsCard: {
    marginBottom: 18,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.04)",
    shadowColor: "#2B2B2B",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  cardRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  cardRowWithDivider: {
    borderTopWidth: 1,
    borderTopColor: "rgba(43, 43, 43, 0.07)",
  },
  groupAvatar: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: BG_MAIN,
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.38)",
  },
  directAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E4B76E",
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },
  rowTitleLine: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowTitle: {
    flexShrink: 1,
    color: DARK_GRAY,
    fontSize: 17,
    lineHeight: 21,
    fontFamily: "CormorantGaramond_700Bold",
  },
  typeBadge: {
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 7,
  },
  challengeBadge: {
    backgroundColor: "rgba(228, 183, 110, 0.18)",
  },
  eventBadge: {
    backgroundColor: "rgba(95, 130, 165, 0.13)",
  },
  typeBadgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "CormorantGaramond_700Bold",
  },
  challengeBadgeText: {
    color: "#E19628",
  },
  eventBadgeText: {
    color: "#5F82A5",
  },
  lastMessage: {
    marginTop: 3,
    color: "#6E6E6E",
    fontSize: 15,
    lineHeight: 19,
    fontFamily: "CormorantGaramond_500Medium",
  },
  rowMeta: {
    width: 50,
    minHeight: 50,
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginLeft: 8,
  },
  rowTime: {
    color: "#6E6E6E",
    fontSize: 13,
    fontFamily: "CormorantGaramond_500Medium",
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#F99A2D",
    marginBottom: 6,
  },
  loadingWrap: {
    height: 82,
    alignItems: "center",
    justifyContent: "center",
  },
  cardEmpty: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    color: "#7B746C",
    fontSize: 14,
    fontFamily: "CormorantGaramond_500Medium",
  },
});
