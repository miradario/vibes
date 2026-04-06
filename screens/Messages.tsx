/** @format */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Icon } from "../components";
import styles, { DARK_GRAY } from "../assets/styles";
import {
  useMatchesQuery,
  type MatchWithProfile,
} from "../src/queries/matches.queries";
import {
  useMyEventGroupsQuery,
  type EventGroupSummary,
} from "../src/queries/events.queries";
import { useAuthSession } from "../src/auth/auth.queries";

const LOGO = require("../assets/images/logo.png");

const formatTime = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const Messages = () => {
  const navigation = useNavigation();
  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  const { data: matches, isLoading, error } = useMatchesQuery();
  const { data: eventGroups = [], isLoading: groupsLoading } =
    useMyEventGroupsQuery(userId);

  console.log(
    "[Messages] matches:",
    matches?.length,
    "loading:",
    isLoading,
    "error:",
    error,
  );

  const withMessages = (matches ?? []).filter((m) => m.lastMessage);
  const newConnections = (matches ?? []).filter((m) => !m.lastMessage);

  const renderMatchRow = ({ item }: { item: MatchWithProfile }) => (
    <TouchableOpacity
      style={localStyles.matchRow}
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate(
          "Chat" as never,
          {
            matchId: item.id,
            otherUserId: item.otherUserId,
            otherUserName: item.otherUserName,
            otherUserPhoto: item.otherUserPhoto,
          } as never,
        )
      }
    >
      <Image
        source={item.otherUserPhoto ? { uri: item.otherUserPhoto } : LOGO}
        style={localStyles.avatar}
      />
      <View style={localStyles.matchInfo}>
        <Text style={localStyles.matchName} numberOfLines={1}>
          {item.otherUserName}
        </Text>
        <Text style={localStyles.lastMsg} numberOfLines={1}>
          {item.lastMessage ?? "New connection – say hi!"}
        </Text>
      </View>
      {item.lastMessageAt && (
        <Text style={localStyles.time}>{formatTime(item.lastMessageAt)}</Text>
      )}
    </TouchableOpacity>
  );

  const renderNewConnection = ({ item }: { item: MatchWithProfile }) => (
    <View style={localStyles.newConnBubble}>
      <Image
        source={item.otherUserPhoto ? { uri: item.otherUserPhoto } : LOGO}
        style={localStyles.newConnAvatar}
      />
      <Text style={localStyles.newConnName} numberOfLines={1}>
        {item.otherUserName}
      </Text>
    </View>
  );

  const renderGroupRow = ({ item }: { item: EventGroupSummary }) => {
    const imgSource =
      typeof item.image === "string" ? { uri: item.image } : item.image;
    return (
      <TouchableOpacity
        style={localStyles.matchRow}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate(
            "EventChat" as never,
            { event: item.event } as never,
          )
        }
      >
        <Image source={imgSource} style={localStyles.groupAvatar} />
        <View style={localStyles.matchInfo}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={localStyles.matchName} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={localStyles.groupBadge}>
              <Text style={localStyles.groupBadgeText}>
                {item.eventType === "challenge" ? "Challenge" : "Evento"}
              </Text>
            </View>
          </View>
          <Text style={localStyles.lastMsg} numberOfLines={1}>
            {item.lastMessage ?? "No hay mensajes aún"}
          </Text>
        </View>
        {item.lastMessageAt && (
          <Text style={localStyles.time}>{formatTime(item.lastMessageAt)}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.bg}>
      <View
        style={[styles.containerMessages, { justifyContent: "flex-start" }]}
      >
        <View style={styles.flowTop}>
          <TouchableOpacity style={styles.flowTopIcon}>
            <Icon name="infinite" color={DARK_GRAY} size={20} />
          </TouchableOpacity>
          <View style={styles.flowTopCenter}>
            <Icon name="chatbubble-ellipses" color="#AEBFD1" size={26} />
          </View>
          <TouchableOpacity style={styles.flowTopIcon}>
            <Icon name="ellipsis-vertical" color={DARK_GRAY} size={20} />
          </TouchableOpacity>
        </View>

        {/* New Connections (no messages yet) */}
        <View style={styles.flowSectionHeader}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Icon name="heart" color="#AEBFD1" size={16} />
            <Text
              style={[
                styles.flowSectionTitle,
                { marginLeft: 8, color: "#AEBFD1" },
              ]}
            >
              New Connections
            </Text>
          </View>
          <View style={styles.flowSectionCount}>
            <Text style={styles.flowSectionCountText}>
              {newConnections.length}
            </Text>
          </View>
        </View>

        {newConnections.length > 0 && (
          <FlatList
            data={newConnections}
            keyExtractor={(item) => item.id}
            renderItem={renderNewConnection}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={localStyles.newConnList}
            contentContainerStyle={{ paddingHorizontal: 12 }}
          />
        )}

        {/* Event Groups */}
        {eventGroups.length > 0 && (
          <>
            <View style={styles.flowSectionHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Icon name="people" color="#AEBFD1" size={16} />
                <Text
                  style={[
                    styles.flowSectionTitle,
                    { marginLeft: 8, color: "#AEBFD1" },
                  ]}
                >
                  Grupos
                </Text>
              </View>
              <View style={styles.flowSectionCount}>
                <Text style={styles.flowSectionCountText}>
                  {eventGroups.length}
                </Text>
              </View>
            </View>
            {eventGroups.map((group) => (
              <React.Fragment key={group.eventId}>
                {renderGroupRow({ item: group })}
              </React.Fragment>
            ))}
          </>
        )}

        {/* Messages */}
        <View style={styles.flowSectionHeader}>
          <Text style={styles.flowSectionTitle}>Messages</Text>
        </View>

        {isLoading || groupsLoading ? (
          <View style={localStyles.emptyState}>
            <ActivityIndicator color="#E4B76E" size="large" />
          </View>
        ) : withMessages.length === 0 && eventGroups.length === 0 ? (
          <View style={localStyles.emptyState}>
            <Text style={localStyles.emptyTitle}>
              {(matches ?? []).length === 0
                ? "No connections yet"
                : "No messages yet"}
            </Text>
            <Text style={localStyles.emptyText}>
              {(matches ?? []).length === 0
                ? "Swipe right on someone you vibe with to start a conversation."
                : "Start a conversation with one of your new connections!"}
            </Text>
          </View>
        ) : withMessages.length === 0 ? (
          <View style={localStyles.emptyMsgHint}>
            <Text style={localStyles.emptyText}>
              No direct messages yet. Start a conversation!
            </Text>
          </View>
        ) : (
          <FlatList
            data={withMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMatchRow}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </View>
  );
};

export default Messages;

const localStyles = {
  matchRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(174, 191, 209, 0.3)",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E4B76E",
  },
  matchInfo: {
    flex: 1,
    marginLeft: 12,
  },
  matchName: {
    color: "#2B2B2B",
    fontSize: 16,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  lastMsg: {
    color: "#6E6E6E",
    fontSize: 14,
    fontFamily: "CormorantGaramond_500Medium",
    marginTop: 2,
  },
  time: {
    color: "#AEBFD1",
    fontSize: 11,
    marginLeft: 8,
  },
  newConnList: {
    maxHeight: 100,
    marginBottom: 4,
  },
  newConnBubble: {
    alignItems: "center" as const,
    marginHorizontal: 6,
    width: 64,
  },
  newConnAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#E4B76E",
    backgroundColor: "#E4B76E",
  },
  newConnName: {
    marginTop: 4,
    fontSize: 12,
    color: "#2B2B2B",
    fontFamily: "CormorantGaramond_500Medium",
    textAlign: "center" as const,
  },
  emptyState: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 28,
  },
  emptyMsgHint: {
    alignItems: "center" as const,
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  emptyTitle: {
    color: "#2B2B2B",
    fontSize: 24,
    fontFamily: "CormorantGaramond_600SemiBold",
    textAlign: "center" as const,
  },
  emptyText: {
    marginTop: 10,
    color: "#6E6E6E",
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "CormorantGaramond_500Medium",
    textAlign: "center" as const,
  },
  groupAvatar: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#E4B76E",
  },
  groupBadge: {
    marginLeft: 6,
    backgroundColor: "rgba(228, 183, 110, 0.15)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  groupBadgeText: {
    fontSize: 10,
    color: "#E4B76E",
    fontFamily: "CormorantGaramond_600SemiBold",
  },
};
