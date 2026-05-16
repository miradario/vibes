/** @format */

import React, { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import Avatar from "../components/Avatar";
import AnimatedSheetModal from "../components/AnimatedSheetModal";
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
import { useI18n } from "../src/i18n";

type NewConnectionItem =
  | { type: "match"; item: MatchWithProfile }
  | { type: "incoming"; item: IncomingLike };

type ArchivedChatItem =
  | { kind: "group"; item: EventGroupSummary }
  | { kind: "direct"; item: MatchWithProfile };

type ConnectionsSheet = "incoming" | "new" | null;

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

const getArchiveStorageKey = (userId?: string) =>
  `vibes:archived-chats:${userId ?? "guest"}`;

const getArchiveItemKey = (item: ArchivedChatItem | { kind: "group"; item: EventGroupSummary } | { kind: "direct"; item: MatchWithProfile }) =>
  item.kind === "group"
    ? `group:${item.item.eventType}:${item.item.eventId}`
    : `direct:${item.item.id}`;

const isFinishedChallengeGroup = (group: EventGroupSummary) => {
  if (group.eventType !== "challenge") return false;
  const startsAt = group.event?.startsAt;
  const durationDays = group.event?.durationDays;
  if (!startsAt || !durationDays) return false;

  const startDate = new Date(startsAt);
  if (Number.isNaN(startDate.getTime())) return false;

  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.floor((current.getTime() - start.getTime()) / 86_400_000);

  return diffDays >= durationDays;
};

const isFinishedEventGroup = (group: EventGroupSummary) => {
  if (group.eventType !== "event") return false;
  const startsAt = group.event?.startsAt;
  if (!startsAt) return false;

  const eventDate = new Date(startsAt);
  if (Number.isNaN(eventDate.getTime())) return false;

  const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
  const today = new Date();
  const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return eventDay.getTime() < currentDay.getTime();
};

const Messages = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { locale, t } = useI18n();
  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  const { data: matches, isLoading } = useMatchesQuery();
  const { data: incomingLikes = [] } = useIncomingLikesQuery();
  const swipeMutation = useSwipeMutation();
  const { data: eventGroups = [], isLoading: groupsLoading } =
    useMyEventGroupsQuery(userId);
  const [selectedIncomingLike, setSelectedIncomingLike] =
    useState<IncomingLike | null>(null);
  const [connectionsSheet, setConnectionsSheet] =
    useState<ConnectionsSheet>(null);
  const [groupsCollapsed, setGroupsCollapsed] = useState(false);
  const [archivedKeys, setArchivedKeys] = useState<string[]>([]);
  const { data: selectedIncomingProfile } = useProfileQuery(
    selectedIncomingLike?.likerUserId,
  );
  const { data: selectedIncomingPreferences } = useUserPreferencesQuery(
    selectedIncomingLike?.likerUserId,
  );

  const withMessages = (matches ?? []).filter((m) => m.lastMessage);
  const newConnections = (matches ?? []).filter((m) => !m.lastMessage);
  const topConnections: NewConnectionItem[] = newConnections.map((item) => ({
    type: "match" as const,
    item,
  }));
  const incomingConnectionRequests: NewConnectionItem[] = incomingLikes.map((item) => ({
    type: "incoming" as const,
    item,
  }));
  const sectionTitle = (key: string) => t(key).toLocaleUpperCase(locale);
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

  React.useEffect(() => {
    let active = true;

    const loadArchived = async () => {
      try {
        const raw = await AsyncStorage.getItem(getArchiveStorageKey(userId));
        if (!active) return;
        const parsed = raw ? JSON.parse(raw) : [];
        setArchivedKeys(Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : []);
      } catch {
        if (active) setArchivedKeys([]);
      }
    };

    void loadArchived();

    return () => {
      active = false;
    };
  }, [userId]);

  const persistArchivedKeys = async (nextKeys: string[]) => {
    setArchivedKeys(nextKeys);
    try {
      await AsyncStorage.setItem(
        getArchiveStorageKey(userId),
        JSON.stringify(nextKeys),
      );
    } catch {}
  };

  const toggleArchivedChat = async (item: ArchivedChatItem) => {
    const key = getArchiveItemKey(item);
    const nextKeys = archivedKeys.includes(key)
      ? archivedKeys.filter((value) => value !== key)
      : [...archivedKeys, key];
    await persistArchivedKeys(nextKeys);
  };

  const activeGroups = eventGroups.filter(
    (group) =>
      !isFinishedChallengeGroup(group) &&
      !isFinishedEventGroup(group) &&
      !archivedKeys.includes(getArchiveItemKey({ kind: "group", item: group })),
  );
  const finishedChallengeGroups = eventGroups.filter(
    (group) =>
      isFinishedChallengeGroup(group) &&
      !archivedKeys.includes(getArchiveItemKey({ kind: "group", item: group })),
  );
  const finishedEventGroups = eventGroups.filter(
    (group) =>
      isFinishedEventGroup(group) &&
      !archivedKeys.includes(getArchiveItemKey({ kind: "group", item: group })),
  );
  const activeDirectMessages = withMessages.filter(
    (item) => !archivedKeys.includes(getArchiveItemKey({ kind: "direct", item })),
  );
  const archivedChats: ArchivedChatItem[] = [
    ...eventGroups
      .filter((group) =>
        archivedKeys.includes(getArchiveItemKey({ kind: "group", item: group })),
      )
      .map((item) => ({ kind: "group" as const, item })),
    ...withMessages
      .filter((item) =>
        archivedKeys.includes(getArchiveItemKey({ kind: "direct", item })),
      )
      .map((item) => ({ kind: "direct" as const, item })),
  ].sort((left, right) => {
    const leftTime =
      left.kind === "group" ? left.item.lastMessageAt : left.item.lastMessageAt;
    const rightTime =
      right.kind === "group" ? right.item.lastMessageAt : right.item.lastMessageAt;
    return new Date(rightTime ?? 0).getTime() - new Date(leftTime ?? 0).getTime();
  });

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
        <Text style={localStyles.sectionTitle} numberOfLines={1}>
          {title}
        </Text>
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

  const getPreviewPhoto = (connection: NewConnectionItem) =>
    connection.type === "match"
      ? connection.item.otherUserPhoto
      : connection.item.likerUserPhoto;

  const renderConnectionPreview = (
    items: NewConnectionItem[],
    blurred: boolean,
  ) => {
    const previewItems = items.slice(0, 3);

    if (previewItems.length === 0) {
      return (
        <View style={localStyles.connectionPreviewEmpty}>
          <Icon name="sparkles-outline" color="#D9A95C" size={22} />
        </View>
      );
    }

    return (
      <View style={localStyles.connectionPreviewRow}>
        {previewItems.map((item, index) => {
          const uri = getPreviewPhoto(item);

          return (
            <View
              key={`${item.type}-preview-${item.item.id}`}
              style={[
                localStyles.connectionPreviewAvatar,
                index > 0 && localStyles.connectionPreviewAvatarStacked,
              ]}
            >
              {uri ? (
                <Image
                  source={{ uri }}
                  style={localStyles.connectionPreviewImage}
                  blurRadius={blurred ? 10 : 0}
                />
              ) : (
                <Avatar uri={null} size={38} />
              )}
              {blurred ? <View style={localStyles.connectionPreviewOverlay} /> : null}
            </View>
          );
        })}
      </View>
    );
  };

  const renderConnectionSummaryCard = ({
    title,
    count,
    icon,
    items,
    blurred,
    onPress,
  }: {
    title: string;
    count: number;
    icon: string;
    items: NewConnectionItem[];
    blurred: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={localStyles.connectionSummaryCard}
      activeOpacity={0.84}
      onPress={onPress}
    >
      <View style={localStyles.connectionCardHeader}>
        <View style={localStyles.connectionIconWrap}>
          <Icon name={icon as any} color="#B98235" size={17} />
        </View>
        <View style={localStyles.connectionCountBadge}>
          <Text style={localStyles.connectionCountText}>{count}</Text>
        </View>
      </View>
      <Text style={localStyles.connectionCardTitle} numberOfLines={2}>
        {title}
      </Text>
      {renderConnectionPreview(items, blurred)}
      <Text style={localStyles.connectionCardAction}>
        {t("messages.viewAll")}
      </Text>
    </TouchableOpacity>
  );

  const openIncomingProfile = (item: IncomingLike) => {
    setConnectionsSheet(null);
    setSelectedIncomingLike(item);
  };

  const openNewConnectionChat = (item: MatchWithProfile) => {
    setConnectionsSheet(null);
    openMatchChat(item);
  };

  const renderIncomingSheetRow = (item: IncomingLike, index: number) => (
    <TouchableOpacity
      key={item.id}
      style={[
        localStyles.connectionSheetRow,
        index > 0 && localStyles.connectionSheetRowWithDivider,
      ]}
      activeOpacity={0.82}
      onPress={() => openIncomingProfile(item)}
    >
      <Avatar uri={item.likerUserPhoto} size={48} />
      <View style={localStyles.connectionSheetBody}>
        <Text style={localStyles.connectionSheetName} numberOfLines={1}>
          {item.likerUserName}
        </Text>
        <Text style={localStyles.connectionSheetHint} numberOfLines={1}>
          {t("messages.wantsToConnectHint")}
        </Text>
      </View>
      <Icon name="chevron-forward" color="#7B746C" size={18} />
    </TouchableOpacity>
  );

  const renderNewConnectionSheetRow = (item: MatchWithProfile, index: number) => (
    <TouchableOpacity
      key={item.id}
      style={[
        localStyles.connectionSheetRow,
        index > 0 && localStyles.connectionSheetRowWithDivider,
      ]}
      activeOpacity={0.82}
      onPress={() => openNewConnectionChat(item)}
    >
      <Avatar uri={item.otherUserPhoto} size={48} />
      <View style={localStyles.connectionSheetBody}>
        <Text style={localStyles.connectionSheetName} numberOfLines={1}>
          {item.otherUserName}
        </Text>
        <Text style={localStyles.connectionSheetHint} numberOfLines={1}>
          {t("messages.newConnectionHint")}
        </Text>
      </View>
      <Icon name="chatbubble-ellipses-outline" color="#7B746C" size={18} />
    </TouchableOpacity>
  );

  const renderGroupRow = (item: EventGroupSummary, index: number, options?: { archived?: boolean }) => {
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
                {isChallenge ? "Desafío" : "Evento"}
              </Text>
            </View>
          </View>
          <Text style={localStyles.lastMessage} numberOfLines={2}>
            {item.lastMessage ?? "No hay mensajes aún"}
          </Text>
        </View>
        <View style={localStyles.rowMeta}>
          <Text style={localStyles.rowTime}>{formatTime(item.lastMessageAt)}</Text>
          <TouchableOpacity
            activeOpacity={0.75}
            style={localStyles.archiveButton}
            onPress={() => toggleArchivedChat({ kind: "group", item })}
          >
            <Icon
              name={options?.archived ? "arrow-up-circle-outline" : "archive-outline"}
              color="#7B746C"
              size={16}
            />
          </TouchableOpacity>
          {item.hasUnread ? <View style={localStyles.unreadDot} /> : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderDirectRow = (item: MatchWithProfile, index: number, options?: { archived?: boolean }) => (
    <TouchableOpacity
      key={item.id}
      style={[localStyles.cardRow, index > 0 && localStyles.cardRowWithDivider]}
      activeOpacity={0.78}
      onPress={() => openMatchChat(item)}
    >
      <Avatar uri={item.otherUserPhoto} size={48} />
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
        <TouchableOpacity
          activeOpacity={0.75}
          style={localStyles.archiveButton}
          onPress={() => toggleArchivedChat({ kind: "direct", item })}
        >
          <Icon
            name={options?.archived ? "arrow-up-circle-outline" : "archive-outline"}
            color="#7B746C"
            size={16}
          />
        </TouchableOpacity>
        {item.hasUnread ? <View style={localStyles.unreadDot} /> : null}
      </View>
    </TouchableOpacity>
  );

  const loading = isLoading || groupsLoading;
  const hasConnectionRequests = incomingConnectionRequests.length > 0;
  const hasConnectedNoChat = topConnections.length > 0;
  const hasConnectionsSection = hasConnectionRequests || hasConnectedNoChat;
  const hasDirectMessages = activeDirectMessages.length > 0;
  const hasActiveGroups = activeGroups.length > 0;
  const hasFinishedChallenges = finishedChallengeGroups.length > 0;
  const hasFinishedEvents = finishedEventGroups.length > 0;
  const hasArchivedChats = archivedChats.length > 0;

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
        {hasConnectionsSection ? (
          <>
            <View style={localStyles.connectionsHeader}>
              <Text style={localStyles.connectionsTitle}>
                {t("messages.connections")}
              </Text>
            </View>
            <View style={localStyles.connectionsGrid}>
              {hasConnectionRequests
                ? renderConnectionSummaryCard({
                    title: t("messages.wantsToConnectWithYou"),
                    count: incomingConnectionRequests.length,
                    icon: "heart-circle-outline",
                    items: incomingConnectionRequests,
                    blurred: true,
                    onPress: () => setConnectionsSheet("incoming"),
                  })
                : null}
              {hasConnectedNoChat
                ? renderConnectionSummaryCard({
                    title: t("messages.connectedNoChat"),
                    count: topConnections.length,
                    icon: "chatbubble-ellipses-outline",
                    items: topConnections,
                    blurred: false,
                    onPress: () => setConnectionsSheet("new"),
                  })
                : null}
            </View>
          </>
        ) : null}

        {hasDirectMessages ? (
          <>
            {renderSectionHeader(
              "chatbubble-ellipses-outline",
              sectionTitle("messages.messages"),
              activeDirectMessages.length,
              "Ver todos",
            )}
            <View style={localStyles.rowsCard}>
              {activeDirectMessages.map((item, index) => renderDirectRow(item, index))}
            </View>
          </>
        ) : null}

        {hasActiveGroups ? (
          <>
            {renderSectionHeader(
              "people",
              "GRUPOS",
              activeGroups.length,
              groupsCollapsed ? "Mostrar" : "Ocultar",
              {
                collapsible: true,
                collapsed: groupsCollapsed,
                onPress: () => setGroupsCollapsed((value) => !value),
              },
            )}
            {!groupsCollapsed ? (
              <View style={localStyles.rowsCard}>
                {activeGroups.map((item, index) => renderGroupRow(item, index))}
              </View>
            ) : null}
          </>
        ) : null}

        {hasFinishedChallenges ? (
          <>
            {renderSectionHeader(
              "trophy-outline",
              "CHALLENGES FINALIZADOS",
              finishedChallengeGroups.length,
              "Ver todos",
            )}
            <View style={localStyles.rowsCard}>
              {finishedChallengeGroups.map((item, index) => renderGroupRow(item, index))}
            </View>
          </>
        ) : null}

        {hasFinishedEvents ? (
          <>
            {renderSectionHeader(
              "calendar-outline",
              sectionTitle("messages.finishedEvents"),
              finishedEventGroups.length,
              "Ver todos",
            )}
            <View style={localStyles.rowsCard}>
              {finishedEventGroups.map((item, index) => renderGroupRow(item, index))}
            </View>
          </>
        ) : null}

        {hasArchivedChats ? (
          <>
            {renderSectionHeader(
              "archive-outline",
              "ARCHIVADOS",
              archivedChats.length,
              "Ver todos",
            )}
            <View style={localStyles.rowsCard}>
              {archivedChats.map((entry, index) =>
                entry.kind === "group"
                  ? renderGroupRow(entry.item, index, { archived: true })
                  : renderDirectRow(entry.item, index, { archived: true }),
              )}
            </View>
          </>
        ) : null}

        {loading && !hasConnectionsSection && !hasDirectMessages && !hasActiveGroups ? (
          <View style={localStyles.loadingWrap}>
            <ActivityIndicator color="#E4B76E" size="small" />
          </View>
        ) : null}
      </ScrollView>

      <AnimatedSheetModal
        visible={connectionsSheet !== null}
        onClose={() => setConnectionsSheet(null)}
        offsetY={360}
        sheetStyle={[
          localStyles.connectionsSheet,
          { paddingBottom: Math.max(insets.bottom + 18, 28) },
        ]}
      >
        <View style={localStyles.connectionsSheetHandle} />
        <Text style={localStyles.connectionsSheetTitle}>
          {connectionsSheet === "incoming"
            ? t("messages.wantsToConnectWithYou")
            : t("messages.connectedNoChat")}
        </Text>
        <ScrollView
          style={localStyles.connectionsSheetList}
          showsVerticalScrollIndicator={false}
        >
          {connectionsSheet === "incoming" ? (
            incomingLikes.length > 0 ? (
              incomingLikes.map(renderIncomingSheetRow)
            ) : (
              <Text style={localStyles.connectionSheetEmpty}>
                {t("messages.noWantsToConnect")}
              </Text>
            )
          ) : newConnections.length > 0 ? (
            newConnections.map(renderNewConnectionSheetRow)
          ) : (
            <Text style={localStyles.connectionSheetEmpty}>
              {t("messages.noConnectedNoChat")}
            </Text>
          )}
        </ScrollView>
      </AnimatedSheetModal>

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
  connectionsHeader: {
    marginBottom: 10,
  },
  connectionsTitle: {
    color: DARK_GRAY,
    fontSize: 30,
    lineHeight: 34,
    fontFamily: "CormorantGaramond_700Bold",
  },
  connectionsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  connectionSummaryCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 158,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.28)",
    backgroundColor: "rgba(255, 253, 248, 0.9)",
    padding: 12,
    shadowColor: "#8C7B63",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  connectionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  connectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(228, 183, 110, 0.18)",
  },
  connectionCountBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(174, 191, 209, 0.24)",
  },
  connectionCountText: {
    color: DARK_GRAY,
    fontSize: 15,
    fontFamily: "CormorantGaramond_700Bold",
  },
  connectionCardTitle: {
    minHeight: 39,
    color: DARK_GRAY,
    fontSize: 18,
    lineHeight: 19,
    fontFamily: "CormorantGaramond_700Bold",
  },
  connectionPreviewRow: {
    height: 46,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  connectionPreviewAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255, 253, 248, 0.96)",
    backgroundColor: "rgba(228, 183, 110, 0.2)",
  },
  connectionPreviewAvatarStacked: {
    marginLeft: -12,
  },
  connectionPreviewImage: {
    width: "100%",
    height: "100%",
  },
  connectionPreviewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 248, 236, 0.34)",
  },
  connectionPreviewEmpty: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(228, 183, 110, 0.14)",
  },
  connectionCardAction: {
    marginTop: "auto",
    color: "#B98235",
    fontSize: 15,
    fontFamily: "CormorantGaramond_700Bold",
  },
  connectionsSheet: {
    maxHeight: "76%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: "#F6F6F4",
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  connectionsSheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
    backgroundColor: "rgba(123, 116, 108, 0.24)",
  },
  connectionsSheetTitle: {
    color: DARK_GRAY,
    fontSize: 27,
    lineHeight: 31,
    fontFamily: "CormorantGaramond_700Bold",
  },
  connectionsSheetList: {
    marginTop: 12,
  },
  connectionSheetRow: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  connectionSheetRowWithDivider: {
    borderTopWidth: 1,
    borderTopColor: "rgba(123, 116, 108, 0.12)",
  },
  connectionSheetBody: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    marginRight: 8,
  },
  connectionSheetName: {
    color: DARK_GRAY,
    fontSize: 19,
    fontFamily: "CormorantGaramond_700Bold",
  },
  connectionSheetHint: {
    marginTop: 2,
    color: "#7B746C",
    fontSize: 14,
    fontFamily: "CormorantGaramond_500Medium",
  },
  connectionSheetEmpty: {
    paddingVertical: 22,
    color: "#7B746C",
    fontSize: 16,
    fontFamily: "CormorantGaramond_500Medium",
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    flexGrow: 1,
    minWidth: 0,
  },
  sectionTitle: {
    marginLeft: 8,
    color: DARK_GRAY,
    fontSize: 16,
    letterSpacing: 0,
    fontFamily: "CormorantGaramond_700Bold",
    flexShrink: 1,
    minWidth: 0,
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
    flexShrink: 0,
  },
  seeAllText: {
    color: "#7B746C",
    fontSize: 14,
    fontFamily: "CormorantGaramond_600SemiBold",
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
  archiveButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(123, 116, 108, 0.08)",
    marginTop: 4,
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
});
