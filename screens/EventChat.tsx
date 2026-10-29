import KeyboardViewport from "../components/KeyboardViewport";
import {chatComposerBottomPadding} from "../src/lib/chatComposerLayout";
import ChatVisibleDate, { useChatVisibleDate } from "../components/ChatVisibleDate";
import ChatPhotoButton from "../components/ChatPhotoButton";
import ChatMessageContent from "../components/ChatMessageContent";
import HeartMessageBubble from "../components/HeartMessageBubble";
import { useMessageHearts } from "../src/queries/messageHearts.queries";
import MessageEntrance from "../components/MessageEntrance";
/** @format */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  Keyboard,

  Platform,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  Linking,
  Animated,
  Easing,
} from "react-native";
import { Text, TextInput } from "../components/Typography";
import {
  useIsFocused,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles, {
  TEXT_SECONDARY,
  WHITE,
  PRIMARY_COLOR,
  DARK_GRAY,
} from "../assets/styles";
import Icon from "../components/Icon";
import AppHeader from "../components/AppHeader";
import Avatar from "../components/Avatar";
import VibesLoader from "../components/VibesLoader";
import UserProfileSheet from "../components/UserProfileSheet";
import { useAuthSession } from "../src/auth/auth.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";
import { mapCandidateToConnectionProfile } from "../src/lib/connectionProfiles";
import { useSwipeMutation } from "../src/queries/swipes.mutations";
import { useFindMatchQuery } from "../src/queries/matches.queries";
import { handleApiError } from "../src/utils/handleApiError";
import {
  useEventParticipantsQuery,
  useEventMessagesQuery,
  useMarkEventGroupReadMutation,
  useSendEventMessageMutation,
  useDeleteEventMessageMutation,
  useKickParticipantMutation,
  useReportEventContentMutation,
  type EventType,
  type EventMessage,
} from "../src/queries/events.queries";
import { vibesTheme } from "../src/theme/vibesTheme";
import { displayEventSession } from "../src/lib/eventSchedule";
import * as ds from "../src/theme/tokens";

const parseEventDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatEventChatDate = (value: Date | null) => {
  if (!value) return "Sin fecha";
  return value.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
};

const formatEventChatTime = (value: Date | null) => {
  if (!value) return "Sin hora";
  return value.toLocaleTimeString("es-AR", {
    hour: "numeric",
    minute: "2-digit",
  });
};

type TimelineMessage = { kind: "event" } & EventMessage;

const REPORT_REASON = "Contenido inapropiado";
const COMPOSER_LINE_HEIGHT = 20;
const COMPOSER_VERTICAL_PADDING = 8;
const COMPOSER_MIN_HEIGHT =
  COMPOSER_LINE_HEIGHT + COMPOSER_VERTICAL_PADDING * 2;
const COMPOSER_MAX_HEIGHT =
  COMPOSER_LINE_HEIGHT * 4 + COMPOSER_VERTICAL_PADDING * 2;

const EventChat = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const event = (route.params as any)?.event;
  const eventId = event?.id as string | undefined;
  const eventType = (event?.type ?? "event") as EventType;
  const createdBy = event?.createdBy as string | undefined;
  const eventStartsAt = parseEventDate(eventType === "event" ? displayEventSession(event?.schedule, event?.startsAt)?.startsAt ?? event?.startsAt : event?.startsAt);
  const eventLocation =
    typeof event?.location === "string" && event.location.trim()
      ? event.location.trim()
      : null;

  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  const isAdmin = Boolean(userId && createdBy && userId === createdBy);
  const swipeMutation = useSwipeMutation();

  const { data: participants = [] } = useEventParticipantsQuery(eventId);
  const {
    data: messages = [],
    isLoading: messagesLoading,
    error: messagesError,
  } = useEventMessagesQuery(eventId);
  const hearts = useMessageHearts(
    "event",
    eventId,
    messages.map((m) => m.id),
    isFocused
  );
  const visibleDate = useChatVisibleDate(eventId);
  const messagePositions = useRef(new Map<string, { y: number; height: number; date: string }>());
  const visibleMessageOffset = useRef(0);
  const updateVisibleDate = () => {
    const first = [...messagePositions.current.values()].filter(row => row.y + row.height > visibleMessageOffset.current + 8).sort((a, b) => a.y - b.y)[0];
    if (first) visibleDate.setDate(first.date);
  };
  useEffect(() => { messagePositions.current.clear(); visibleMessageOffset.current = 0; }, [eventId]);
  const markReadMutation = useMarkEventGroupReadMutation();
  const sendMutation = useSendEventMessageMutation();
  const deleteMutation = useDeleteEventMessageMutation();
  const kickMutation = useKickParticipantMutation();
  const reportMutation = useReportEventContentMutation();

  const [message, setMessage] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [composerHeight, setComposerHeight] = useState(COMPOSER_MIN_HEIGHT);
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [messagesLoadingTimedOut, setMessagesLoadingTimedOut] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(
    () => new Set()
  );
  const [selectedParticipant, setSelectedParticipant] = useState<{
    userId: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const membersBackdropOpacity = useRef(new Animated.Value(0)).current;
  const membersCardOpacity = useRef(new Animated.Value(0)).current;
  const membersCardScale = useRef(new Animated.Value(0.92)).current;
  const membersCardTranslateY = useRef(new Animated.Value(22)).current;
  const lastMarkedReadAtRef = useRef<string | null>(null);
  const { data: selectedParticipantProfile } = useProfileQuery(
    selectedParticipant?.userId
  );
  const { data: selectedParticipantPreferences } = useUserPreferencesQuery(
    selectedParticipant?.userId
  );
  const selectedParticipantMatchQuery = useFindMatchQuery(
    selectedParticipant?.userId
  );
  const selectedParticipantCard = selectedParticipant
    ? mapCandidateToConnectionProfile({
        id: selectedParticipant.userId,
        displayName:
          selectedParticipantProfile?.displayName ??
          selectedParticipant.displayName ??
          "Participante",
        ...(selectedParticipantProfile ?? {}),
        ...(selectedParticipantPreferences ?? {}),
        hideAge:
          selectedParticipantPreferences == null ||
          selectedParticipantPreferences.hideAge === true,
        photos:
          selectedParticipantProfile?.photos ??
          (selectedParticipant.avatarUrl
            ? [selectedParticipant.avatarUrl]
            : []),
      })
    : null;
  const canConnectSelectedParticipant = Boolean(
    selectedParticipant &&
      selectedParticipant.userId !== userId &&
      selectedParticipantMatchQuery.isFetched &&
      !selectedParticipantMatchQuery.data
  );
  const handleConnectParticipant = () => {
    if (!selectedParticipant || !selectedParticipantCard) return;
    if (selectedParticipant.userId === userId) {
      handleCloseParticipant();
      return;
    }
    const participantCard = selectedParticipantCard;
    handleCloseParticipant();

    swipeMutation.mutate(
      {
        targetUserId: String(selectedParticipant.userId),
        direction: "like",
      },
      {
        onSuccess: (response) => {
          if (response?.match) {
            navigation.navigate(
              "Match" as never,
              { profile: participantCard } as never
            );
          }
        },
        onError: (error) =>
          handleApiError(error, { toastTitle: "Error de conexión" }),
      }
    );
  };

  const openMembersModal = useCallback(() => {
    setMembersModalVisible(true);
    membersBackdropOpacity.setValue(0);
    membersCardOpacity.setValue(0);
    membersCardScale.setValue(0.92);
    membersCardTranslateY.setValue(22);

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(membersBackdropOpacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(membersCardOpacity, {
          toValue: 1,
          duration: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(membersCardScale, {
          toValue: 1,
          damping: 16,
          stiffness: 210,
          mass: 0.85,
          useNativeDriver: true,
        }),
        Animated.spring(membersCardTranslateY, {
          toValue: 0,
          damping: 18,
          stiffness: 220,
          mass: 0.9,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [
    membersBackdropOpacity,
    membersCardOpacity,
    membersCardScale,
    membersCardTranslateY,
  ]);

  const closeMembersModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(membersBackdropOpacity, {
        toValue: 0,
        duration: 160,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(membersCardOpacity, {
        toValue: 0,
        duration: 120,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(membersCardScale, {
        toValue: 0.97,
        duration: 160,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(membersCardTranslateY, {
        toValue: 14,
        duration: 160,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMembersModalVisible(false);
      }
    });
  }, [
    membersBackdropOpacity,
    membersCardOpacity,
    membersCardScale,
    membersCardTranslateY,
  ]);

  const handleOpenParticipant = useCallback(
    (nextParticipant: {
      userId: string;
      displayName: string | null;
      avatarUrl: string | null;
    }) => {
      if (nextParticipant.userId === userId) return;
      setSelectedParticipant(nextParticipant);
    },
    [userId]
  );

  const handleCloseParticipant = useCallback(() => {
    setSelectedParticipant(null);
  }, []);

  // Build a lookup for sender info from participants
  const participantMap = useRef<
    Record<string, { name: string | null; avatar: string | null }>
  >({});
  useEffect(() => {
    const map: typeof participantMap.current = {};
    for (const p of participants) {
      map[p.userId] = { name: p.displayName, avatar: p.avatarUrl };
    }
    participantMap.current = map;
  }, [participants]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const timelineMessages = useMemo<TimelineMessage[]>(() => {
    return messages
      .filter((item) => !blockedUserIds.has(item.senderId))
      .map((item) => ({
        ...item,
        kind: "event",
      }));
  }, [blockedUserIds, messages]);

  useEffect(() => {
    if (timelineMessages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [timelineMessages.length]);

  useEffect(() => {
    if (
      !isFocused ||
      !eventId ||
      messagesLoading ||
      markReadMutation.isPending
    ) {
      return;
    }

    // Also runs with no visible messages: the mutation reads up to the latest
    // stored one, including messages hidden from deleted accounts.
    const latestMessage = messages[messages.length - 1];
    const readKey = latestMessage?.createdAt ?? "empty";
    if (lastMarkedReadAtRef.current === readKey) return;

    lastMarkedReadAtRef.current = readKey;
    markReadMutation.mutate({
      eventId,
      eventType,
      readAt: latestMessage?.createdAt,
    });
  }, [eventId, eventType, isFocused, markReadMutation, messages, messagesLoading]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      "keyboardDidShow",
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
        setTimeout(
          () => scrollRef.current?.scrollToEnd({ animated: true }),
          80
        );
      }
    );
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!messagesLoading) {
      setMessagesLoadingTimedOut(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setMessagesLoadingTimedOut(true);
    }, 4000);

    return () => clearTimeout(timeoutId);
  }, [messagesLoading]);

  const handleSend = async () => {
    const body = message.trim();
    if (!body || !eventId || !userId) {
      console.log("[EventChat] Send blocked:", {
        body: !!body,
        eventId,
        userId,
      });
      return;
    }
    setMessage("");
    try {
      await sendMutation.mutateAsync({
        eventId,
        eventType,
        senderId: userId,
        body,
      });
    } catch (err: any) {
      console.error("[EventChat] Send error:", err);
      Alert.alert(
        "Error al enviar",
        err?.message ?? "No se pudo enviar el mensaje."
      );
      setMessage(body);
    }
  };

  const getSenderInfo = (senderId: string) => {
    const fromMap = participantMap.current[senderId];
    if (fromMap) return fromMap;
    const msg = messages.find((m) => m.senderId === senderId);
    if (msg) return { name: msg.senderName, avatar: msg.senderAvatar };
    return { name: null, avatar: null };
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const handleLongPressMessage = useCallback(
    (msg: EventMessage) => {
      if (!eventId) return;
      if (msg.deliveryStatus === "sending") return;
      const canDelete = msg.senderId === userId || isAdmin;
      if (!canDelete) {
        Alert.alert(
          "Reportar y bloquear",
          "Ocultaremos el contenido de esta persona y enviaremos el reporte al equipo de moderación.",
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Reportar y bloquear",
              style: "destructive",
              onPress: () => {
                reportMutation.mutate(
                  {
                    reportedUserId: msg.senderId,
                    reason: REPORT_REASON,
                    details: msg.body,
                    contentType: "event_message",
                    contentId: msg.id,
                    eventId,
                    eventType,
                  },
                  {
                    onSuccess: () => {
                      setBlockedUserIds((prev) =>
                        new Set(prev).add(msg.senderId)
                      );
                      Alert.alert(
                        "Reporte enviado",
                        "Ocultamos el contenido de esta persona."
                      );
                    },
                    onError: (error) =>
                      Alert.alert(
                        "Error",
                        error.message || "No se pudo enviar el reporte."
                      ),
                  }
                );
              },
            },
          ]
        );
        return;
      }

      const isOwn = msg.senderId === userId;
      const label = isOwn ? "Borrar mi mensaje" : "Borrar mensaje (admin)";

      Alert.alert(label, "Se eliminará para todos.", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar",
          style: "destructive",
          onPress: () => {
            deleteMutation.mutate({ messageId: msg.id, eventId });
          },
        },
      ]);
    },
    [eventId, eventType, userId, isAdmin, deleteMutation, reportMutation]
  );

  const handleReportParticipant = useCallback(() => {
    if (!selectedParticipant || !eventId) return;
    const reportedUserId = selectedParticipant.userId;

    Alert.alert(
      "Reportar y bloquear",
      "Ocultaremos a esta persona y enviaremos el reporte al equipo de moderación.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Reportar y bloquear",
          style: "destructive",
          onPress: () => {
            reportMutation.mutate(
              {
                reportedUserId,
                reason: REPORT_REASON,
                details: selectedParticipant.displayName ?? undefined,
                contentType: eventType === "challenge" ? "challenge" : "event",
                contentId: eventId,
                eventId,
                eventType,
              },
              {
                onSuccess: () => {
                  setBlockedUserIds((prev) =>
                    new Set(prev).add(reportedUserId)
                  );
                  handleCloseParticipant();
                  Alert.alert(
                    "Reporte enviado",
                    "Ocultamos a esta persona de este grupo."
                  );
                },
                onError: (error) =>
                  Alert.alert(
                    "Error",
                    error.message || "No se pudo enviar el reporte."
                  ),
              }
            );
          },
        },
      ]
    );
  }, [
    eventId,
    eventType,
    handleCloseParticipant,
    reportMutation,
    selectedParticipant,
  ]);

  const handleKick = useCallback(
    (participantUserId: string, name: string | null) => {
      if (!eventId) return;
      Alert.alert(
        "Expulsar participante",
        `¿Expulsar a ${name || "este participante"} del grupo?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Expulsar",
            style: "destructive",
            onPress: () => {
              kickMutation.mutate({ participantUserId, eventId, eventType });
            },
          },
        ]
      );
    },
    [eventId, eventType, kickMutation]
  );

  const handleOpenMap = useCallback(async () => {
    if (!eventLocation) {
      Alert.alert("Mapa", "Este evento no tiene ubicación cargada.");
      return;
    }

    const encodedLocation = encodeURIComponent(eventLocation);
    const candidateUrls =
      Platform.OS === "ios"
        ? [
            `comgooglemaps://?q=${encodedLocation}`,
            `maps://?q=${encodedLocation}`,
            `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`,
          ]
        : [
            `geo:0,0?q=${encodedLocation}`,
            `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`,
          ];

    for (const url of candidateUrls) {
      try {
        await Linking.openURL(url);
        return;
      } catch {
        continue;
      }
    }

    Alert.alert("Mapa", "No se pudo abrir el mapa.");
  }, [eventLocation]);

  const openParticipantCard = useCallback(
    (participantUserId: string) => {
      const sender = getSenderInfo(participantUserId);
      setSelectedParticipant({
        userId: participantUserId,
        displayName: sender.name,
        avatarUrl: sender.avatar,
      });
    },
    [messages, participants]
  );

  return (
    <KeyboardViewport
      style={localStyles.keyboardAvoidingRoot}
    >
      <View style={styles.eventChatBackground}>
        <AppHeader
          title={event?.title || "Evento"}
          onTitlePress={event?.id ? () => navigation.navigate((eventType === "challenge" ? "ChallengeDetailScreen" : "EventDetail") as never, { event } as never) : undefined}
          showBack
          onBack={() => navigation.goBack()}
          style={styles.eventChatHeader}
          titleStyle={[styles.eventChatHeaderTitle, localStyles.headerTitle]}
          right={
            <TouchableOpacity
              style={styles.eventChatMenuButton}
              onPress={openMembersModal}
            >
              <Icon name="people" size={ds.iconSize.lg} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          }
        />

        {eventType !== "challenge" ? (
          <View style={localStyles.eventMetaSection}>
            <View style={localStyles.eventMetaCard}>
              <View style={localStyles.eventMetaMain}>
                <View style={localStyles.eventMetaDateBlock}>
                  <View style={localStyles.eventMetaLine}>
                    <Icon name="calendar" size={ds.iconSize.sm} color={PRIMARY_COLOR} />
                    <Text style={localStyles.eventMetaDateText}>
                      {formatEventChatDate(eventStartsAt)}
                    </Text>
                  </View>
                  <View style={localStyles.eventMetaLine}>
                    <Icon name="time" size={ds.iconSize.sm} color={PRIMARY_COLOR} />
                    <Text style={localStyles.eventMetaTimeText}>
                      {formatEventChatTime(eventStartsAt)}
                    </Text>
                  </View>
                </View>

                {eventLocation ? (
                  <TouchableOpacity
                    style={localStyles.eventMapButton}
                    onPress={handleOpenMap}
                    activeOpacity={0.85}
                  >
                    <Icon name="location" size={ds.iconSize.sm} color={WHITE} />
                    <Text style={localStyles.eventMapButtonText}>Ver mapa</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {eventLocation ? (
                <Text style={localStyles.eventLocationText} numberOfLines={2}>
                  {eventLocation}
                </Text>
              ) : null}

              {event?.description ? (
                <Text
                  style={localStyles.eventDescriptionText}
                  numberOfLines={2}
                >
                  {event.description}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={{ flex: 1, position: "relative" }}>
        <ScrollView
          scrollEventThrottle={32}
          onScroll={event => { visibleMessageOffset.current = event.nativeEvent.contentOffset.y; updateVisibleDate(); }}
          ref={scrollRef}
          style={styles.eventChatMessagesContainer}
          contentContainerStyle={[
            styles.eventChatMessagesContent,
            localStyles.messagesContentCompact,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
        >
          {!eventId ? (
            <View style={localStyles.emptyMessages}>
              <Text style={localStyles.emptyMessagesTitle}>
                No se pudo abrir este chat
              </Text>
              <Text style={localStyles.emptyMessagesText}>
                Falta la referencia del evento.
              </Text>
            </View>
          ) : messagesLoading && !messagesLoadingTimedOut ? (
            <VibesLoader  style={{ marginVertical: ds.spacing[8] }} />
          ) : messagesError ? (
            <View style={localStyles.emptyMessages}>
              <Text style={localStyles.emptyMessagesTitle}>
                No se pudieron cargar los mensajes
              </Text>
              <Text style={localStyles.emptyMessagesText}>
                Probá salir y volver a entrar al chat.
              </Text>
            </View>
          ) : timelineMessages.length === 0 ? (
            <View style={localStyles.emptyMessages}>
              <Text style={localStyles.emptyMessagesTitle}>
                {messagesLoadingTimedOut
                  ? "Todavía no pudimos cargar el historial"
                  : "Aún no hay mensajes"}
              </Text>
              <Text style={localStyles.emptyMessagesText}>
                {messagesLoadingTimedOut
                  ? "Podés escribir igual y el chat se va a actualizar cuando responda."
                  : "Sé el primero en romper el hielo 🧊"}
              </Text>
            </View>
          ) : (
            timelineMessages.map((msg) => {
              const isMe = msg.senderId === userId;
              const sender = getSenderInfo(msg.senderId);
              return (
                <View key={msg.id} onLayout={event => { messagePositions.current.set(msg.id, { ...event.nativeEvent.layout, date: msg.createdAt }); updateVisibleDate(); }}>
                <MessageEntrance
                  key={msg.id}
                  sending={isMe && msg.deliveryStatus === "sending"}
                >
                  <HeartMessageBubble
                    canReact={!isMe}
                    count={hearts.byMessage.get(msg.id)?.count}
                    liked={hearts.byMessage.get(msg.id)?.liked}
                    onHeart={(remove) => hearts.react(msg.id, remove)}
                    onSinglePress={() => {
                      if (isMe) return;
                      handleOpenParticipant({
                        userId: msg.senderId,
                        displayName: sender.name,
                        avatarUrl: sender.avatar,
                      });
                    }}
                    onLongPress={() => handleLongPressMessage(msg)}
                    style={[
                      localStyles.messageRow,
                      isMe && localStyles.messageRowMe,
                    ]}
                  >
                    {(press, longPress, reaction) => (
                      <>
                        {/* Avatar for other people's messages */}
                        {!isMe ? (
                          <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => openParticipantCard(msg.senderId)}
                          >
                            <Avatar uri={sender.avatar} size={28} />
                          </TouchableOpacity>
                        ) : null}
                        <View
                          style={[
                            localStyles.messageBubble,
                            isMe
                              ? localStyles.messageBubbleMe
                              : localStyles.messageBubbleOther,
                          ]}
                        >
                          {!isMe && (
                            <TouchableOpacity
                              activeOpacity={0.85}
                              onPress={() => openParticipantCard(msg.senderId)}
                            >
                              <Text style={localStyles.messageSender}>
                                {sender.name || "Participante"}
                              </Text>
                            </TouchableOpacity>
                          )}
                          <ChatMessageContent
                            onPhotoPress={press}
                            onLongPress={longPress}
                            body={msg.body}
                            textStyle={[
                              localStyles.messageText,
                              isMe && { color: DARK_GRAY },
                            ]}
                          />
                          <View style={localStyles.messageMetaRow}>
                            <Text style={localStyles.messageTime}>
                              {formatTime(msg.createdAt)}
                            </Text>
                            {isMe ? (
                              <Icon
                                name={
                                  msg.deliveryStatus === "sending"
                                    ? "time-outline"
                                    : "checkmark"
                                }
                                size={ds.iconSize.sm}
                                color={TEXT_SECONDARY}
                              />
                            ) : null}
                          </View>
                          {reaction}
                        </View>
                      </>
                    )}
                  </HeartMessageBubble>
                </MessageEntrance>
                </View>
              );
            })
          )}
        </ScrollView>
        <ChatVisibleDate date={visibleDate.date} />
        </View>

        <View
          style={[
            styles.eventChatInputContainer,
            {
              paddingTop: ds.spacing[3],
              paddingBottom:
                chatComposerBottomPadding(insets.bottom, keyboardHeight > 0),
              alignItems: "flex-end",
            },
          ]}
        >
          <ChatPhotoButton
            kind={eventType}
            chatId={eventId}
            userId={userId}
            disabled={sendMutation.isPending}
            onSend={(body) =>
              sendMutation.mutateAsync({
                eventId: eventId!,
                eventType,
                senderId: userId!,
                body,
              })
            }
          />
          <TextInput
            style={[
              styles.eventChatInput,
              localStyles.composerInput,
              Platform.OS === "ios" ? null : { height: composerHeight },
            ]}
            placeholder="Escribir mensaje..."
            placeholderTextColor={TEXT_SECONDARY}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={Platform.OS === "ios" ? 4 : undefined}
            scrollEnabled={
              Platform.OS === "ios"
                ? undefined
                : composerHeight >= COMPOSER_MAX_HEIGHT
            }
            onContentSizeChange={
              Platform.OS === "ios"
                ? undefined
                : (event) => {
                    const nextHeight = Math.min(
                      COMPOSER_MAX_HEIGHT,
                      Math.max(
                        COMPOSER_MIN_HEIGHT,
                        event.nativeEvent.contentSize.height
                      )
                    );
                    setComposerHeight(nextHeight);
                  }
            }
            textAlignVertical="top"
            onFocus={() => {
              setTimeout(() => {
                scrollRef.current?.scrollToEnd({ animated: true });
              }, 180);
            }}
            returnKeyType="default"
            maxLength={2000}
          />
          <TouchableOpacity
            style={[
              styles.eventChatSendButton,
              (!message.trim() || sendMutation.isPending) && { opacity: 0.4 },
            ]}
            onPress={handleSend}
            disabled={!message.trim() || sendMutation.isPending}
          >
            <Icon name="send" size={ds.iconSize.md} color={WHITE} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Members modal */}
      <Modal
        visible={membersModalVisible}
        transparent
        animationType="none"
        onRequestClose={closeMembersModal}
      >
        <View style={localStyles.modalOverlay}>
          <Animated.View
            pointerEvents="none"
            style={[
              localStyles.modalBackdrop,
              { opacity: membersBackdropOpacity },
            ]}
          />
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFillObject}
            onPress={closeMembersModal}
          />
          <Animated.View
            style={[
              localStyles.modalCard,
              {
                opacity: membersCardOpacity,
                transform: [
                  { translateY: membersCardTranslateY },
                  { scale: membersCardScale },
                ],
              },
            ]}
          >
            <View style={localStyles.modalHeader}>
              <Text style={localStyles.modalTitle}>Participantes</Text>
              <TouchableOpacity onPress={closeMembersModal}>
                <Icon name="close" size={ds.iconSize.lg} color={DARK_GRAY} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={participants.filter(
                (item) => !blockedUserIds.has(item.userId)
              )}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => {
                const isCreator = item.userId === createdBy;
                const isCurrentUser = item.userId === userId;
                const canKick = isAdmin && item.userId !== userId;
                return (
                  <TouchableOpacity
                    style={localStyles.memberRow}
                    activeOpacity={isCurrentUser ? 1 : 0.85}
                    disabled={isCurrentUser}
                    onPress={() =>
                      handleOpenParticipant({
                        userId: item.userId,
                        displayName: item.displayName,
                        avatarUrl: item.avatarUrl,
                      })
                    }
                  >
                    <Avatar uri={item.avatarUrl} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={localStyles.memberName}>
                        {item.displayName || "Participante"}
                        {isCreator ? " 👑" : ""}
                        {isCurrentUser ? " (vos)" : ""}
                      </Text>
                    </View>
                    {canKick && (
                      <TouchableOpacity
                        onPress={() =>
                          handleKick(item.userId, item.displayName)
                        }
                        onPressOut={() => undefined}
                        style={localStyles.kickButton}
                      >
                        <Text style={localStyles.kickButtonText}>Expulsar</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </Animated.View>
        </View>
      </Modal>

      <UserProfileSheet
        visible={Boolean(selectedParticipant && selectedParticipantCard)}
        profile={selectedParticipantCard}
        onClose={handleCloseParticipant}
        onContactPress={
          canConnectSelectedParticipant ? handleConnectParticipant : undefined
        }
        secondaryActionLabel={
          selectedParticipant?.userId !== userId
            ? "Reportar y bloquear"
            : undefined
        }
        onSecondaryActionPress={
          selectedParticipant?.userId !== userId
            ? handleReportParticipant
            : undefined
        }
        secondaryActionPanelOnly
        secondaryActionDestructive
        showPhotoCounter={false}
      />
    </KeyboardViewport>
  );
};

export default EventChat;

const localStyles = StyleSheet.create({
  keyboardAvoidingRoot: {
    flex: 1,
    backgroundColor: vibesTheme.colors.background,
  },
  headerTitle: {
    ...ds.textStyles.title,
    color: vibesTheme.colors.primaryText,
    letterSpacing: 0.2,
  },
  eventMetaSection: {
    paddingHorizontal: ds.spacing[4],
    paddingTop: ds.spacing[1],
    paddingBottom: ds.spacing[2],
  },
  eventMetaCard: {
    backgroundColor: ds.colors.bg.surfaceTranslucent,
    borderRadius: ds.radii.lg,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[3],
    borderWidth: 1,
    borderColor: ds.colors.border.subtle,
  },
  eventMetaMain: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: ds.spacing[3],
  },
  eventMetaDateBlock: {
    flex: 1,
    gap: ds.spacing[2],
  },
  eventMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[2],
  },
  eventMetaDateText: {
    color: vibesTheme.colors.accentBlue,
    ...ds.textStyles.body,
  },
  eventMetaTimeText: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.body,
  },
  eventMapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ds.spacing[2],
    backgroundColor: PRIMARY_COLOR,
    borderRadius: ds.radii.pill,
    paddingHorizontal: ds.spacing[3],
    paddingVertical: ds.spacing[2],
  },
  eventMapButtonText: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.bodySmall,
  },
  eventLocationText: {
    marginTop: ds.spacing[3],
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.bodySmall,
  },
  eventDescriptionText: {
    marginTop: ds.spacing[2],
    color: TEXT_SECONDARY,
    ...ds.textStyles.bodySmall,
  },
  messagesContentCompact: {
    paddingTop: ds.spacing[2],
  },
  emptyMessages: {
    paddingHorizontal: ds.spacing[6],
    paddingVertical: ds.spacing[5],
    alignItems: "center",
  },
  emptyMessagesTitle: {
    color: DARK_GRAY,
    ...ds.textStyles.title,
    textAlign: "center",
  },
  emptyMessagesText: {
    marginTop: ds.spacing[3],
    color: TEXT_SECONDARY,
    ...ds.textStyles.subtitleMedium,
    textAlign: "center",
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: ds.spacing[2],
    gap: ds.spacing[2],
  },
  messageRowMe: {
    justifyContent: "flex-end",
  },
  messageBubble: {
    maxWidth: "72%",
    borderRadius: ds.radii.lg,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[3],
  },
  messageBubbleMe: {
    alignSelf: "flex-end",
    backgroundColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.medium),
    borderBottomRightRadius: ds.radii.sm,
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.scrim),
    shadowColor: vibesTheme.colors.accentMustard,
    shadowOpacity: /* ds-lint-allow DS-TODO: sombra de color (vibesTheme.colors.accentMustard): ¿glow de marca o ds.shadows? */ 0.14,
    shadowRadius: /* ds-lint-allow DS-TODO: misma sombra de color */ 10,
    shadowOffset: /* ds-lint-allow DS-TODO: misma sombra de color */ { width: 0, height: 6 },
    // Android shadows show through translucent backgrounds.
    elevation: Platform.OS === "android" ? 0 : ds.shadows.sm.elevation,
  },
  messageBubbleOther: {
    alignSelf: "flex-start",
    backgroundColor: WHITE,
    borderBottomLeftRadius: ds.radii.xs,
    ...ds.shadows.sm,
  },
  messageSender: {
    ...ds.textStyles.caption,
    color: vibesTheme.colors.accentBlue,
    marginBottom: ds.spacing[1],
  },
  messageText: {
    ...ds.textStyles.body,
    color: DARK_GRAY,
  },
  messageTime: {
    ...ds.textStyles.micro,
    color: TEXT_SECONDARY,
  },
  messageMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: ds.spacing[1],
    marginTop: ds.spacing[1],
  },
  messageTimeCoach: {
    color: vibesTheme.colors.primaryText,
    opacity: 0.68,
  },
  composerInput: {
    minHeight: COMPOSER_MIN_HEIGHT,
    maxHeight: COMPOSER_MAX_HEIGHT,
    lineHeight: Platform.OS === "ios" ? undefined : COMPOSER_LINE_HEIGHT,
    paddingVertical: COMPOSER_VERTICAL_PADDING,
  },
  moreAvatar: {
    backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.soft),
    justifyContent: "center",
    alignItems: "center",
  },
  moreAvatarText: {
    ...ds.textStyles.micro,
    color: DARK_GRAY,
  },
  // Members modal
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: ds.spacing[5],
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ds.withAlpha(ds.colors.base.ink, ds.opacity.medium),
  },
  modalCard: {
    backgroundColor: WHITE,
    width: "100%",
    maxWidth: 390,
    maxHeight: "74%",
    borderRadius: ds.radii.xl,
    padding: ds.spacing[5],
    paddingBottom: ds.spacing[6],
    ...ds.shadows.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ds.spacing[4],
  },
  modalTitle: {
    ...ds.textStyles.heading,
    color: DARK_GRAY,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ds.spacing[3],
    gap: ds.spacing[3],
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: ds.radii.pill,
  },
  memberName: {
    ...ds.textStyles.subtitle,
    color: DARK_GRAY,
  },
  kickButton: {
    backgroundColor: ds.colors.feedback.errorBg,
    borderRadius: ds.radii.md,
    paddingHorizontal: ds.spacing[3],
    paddingVertical: ds.spacing[2],
  },
  kickButtonText: {
    ...ds.textStyles.caption,
    color: vibesTheme.colors.accentBlue,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: ds.radii.pill,
  },
});
