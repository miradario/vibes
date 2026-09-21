import { useConnectionViewsQuery } from "../src/queries/homeActivity.queries";
import { getNewConnections } from "../src/lib/homeActivity";
import UnreadBadge from "../components/UnreadBadge";
import { useCommunityUnreadQuery } from "../src/queries/communityReceipts.queries";
/** @format */

import React, { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScrollView, StyleSheet, TouchableOpacity, View, Alert } from "react-native";
import { Text } from "../components/Typography";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components";
import Avatar from "../components/Avatar";
import CommunityGroups from "../components/CommunityGroups";
import { useCommunityGroupsQuery } from "../src/queries/communityGroups.queries";
import AnimatedSheetModal from "../components/AnimatedSheetModal";
import ProfileMediaImage from "../components/ProfileMediaImage";
import styles, { BG_MAIN, DARK_GRAY, TEXT_PRIMARY } from "../assets/styles";
import UserProfileSheet from "../components/UserProfileSheet";
import { getBottomTabContentPadding } from "../src/lib/tabBarLayout";
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
import { vibesTheme } from "../src/theme/vibesTheme";
import VibesLoader from "../components/VibesLoader";

type NewConnectionItem =
  | { type: "match"; item: MatchWithProfile }
  | { type: "incoming"; item: IncomingLike };

type ArchivedChatItem =
  | { kind: "group"; item: EventGroupSummary }
  | { kind: "direct"; item: MatchWithProfile };

type ConnectionsSheet = "incoming" | "new" | null;

type MessagesContentProps = {
  homeEntryKey?: number;
  homeTarget?: "messages" | "connections";
  initialMessagesTab?: "messages" | "groups";
  showHeader?: boolean;
  contentTopPadding?: number;
  contentBottomPadding?: number;
};

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

const getArchiveItemKey = (
  item:
    | ArchivedChatItem
    | { kind: "group"; item: EventGroupSummary }
    | { kind: "direct"; item: MatchWithProfile }
) =>
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

  const start = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );
  const today = new Date();
  const current = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const diffDays = Math.floor(
    (current.getTime() - start.getTime()) / 86_400_000
  );

  return diffDays >= durationDays;
};

const isFinishedEventGroup = (group: EventGroupSummary) => {
  if (group.eventType !== "event") return false;
  const startsAt = group.event?.startsAt;
  if (!startsAt) return false;

  const eventDate = new Date(startsAt);
  if (Number.isNaN(eventDate.getTime())) return false;

  const eventDay = new Date(
    eventDate.getFullYear(),
    eventDate.getMonth(),
    eventDate.getDate()
  );
  const today = new Date();
  const currentDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  return eventDay.getTime() < currentDay.getTime();
};

export const MessagesContent = ({
  homeEntryKey,
  homeTarget,
  initialMessagesTab,
  showHeader = true,
  contentTopPadding,
  contentBottomPadding,
}: MessagesContentProps) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { locale, t } = useI18n();
  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  const communityGroups = useCommunityGroupsQuery();
  const { data: unread = [] } = useCommunityUnreadQuery();
  const { data: matches, isLoading } = useMatchesQuery();
  const views = useConnectionViewsQuery();
  const { data: incomingLikes = [] } = useIncomingLikesQuery();
  const swipeMutation = useSwipeMutation();
  const { data: eventGroups = [], isLoading: groupsLoading } =
    useMyEventGroupsQuery(userId);
  const [pendingIncomingLike, setPendingIncomingLike] =
    useState<IncomingLike | null>(null);
  const [selectedIncomingLike, setSelectedIncomingLike] =
    useState<IncomingLike | null>(null);
  const [connectionsSheet, setConnectionsSheet] =
    useState<ConnectionsSheet>(null);
  const [activeTab, setActiveTab] = useState<"messages" | "groups">("messages");
  const [archivedKeys, setArchivedKeys] = useState<string[]>([]);
  const { data: selectedIncomingProfile } = useProfileQuery(
    selectedIncomingLike?.likerUserId
  );
  const { data: selectedIncomingPreferences } = useUserPreferencesQuery(
    selectedIncomingLike?.likerUserId
  );

  const withMessages = (matches ?? []).filter(
    (m) => m.lastMessage || views.data?.includes(m.id)
  );
  const newConnections = views.isSuccess
    ? getNewConnections(matches ?? [], views.data)
    : [];
  useEffect(() => {
    if (!homeEntryKey) return;
    setActiveTab(
      homeTarget === "connections"
        ? "messages"
        : initialMessagesTab ?? "messages"
    );
    setConnectionsSheet(homeTarget === "connections" ? "new" : null);
  }, [homeEntryKey, homeTarget, initialMessagesTab]);
  const topConnections: NewConnectionItem[] = newConnections.map((item) => ({
    type: "match" as const,
    item,
  }));
  const incomingConnectionRequests: NewConnectionItem[] = incomingLikes.map(
    (item) => ({
      type: "incoming" as const,
      item,
    })
  );
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
        setArchivedKeys(
          Array.isArray(parsed)
            ? parsed.filter((value) => typeof value === "string")
            : []
        );
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
        JSON.stringify(nextKeys)
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

  const confirmArchiveChat = (item: ArchivedChatItem) => {
    const key = getArchiveItemKey(item);
    const isArchived = archivedKeys.includes(key);
    Alert.alert(
      isArchived ? "Recuperar conversación" : "Archivar conversación",
      isArchived
        ? "La conversación volverá a aparecer en Comunidad."
        : "Podés recuperarla luego desde la sección Archivados.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: isArchived ? "Recuperar" : "Archivar",
          onPress: () => void toggleArchivedChat(item),
        },
      ]
    );
  };

  const activeGroups = eventGroups.filter(
    (group) =>
      !isFinishedChallengeGroup(group) &&
      !isFinishedEventGroup(group) &&
      !archivedKeys.includes(getArchiveItemKey({ kind: "group", item: group }))
  );
  const finishedChallengeGroups = eventGroups.filter(
    (group) =>
      isFinishedChallengeGroup(group) &&
      !archivedKeys.includes(getArchiveItemKey({ kind: "group", item: group }))
  );
  const finishedEventGroups = eventGroups.filter(
    (group) =>
      isFinishedEventGroup(group) &&
      !archivedKeys.includes(getArchiveItemKey({ kind: "group", item: group }))
  );
  const activeDirectMessages = withMessages.filter(
    (item) =>
      !archivedKeys.includes(getArchiveItemKey({ kind: "direct", item }))
  );
  const archivedChats: ArchivedChatItem[] = [
    ...eventGroups
      .filter((group) =>
        archivedKeys.includes(getArchiveItemKey({ kind: "group", item: group }))
      )
      .map((item) => ({ kind: "group" as const, item })),
    ...withMessages
      .filter((item) =>
        archivedKeys.includes(getArchiveItemKey({ kind: "direct", item }))
      )
      .map((item) => ({ kind: "direct" as const, item })),
  ].sort((left, right) => {
    const leftTime =
      left.kind === "group" ? left.item.lastMessageAt : left.item.lastMessageAt;
    const rightTime =
      right.kind === "group"
        ? right.item.lastMessageAt
        : right.item.lastMessageAt;
    return (
      new Date(rightTime ?? 0).getTime() - new Date(leftTime ?? 0).getTime()
    );
  });

  const openMatchChat = (item: MatchWithProfile) => {
    navigation.navigate(
      "Chat" as never,
      {
        matchId: item.id,
        otherUserId: item.otherUserId,
        otherUserName: item.otherUserName,
        otherUserPhoto: item.otherUserPhoto,
      } as never
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
              { profile: selectedIncomingLikeCard } as never
            );
          }
          setSelectedIncomingLike(null);
        },
        onError: (error) =>
          handleApiError(error, { toastTitle: "Error al conectar" }),
      }
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
      }
    );
  };

  const renderSectionHeader = (
    icon: string,
    title: string,
    count: number,
    seeAllLabel: string,
    options?: {
      collapsible?: boolean;
      collapsed?: boolean;
      onPress?: () => void;
    }
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
    blurred: boolean
  ) => {
    const previewItems = items.slice(0, 1);

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
              <Avatar
                uri={uri}
                size={32}
                blurRadius={blurred ? 10 : 0}
                style={localStyles.connectionPreviewImage}
              />
              {blurred ? (
                <View style={localStyles.connectionPreviewOverlay} />
              ) : null}
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
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${count}`}
      style={localStyles.connectionSummaryCard}
      activeOpacity={0.72}
      onPress={onPress}
    >
      <View style={localStyles.connectionCardMeta}>
        <View style={localStyles.connectionIconWrap}>
          <Icon name={icon as any} color="#B98235" size={18} />
        </View>
        <View style={localStyles.connectionCountBadge}>
          <Text style={localStyles.connectionCountText}>{count}</Text>
        </View>
        <View style={{ marginLeft: "auto" }}>
          {renderConnectionPreview(items, blurred)}
        </View>
      </View>
      <Text style={localStyles.connectionCardTitle}>{title}</Text>
    </TouchableOpacity>
  );

  const openIncomingProfile = (item: IncomingLike) => {
    setPendingIncomingLike(item);
    setConnectionsSheet(null);
  };

  const handleConnectionsSheetClosed = () => {
    if (!pendingIncomingLike) return;
    setSelectedIncomingLike(pendingIncomingLike);
    setPendingIncomingLike(null);
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

  const renderNewConnectionSheetRow = (
    item: MatchWithProfile,
    index: number
  ) => (
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

  const renderGroupRow = (
    item: EventGroupSummary,
    index: number,
    options?: { archived?: boolean }
  ) => {
    const imgSource =
      typeof item.image === "string" ? { uri: item.image } : item.image;
    const isChallenge = item.eventType === "challenge";

    return (
      <TouchableOpacity
        key={item.eventId}
        style={[
          localStyles.cardRow,
        ]}
        activeOpacity={0.78}
        onPress={() => openGroupChat(item)}
        onLongPress={() => confirmArchiveChat({ kind: "group", item })}
      >
        <ProfileMediaImage source={imgSource} style={localStyles.groupAvatar} />
        <View style={localStyles.rowBody}>
          <View style={localStyles.rowTitleLine}>
            <Text style={localStyles.rowTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View
              style={[
                localStyles.typeBadge,
                isChallenge
                  ? localStyles.challengeBadge
                  : localStyles.eventBadge,
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
          <Text style={localStyles.rowTime}>
            {formatTime(item.lastMessageAt)}
          </Text>

          <UnreadBadge
            count={Number(
              unread.find(
                (r) =>
                  r.kind === item.eventType &&
                  r.conversation_id === item.eventId
              )?.unread_count ?? 0
            )}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderDirectRow = (
    item: MatchWithProfile,
    index: number,
    options?: { archived?: boolean }
  ) => (
    <TouchableOpacity
      key={item.id}
      accessibilityRole="button"
      style={localStyles.cardRow}
      activeOpacity={0.78}
      onPress={() => openMatchChat(item)}
      onLongPress={() => confirmArchiveChat({ kind: "direct", item })}
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
        <Text style={localStyles.rowTime}>
          {formatTime(item.lastMessageAt)}
        </Text>

        <UnreadBadge
          count={Number(
            unread.find(
              (r) => r.kind === "direct" && r.conversation_id === item.id
            )?.unread_count ?? 0
          )}
        />
      </View>
    </TouchableOpacity>
  );

  const loading = isLoading || groupsLoading || communityGroups.isLoading;
  const hasConnectionRequests = incomingConnectionRequests.length > 0;
  const hasConnectedNoChat = topConnections.length > 0;
  const hasConnectionsSection = hasConnectionRequests || hasConnectedNoChat;
  const visibleArchivedChats = archivedChats.filter((entry) =>
    activeTab === "groups" ? entry.kind === "group" : entry.kind === "direct"
  );
  const groupCount =
    (communityGroups.data?.length ?? 0) +
    activeGroups.length +
    finishedEventGroups.length +
    finishedChallengeGroups.length;
  const renderGroupSection = (title: string, items: EventGroupSummary[]) =>
    items.length ? (
      <View>
        <Text style={localStyles.groupSectionLabel}>{title}</Text>
        <View style={localStyles.rowsCard}>
          {items.map((item, index) => renderGroupRow(item, index))}
        </View>
      </View>
    ) : null;

  return (
    <View style={[styles.bg, localStyles.screenBackground]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          localStyles.content,
          {
            paddingTop:
              contentTopPadding ??
              (showHeader ? Math.max(insets.top + 18, 46) : 8),
            paddingBottom:
              contentBottomPadding ??
              getBottomTabContentPadding(insets.bottom, 118),
          },
        ]}
      >
        <View style={localStyles.communityHeader}>
          <Text style={localStyles.communityTitle}>
            {t("messages.connections")}
          </Text>
          <CommunityGroups
            variant="create"
            matches={matches ?? []}
            groups={communityGroups}
          />
        </View>
        {hasConnectionsSection ? (
          <>
            <View style={localStyles.connectionsGrid}>
              {renderConnectionSummaryCard({
                title: "Solicitudes",
                count: incomingConnectionRequests.length,
                icon: "heart-outline",
                items: incomingConnectionRequests,
                blurred: true,
                onPress: () => setConnectionsSheet("incoming"),
              })}
              {renderConnectionSummaryCard({
                title: "Nuevas conexiones",
                count: topConnections.length,
                icon: "people-outline",
                items: topConnections,
                blurred: false,
                onPress: () => setConnectionsSheet("new"),
              })}
            </View>
          </>
        ) : null}

        <View style={localStyles.chatTabs}>
          {(
            [
              {
                key: "messages",
                label: "Mensajes",
                icon: "chatbubble-ellipses-outline",
                count: unread
                  .filter((r) => r.kind === "direct")
                  .reduce((n, r) => n + Number(r.unread_count), 0),
              },
              {
                key: "groups",
                label: "Grupos",
                icon: "people",
                count: unread
                  .filter((r) => r.kind !== "direct")
                  .reduce((n, r) => n + Number(r.unread_count), 0),
              },
            ] as const
          ).map((tab) => {
            const selected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  localStyles.chatTab,
                  selected && localStyles.chatTabActive,
                ]}
              >
                <Icon
                  name={tab.icon}
                  size={22}
                  color={selected ? "#B57716" : "#858585"}
                />
                <Text
                  style={[
                    localStyles.chatTabText,
                    selected && localStyles.chatTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
                <View style={localStyles.countBadge}>
                  <Text style={localStyles.countText}>{tab.count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        {activeTab === "messages" ? (
          <>
            <View style={localStyles.rowsCard}>
              {activeDirectMessages.map((item, index) =>
                renderDirectRow(item, index)
              )}
            </View>
            {!isLoading && !activeDirectMessages.length ? (
              <View style={localStyles.conversationHint}>
                <View style={localStyles.conversationIcon}>
                  <Icon
                    name="chatbubble-ellipses-outline"
                    size={30}
                    color="#85858B"
                  />
                </View>
                <Text style={localStyles.conversationHintText}>
                  {activeDirectMessages.length
                    ? "Tus conversaciones, en un solo lugar"
                    : "Conectá con alguien para iniciar una conversación"}
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <>
            <CommunityGroups
              variant="list"
              matches={matches ?? []}
              groups={communityGroups}
            />
            {renderGroupSection(
              "EVENTOS",
              activeGroups.filter((group) => group.eventType === "event")
            )}
            {renderGroupSection(
              "CHALLENGES",
              activeGroups.filter((group) => group.eventType === "challenge")
            )}
            {renderGroupSection("EVENTOS FINALIZADOS", finishedEventGroups)}
            {renderGroupSection(
              "CHALLENGES FINALIZADOS",
              finishedChallengeGroups
            )}
            {!loading && !communityGroups.isError && groupCount === 0 ? (
              <View style={localStyles.emptyState}>
                <Text style={localStyles.emptyStateText}>
                  Creá un grupo con tus conexiones o sumate a un evento o
                  challenge.
                </Text>
              </View>
            ) : null}
          </>
        )}
        {visibleArchivedChats.length ? (
          <>
            <Text style={localStyles.groupSectionLabel}>ARCHIVADOS</Text>
            <View style={localStyles.rowsCard}>
              {visibleArchivedChats.map((entry, index) =>
                entry.kind === "group"
                  ? renderGroupRow(entry.item, index, { archived: true })
                  : renderDirectRow(entry.item, index, { archived: true })
              )}
            </View>
          </>
        ) : null}
        {(activeTab === "messages" ? isLoading : groupsLoading) ? (
          <View style={localStyles.loadingWrap}>
            <VibesLoader size={62} />
          </View>
        ) : null}
      </ScrollView>

      <AnimatedSheetModal
        visible={connectionsSheet !== null}
        onClose={() => setConnectionsSheet(null)}
        onClosed={handleConnectionsSheetClosed}
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
            : "Conexiones nuevas"}
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
        onClose={() => {
          setSelectedIncomingLike(null);
          setPendingIncomingLike(null);
        }}
        onContactPress={handleConnectIncomingLike}
        secondaryActionLabel="Descartar"
        onSecondaryActionPress={handleDismissIncomingLike}
      />
    </View>
  );
};

const Messages = () => <MessagesContent />;

export default Messages;

const localStyles = StyleSheet.create({
  communityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 0,
    marginBottom: 12,
  },
  communityTitle: {
    flexShrink: 1,
    color: "#161820",
    fontSize: 24,
    lineHeight: 29,
    fontFamily: vibesTheme.fonts.bold,
  },
  chatTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E9E7E4",
    marginTop: 4,
    marginBottom: 10,
  },
  chatTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  chatTabActive: { borderBottomColor: "#B57716" },
  chatTabText: {
    flexShrink: 1,
    color: "#858585",
    fontSize: 16,
    fontFamily: vibesTheme.fonts.medium,
  },
  chatTabTextActive: { color: "#161820", fontFamily: vibesTheme.fonts.bold },
  groupSectionLabel: {
    color: "#73737E",
    fontSize: 13,
    marginTop: 12,
    marginBottom: 4,
  },
  conversationHint: {
    alignItems: "center",
    marginTop: 70,
    marginBottom: 24,
    gap: 12,
  },
  conversationIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F0F0EE",
    alignItems: "center",
    justifyContent: "center",
  },
  conversationHintText: { color: "#838391", fontSize: 15, textAlign: "center" },
  screenBackground: {
    backgroundColor: vibesTheme.colors.background,
  },
  content: {
    paddingHorizontal: 16,
  },
  appHeader: {
    paddingHorizontal: 0,
    paddingTop: 0,
    marginBottom: 8,
  },
  appHeaderTitle: {
    color: TEXT_PRIMARY,
    fontSize: 32,
    lineHeight: 38,
    fontFamily: vibesTheme.fonts.thin,
    textAlign: "center",
  },
  connectionsHeader: {
    marginBottom: 10,
  },
  connectionsTitle: {
    color: TEXT_PRIMARY,
    fontSize: 32,
    lineHeight: 38,
    fontFamily: vibesTheme.fonts.thin,
    textAlign: "left",
  },
  connectionsGrid: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
    marginBottom: 12,
  },
  connectionSummaryCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 104,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EFE1CC",
    backgroundColor: "#FCF8F0",
    padding: 12,
  },
  connectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4E7D1",
  },
  connectionCardMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  connectionCountBadge: {
    minWidth: 24,
    minHeight: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAEDF0",
  },
  connectionCountText: {
    color: DARK_GRAY,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: vibesTheme.fonts.bold,
  },
  connectionCardTitle: {
    color: DARK_GRAY,
    fontSize: 16,
    lineHeight: 21,
    fontFamily: vibesTheme.fonts.medium,
  },
  connectionPreviewRow: {
    height: 32,
    flexDirection: "row",
    alignItems: "center",
  },
  connectionPreviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255, 253, 248, 0.96)",
    backgroundColor: "rgba(228, 183, 110, 0.2)",
  },
  connectionPreviewAvatarStacked: {
    marginLeft: -9,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    marginTop: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(228, 183, 110, 0.14)",
  },
  connectionCardAction: {
    marginLeft: 8,
    color: "#B98235",
    fontSize: 14,
    fontFamily: vibesTheme.fonts.bold,
  },
  connectionsSheet: {
    maxHeight: "76%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: "#FEFEFD",
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
    fontFamily: vibesTheme.fonts.thin,
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
    fontFamily: vibesTheme.fonts.bold,
  },
  connectionSheetHint: {
    marginTop: 2,
    color: "#7B746C",
    fontSize: 14,
    fontFamily: vibesTheme.fonts.medium,
  },
  connectionSheetEmpty: {
    paddingVertical: 22,
    color: "#7B746C",
    fontSize: 16,
    fontFamily: vibesTheme.fonts.medium,
  },
  emptyState: {
    minHeight: 280,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateText: {
    color: "#7B746C",
    fontSize: 20,
    lineHeight: 27,
    textAlign: "center",
    fontFamily: vibesTheme.fonts.medium,
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
    fontFamily: vibesTheme.fonts.thin,
    flexShrink: 1,
    minWidth: 0,
  },
  countBadge: {
    minWidth: 24,
    minHeight: 24,
    paddingVertical: 2,
    borderRadius: 14,
    paddingHorizontal: 8,
    marginLeft: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(228, 183, 110, 0.22)",
  },
  countText: {
    color: DARK_GRAY,
    fontSize: 15,
    fontFamily: vibesTheme.fonts.bold,
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
    fontFamily: vibesTheme.fonts.semibold,
  },
  rowsCard: { marginBottom: 4 },
  cardRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 0,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E7E5DF",
  },
  groupAvatar: {
    width: 48,
    height: 48,
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
    flexWrap: "wrap",
    rowGap: 4,
    alignItems: "center",
  },
  rowTitle: {
    flexShrink: 1,
    color: DARK_GRAY,
    fontSize: 17,
    lineHeight: 21,
    fontFamily: vibesTheme.fonts.medium,
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
    fontFamily: vibesTheme.fonts.bold,
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
    fontFamily: vibesTheme.fonts.medium,
  },
  rowMeta: {
    minWidth: 42,
    maxWidth: "26%",
    minHeight: 44,
    gap: 6,
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginLeft: 8,
  },
  rowTime: {
    color: "#6E6E6E",
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: true,
    fontFamily: vibesTheme.fonts.medium,
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
