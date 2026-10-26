import { useMeetPeople } from "../src/queries/meetPeople.queries";
import { matchesConversationSearch } from "../src/lib/conversationSearch";
import ConnectionStrip from "../components/ConnectionStrip";
import { sectionTabStyles } from "../components/SectionTabStyles";
import { messagePreview } from "../src/lib/chatPhotos";
import { useConnectionViewsQuery } from "../src/queries/homeActivity.queries";
import { getNewConnections } from "../src/lib/homeActivity";
import UnreadBadge from "../components/UnreadBadge";
import { useCommunityUnreadQuery } from "../src/queries/communityReceipts.queries";
/** @format */

import React, { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScrollView, StyleSheet, TouchableOpacity, View, Alert } from "react-native";
import { Text, TextInput } from "../components/Typography";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components";
import Avatar from "../components/Avatar";
import CommunityGroups from "../components/CommunityGroups";
import { useCommunityGroupsQuery, useCommunityInvitationsQuery } from "../src/queries/communityGroups.queries";
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

type ArchivedChatItem =
  | { kind: "group"; item: EventGroupSummary }
  | { kind: "direct"; item: MatchWithProfile };

type ConnectionsSheet = "incoming" | "new" | null;

type MessagesContentProps = {
  homeEntryKey?: number;
  homeTarget?: "messages" | "connections" | "incoming";
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

type GroupKind = "community" | "challenge" | "event";
const GROUP_KIND_ICON: Record<GroupKind, { name: string; label: string }> = {
  community: { name: "people-outline", label: "Grupo de comunidad" },
  challenge: { name: "trophy-outline", label: "Desafío" },
  event: { name: "calendar-outline", label: "Evento" },
};

const GroupKindIcon = ({ kind }: { kind: GroupKind }) => (
  <View
    accessible
    accessibilityLabel={GROUP_KIND_ICON[kind].label}
    style={localStyles.kindIcon}
  >
    <Icon
      name={GROUP_KIND_ICON[kind].name}
      size={14}
      color={vibesTheme.colors.secondaryText}
    />
  </View>
);

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
  const { enabled: meetPeopleEnabled } = useMeetPeople();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const incomingQueue = React.useRef<IncomingLike[]>([]);
  const resumeIncoming = React.useRef<IncomingLike | null>(null);
  const leftForMatch = React.useRef(false);
  useEffect(() => {
    if (!focused) { leftForMatch.current = true; return; }
    if (leftForMatch.current && resumeIncoming.current) {
      setSelectedIncomingLike(resumeIncoming.current);
      resumeIncoming.current = null;
    }
    leftForMatch.current = false;
  }, [focused]);
  const { locale, t } = useI18n();
  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  const communityGroups = useCommunityGroupsQuery();
  const communityInvitations = useCommunityInvitationsQuery();
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
  const [conversationSearch, setConversationSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [archivedKeys, setArchivedKeys] = useState<string[]>([]);
  const { data: selectedIncomingProfile } = useProfileQuery(
    selectedIncomingLike?.likerUserId
  );
  const { data: selectedIncomingPreferences } = useUserPreferencesQuery(
    selectedIncomingLike?.likerUserId
  );

  const withMessages = (matches ?? [])
    .filter((m) => m.lastMessage || views.data?.includes(m.id))
    .sort((left, right) => {
      const leftTime = Date.parse(left.lastMessageAt ?? left.createdAt) || 0;
      const rightTime = Date.parse(right.lastMessageAt ?? right.createdAt) || 0;
      return rightTime - leftTime || left.id.localeCompare(right.id);
    });
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
    setConnectionsSheet(homeTarget === "incoming" ? "incoming" : homeTarget === "connections" ? "new" : null);
  }, [homeEntryKey, homeTarget, initialMessagesTab]);
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
        ? "La conversación volverá a aparecer en Chats."
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
      !archivedKeys.includes(getArchiveItemKey({ kind: "direct", item })) &&
      matchesConversationSearch(conversationSearch, item.otherUserName, messagePreview(item.lastMessage))
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
  ].filter(entry => entry.kind === "direct"
    ? matchesConversationSearch(conversationSearch, entry.item.otherUserName, messagePreview(entry.item.lastMessage))
    : matchesConversationSearch(conversationSearch, entry.item.title)
  ).sort((left, right) => {
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

  const nextIncoming = () => {
    if (swipeMutation.isPending) return;
    setSelectedIncomingLike(incomingQueue.current.shift() ?? null);
  };
  const handleConnectIncomingLike = () => {
    if (swipeMutation.isPending || !selectedIncomingLike || !selectedIncomingLikeCard) return;

    swipeMutation.mutate(
      {
        targetUserId: String(selectedIncomingLike.likerUserId),
        direction: "like",
      },
      {
        onSuccess: (response) => {
          const next = incomingQueue.current.shift() ?? null;
          if (response?.match) {
            resumeIncoming.current = next;
            navigation.navigate(
              "Match" as never,
              { profile: selectedIncomingLikeCard } as never
            );
          }
          setSelectedIncomingLike(response?.match ? null : next);
        },
        onError: (error) =>
          handleApiError(error, { toastTitle: "Error al conectar" }),
      }
    );
  };

  const handleDismissIncomingLike = () => {
    if (!selectedIncomingLike || swipeMutation.isPending) return;

    swipeMutation.mutate(
      {
        targetUserId: String(selectedIncomingLike.likerUserId),
        direction: "pass",
      },
      {
        onSuccess: () => setSelectedIncomingLike(incomingQueue.current.shift() ?? null),
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
          color={vibesTheme.colors.secondaryText}
          size={17}
        />
      </TouchableOpacity>
    </View>
  );

  const openIncomingProfile = (item: IncomingLike) => {
    const index = incomingLikes.findIndex(person => person.likerUserId === item.likerUserId);
    incomingQueue.current = [...incomingLikes.slice(index + 1), ...incomingLikes.slice(0, index)];
    resumeIncoming.current = null;
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
      accessibilityRole="button"
      accessibilityLabel={`Ver perfil de ${item.likerUserName}`}
      style={[localStyles.connectionSheetRow, localStyles.incomingCard]}
      activeOpacity={0.82}
      onPress={() => openIncomingProfile(item)}
    >
      <Avatar uri={item.likerUserPhoto} size={62} />
      <View style={localStyles.connectionSheetBody}>
        <Text style={localStyles.connectionSheetName} numberOfLines={1}>
          {item.likerUserName}
        </Text>
      </View>
      <Icon name="chevron-forward" color={vibesTheme.colors.secondaryText} size={18} />
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
      <Icon name="chatbubble-ellipses-outline" color={vibesTheme.colors.secondaryText} size={18} />
    </TouchableOpacity>
  );

  const renderGroupRow = (
    item: EventGroupSummary,
    index: number,
    options?: { archived?: boolean }
  ) => {
    const imgSource =
      typeof item.image === "string" ? { uri: item.image } : item.image;

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
            <GroupKindIcon kind={item.eventType} />
            <Text style={localStyles.rowTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {isFinishedChallengeGroup(item) || isFinishedEventGroup(item) ? (
              <Text style={localStyles.finishedTag}>Finalizado</Text>
            ) : null}
          </View>
          <Text style={localStyles.lastMessage} numberOfLines={2}>
            {messagePreview(item.lastMessage) ?? "No hay mensajes aún"}
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
          {messagePreview(item.lastMessage) ?? "Nueva conexión"}
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

  const loading = isLoading || groupsLoading || communityGroups.isLoading || communityInvitations.isLoading;
  const visibleArchivedChats = archivedChats.filter((entry) =>
    activeTab === "groups" ? entry.kind === "group" : entry.kind === "direct"
  );
  const groupCount =
    (communityInvitations.data?.length ?? 0) +
    (communityGroups.data?.length ?? 0) +
    activeGroups.length +
    finishedEventGroups.length +
    finishedChallengeGroups.length;
  const renderCommunityRow = (
    group: NonNullable<typeof communityGroups.data>[number]
  ) => (
    <TouchableOpacity
      key={`community:${group.id}`}
      accessibilityRole="button"
      style={localStyles.cardRow}
      activeOpacity={0.78}
      onPress={() =>
        navigation.navigate(
          "CommunityGroupChat" as never,
          {
            groupId: group.id,
            name: group.name,
            description: group.description,
          } as never
        )
      }
    >
      {group.photoUrl ? (
        <ProfileMediaImage
          source={{ uri: group.photoUrl }}
          style={localStyles.groupAvatar}
        />
      ) : (
        <View style={[localStyles.groupAvatar, localStyles.groupAvatarEmpty]}>
          <Icon
            name="people-outline"
            size={26}
            color={vibesTheme.colors.accentMustard}
          />
        </View>
      )}
      <View style={localStyles.rowBody}>
        <View style={localStyles.rowTitleLine}>
          <GroupKindIcon kind="community" />
          <Text style={localStyles.rowTitle} numberOfLines={1}>
            {group.name}
          </Text>
        </View>
        <Text style={localStyles.lastMessage} numberOfLines={2}>
          {messagePreview(group.lastMessage?.body ?? null) ??
            "Todavía no hay mensajes"}
        </Text>
      </View>
      <View style={localStyles.rowMeta}>
        <Text style={localStyles.rowTime}>
          {formatTime(group.lastMessage?.created_at ?? null)}
        </Text>
        <UnreadBadge
          count={Number(
            unread.find(
              (r) => r.kind === "group" && r.conversation_id === group.id
            )?.unread_count ?? 0
          )}
        />
      </View>
    </TouchableOpacity>
  );

  // One list for every group type, newest activity first. Groups without
  // messages fall back to their creation date (community) or go last.
  const toTime = (iso: string | null | undefined) => {
    const time = iso ? new Date(iso).getTime() : NaN;
    return Number.isNaN(time) ? 0 : time;
  };
  const unifiedGroups = [
    ...(communityGroups.data ?? []).map((group) => ({
      at: toTime(group.lastMessage?.created_at ?? group.created_at),
      title: group.name,
      render: () => renderCommunityRow(group),
    })),
    ...[...activeGroups, ...finishedEventGroups, ...finishedChallengeGroups].map(
      (group, index) => ({
        at: toTime(group.lastMessageAt),
        title: group.title,
        render: () => renderGroupRow(group, index),
      })
    ),
  ].filter(entry => matchesConversationSearch(conversationSearch, entry.title))
    .sort((a, b) => b.at - a.at || a.title.localeCompare(b.title));


  return (
    <View style={[styles.bg, localStyles.screenBackground]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
          <Text style={localStyles.communityTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {t("messages.connections")}
          </Text>
          <CommunityGroups
            variant="create"
            matches={matches ?? []}
            groups={communityGroups}
            invitations={communityInvitations}
          />
        </View>
        {meetPeopleEnabled ? <ConnectionStrip incomingLikes={incomingLikes} newConnections={newConnections}
          onRequests={() => setConnectionsSheet("incoming")}
          onViewAll={() => setConnectionsSheet("new")}
          onConnection={openNewConnectionChat} /> : null}

        <View style={sectionTabStyles.tabs}>
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
                count: (communityInvitations.data?.length ?? 0) + unread
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
                  sectionTabStyles.tab,
                  selected && sectionTabStyles.active,
                ]}
              >
                <Icon
                  name={tab.icon}
                  size={22}
                  color={selected ? vibesTheme.colors.accentMustard : vibesTheme.colors.secondaryText}
                />
                <Text
                  style={[
                    sectionTabStyles.text,
                    selected && sectionTabStyles.activeText,
                  ]}
                >
                  {tab.label}
                </Text>
                {tab.count > 0 ? (
                  <View style={localStyles.countBadge}>
                    <Text style={localStyles.countText}>{tab.count}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={localStyles.searchLabel}>Buscar conversaciones</Text>
        <View style={[localStyles.searchField, searchFocused && { borderColor: vibesTheme.colors.accentBlue }]}>
          <Icon name="search-outline" size={22} color={vibesTheme.colors.secondaryText} />
          <TextInput
            accessibilityLabel="Buscar conversaciones"
            placeholder={activeTab === "messages" ? "Nombre o último mensaje" : "Nombre del grupo"}
            placeholderTextColor={vibesTheme.colors.secondaryText}
            value={conversationSearch}
            onChangeText={setConversationSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            style={localStyles.searchInput}
          />
          {conversationSearch ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" onPress={() => setConversationSearch("")} style={localStyles.clearSearch}>
            <Icon name="close" size={22} color={vibesTheme.colors.primaryText} />
          </TouchableOpacity> : null}
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
                    color={vibesTheme.colors.secondaryText}
                  />
                </View>
                <Text style={localStyles.conversationHintText}>
                  {conversationSearch.trim()
                    ? "No encontramos conversaciones con esa búsqueda"
                    : "Conectá con alguien para iniciar una conversación"}
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <>
            <CommunityGroups
              variant="list"
              showGroups={false}
              matches={matches ?? []}
              groups={communityGroups}
              invitations={communityInvitations}
            />
            {unifiedGroups.length ? (
              <View style={localStyles.rowsCard}>
                {unifiedGroups.map((entry) => entry.render())}
              </View>
            ) : null}
            {!loading && !communityGroups.isError && !communityInvitations.isError && (conversationSearch.trim() ? unifiedGroups.length === 0 : groupCount === 0) ? (
              <View style={localStyles.emptyState}>
                <Text style={localStyles.emptyStateText}>
                  {conversationSearch.trim() ? "No encontramos grupos con esa búsqueda" : "Creá un grupo con tus conexiones o sumate a un evento o desafío."}
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
            <VibesLoader />
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={localStyles.connectionsSheetTitle}>{connectionsSheet === "incoming" ? "Quieren conectar" : "Conexiones nuevas"}</Text>
          <View style={localStyles.sheetCount}><Text style={{ color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.bold }}>{connectionsSheet === "incoming" ? incomingLikes.length : newConnections.length}</Text></View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar conexiones" onPress={() => setConnectionsSheet(null)} style={{ marginLeft: "auto", padding: 10 }}><Icon name="close" size={24} color={vibesTheme.colors.secondaryText} /></TouchableOpacity>
        </View>
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
          incomingQueue.current = [];
          resumeIncoming.current = null;
        }}
        actionPending={swipeMutation.isPending}
        nextActionLabel="Siguiente"
        onNextActionPress={nextIncoming}
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
  searchLabel: { color: vibesTheme.colors.primaryText, fontSize: 14, lineHeight: 20, fontFamily: vibesTheme.fonts.semibold, marginBottom: 6 },
  searchField: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: `${vibesTheme.colors.primaryText}1F`, backgroundColor: vibesTheme.colors.surface, marginBottom: 12 },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 12, color: vibesTheme.colors.primaryText, fontSize: 16, lineHeight: 24, fontFamily: vibesTheme.fonts.regular },
  clearSearch: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
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
    color: TEXT_PRIMARY,
    fontSize: 34,
    lineHeight: 42,
    fontFamily: vibesTheme.fonts.extraBold,
    textAlign: "left",
  },
  chatTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(110, 110, 110, 0.30)",
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
  chatTabActive: { borderBottomColor: vibesTheme.colors.accentMustard },
  chatTabText: {
    flexShrink: 1,
    color: vibesTheme.colors.secondaryText,
    fontSize: 16,
    fontFamily: vibesTheme.fonts.medium,
  },
  chatTabTextActive: { color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.bold },
  groupSectionLabel: {
    color: vibesTheme.colors.secondaryText,
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
    backgroundColor: "rgba(110, 110, 110, 0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  conversationHintText: { color: vibesTheme.colors.secondaryText, fontSize: 15, textAlign: "center" },
  screenBackground: {
    backgroundColor: vibesTheme.colors.background,
  },
  content: {
    paddingHorizontal: 20,
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
    fontFamily: vibesTheme.fonts.regular,
    textAlign: "center",
  },
  connectionsHeader: {
    marginBottom: 10,
  },
  connectionsTitle: {
    color: TEXT_PRIMARY,
    fontSize: 32,
    lineHeight: 38,
    fontFamily: vibesTheme.fonts.regular,
    textAlign: "left",
  },
  connectionsSheet: {
    maxHeight: "76%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: vibesTheme.colors.background,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  connectionsSheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
    backgroundColor: "rgba(110, 110, 110, 0.24)",
  },
  incomingCard: { backgroundColor: `${vibesTheme.colors.secondaryText}08`, borderRadius: 18, padding: 14, marginBottom: 10, minHeight: 90 },
  sheetCount: { backgroundColor: `${vibesTheme.colors.accentMustard}40`, padding: 8, minWidth: 30, alignItems: "center", borderRadius: 18 },
  connectionsSheetTitle: {
    color: DARK_GRAY,
    fontSize: 24,
    lineHeight: 30,
    flexShrink: 1,
    fontFamily: vibesTheme.fonts.bold,
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
    borderTopColor: "rgba(110, 110, 110, 0.12)",
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
    color: vibesTheme.colors.secondaryText,
    fontSize: 14,
    fontFamily: vibesTheme.fonts.medium,
  },
  connectionSheetEmpty: {
    paddingVertical: 22,
    color: vibesTheme.colors.secondaryText,
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
    color: vibesTheme.colors.secondaryText,
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
    fontFamily: vibesTheme.fonts.semibold,
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
    backgroundColor: "rgba(244, 163, 64, 0.22)",
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
    color: vibesTheme.colors.secondaryText,
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
    borderBottomColor: "rgba(110, 110, 110, 0.30)",
  },
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: BG_MAIN,
    borderWidth: 1,
    borderColor: "rgba(244, 163, 64, 0.38)",
  },
  directAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: vibesTheme.colors.accentMustard,
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
  kindIcon: {
    flexShrink: 0,
    marginRight: 5,
  },
  finishedTag: {
    flexShrink: 0,
    marginLeft: 6,
    color: vibesTheme.colors.secondaryText,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: vibesTheme.fonts.medium,
  },
  groupAvatarEmpty: {
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    flexShrink: 1,
    color: DARK_GRAY,
    fontSize: 17,
    lineHeight: 21,
    fontFamily: vibesTheme.fonts.medium,
  },
  lastMessage: {
    marginTop: 3,
    color: vibesTheme.colors.secondaryText,
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
    color: vibesTheme.colors.secondaryText,
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
    backgroundColor: "rgba(110, 110, 110, 0.08)",
    marginTop: 4,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: vibesTheme.colors.accentMustard,
    marginBottom: 6,
  },
  loadingWrap: {
    height: 82,
    alignItems: "center",
    justifyContent: "center",
  },
});
