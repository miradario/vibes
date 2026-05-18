/** @format */

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  Linking,
  Animated,
  Easing,
} from "react-native";
import { useIsFocused, useNavigation, useRoute } from "@react-navigation/native";
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
import UserProfileCard from "../components/UserProfileCard";
import { useAuthSession } from "../src/auth/auth.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";
import { mapCandidateToConnectionProfile } from "../src/lib/connectionProfiles";
import { useSwipeMutation } from "../src/queries/swipes.mutations";
import { handleApiError } from "../src/utils/handleApiError";
import {
  useEventParticipantsQuery,
  useEventMessagesQuery,
  useMarkEventGroupReadMutation,
  useSendEventMessageMutation,
  useDeleteEventMessageMutation,
  useKickParticipantMutation,
  useChallengeParticipantQuery,
  type EventType,
  type EventMessage,
} from "../src/queries/events.queries";
import {
  useChallengeCoachMessagesQuery,
  useDailyChallengeCoachMessageQuery,
  type ChallengeCoachMessage,
} from "../src/queries/challengeCoach.queries";
import { useI18n } from "../src/i18n";

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

type TimelineMessage =
  | ({ kind: "event" } & EventMessage)
  | {
      kind: "coach";
      id: string;
      body: string;
      createdAt: string;
      senderId: "challenge-coach";
      senderName: string;
      senderAvatar: null;
      coachDate: string;
    };

const EventChat = () => {
  const { t, locale } = useI18n();
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const event = (route.params as any)?.event;
  const eventId = event?.id as string | undefined;
  const eventType = (event?.type ?? "event") as EventType;
  const createdBy = event?.createdBy as string | undefined;
  const eventStartsAt = parseEventDate(event?.startsAt);
  const eventLocation =
    typeof event?.location === "string" && event.location.trim()
      ? event.location.trim()
      : null;

  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  const isAdmin = Boolean(userId && createdBy && userId === createdBy);
  const swipeMutation = useSwipeMutation();
  const challengeParticipantQuery = useChallengeParticipantQuery(
    eventType === "challenge" ? eventId : undefined,
    userId,
  );
  const { data: dailyCoachMessage, isLoading: coachMessageLoading } =
    useDailyChallengeCoachMessageQuery(
      eventType === "challenge" && eventId
        ? {
            challengeId: eventId,
            title: event?.title ?? "Desafío",
            subtitle: event?.subtitle ?? event?.description ?? null,
            durationDays:
              typeof event?.durationDays === "number" ? event.durationDays : null,
            startsAt: event?.startsAt ?? null,
            participant: challengeParticipantQuery.data ?? null,
            locale,
          }
        : null,
      userId,
    );
  const { data: coachHistory = [], isLoading: coachHistoryLoading } =
    useChallengeCoachMessagesQuery(
      eventType === "challenge" ? eventId : undefined,
      userId,
    );

  const { data: participants = [] } = useEventParticipantsQuery(eventId);
  const {
    data: messages = [],
    isLoading: messagesLoading,
    error: messagesError,
  } =
    useEventMessagesQuery(eventId);
  const markReadMutation = useMarkEventGroupReadMutation();
  const sendMutation = useSendEventMessageMutation();
  const deleteMutation = useDeleteEventMessageMutation();
  const kickMutation = useKickParticipantMutation();

  const [message, setMessage] = useState("");
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [messagesLoadingTimedOut, setMessagesLoadingTimedOut] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<{
    userId: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null>(null);
  const [participantSheetVisible, setParticipantSheetVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const membersBackdropOpacity = useRef(new Animated.Value(0)).current;
  const membersCardOpacity = useRef(new Animated.Value(0)).current;
  const membersCardScale = useRef(new Animated.Value(0.92)).current;
  const membersCardTranslateY = useRef(new Animated.Value(22)).current;
  const participantBackdropOpacity = useRef(new Animated.Value(0)).current;
  const participantSheetTranslateY = useRef(new Animated.Value(48)).current;
  const participantSheetScale = useRef(new Animated.Value(0.96)).current;
  const lastMarkedReadAtRef = useRef<string | null>(null);
  const { data: selectedParticipantProfile } = useProfileQuery(
    selectedParticipant?.userId,
  );
  const { data: selectedParticipantPreferences } = useUserPreferencesQuery(
    selectedParticipant?.userId,
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
        photos:
          selectedParticipantProfile?.photos ??
          (selectedParticipant.avatarUrl ? [selectedParticipant.avatarUrl] : []),
      })
    : null;
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
              { profile: participantCard } as never,
            );
          }
        },
        onError: (error) =>
          handleApiError(error, { toastTitle: "Error de conexión" }),
      },
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

  const animateParticipantSheetIn = useCallback(() => {
    participantBackdropOpacity.setValue(0);
    participantSheetTranslateY.setValue(48);
    participantSheetScale.setValue(0.96);

    Animated.parallel([
      Animated.timing(participantBackdropOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(participantSheetTranslateY, {
        toValue: 0,
        damping: 18,
        stiffness: 190,
        mass: 0.9,
        useNativeDriver: true,
      }),
      Animated.spring(participantSheetScale, {
        toValue: 1,
        damping: 16,
        stiffness: 200,
        mass: 0.85,
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    participantBackdropOpacity,
    participantSheetScale,
    participantSheetTranslateY,
  ]);

  const handleOpenParticipant = useCallback(
    (nextParticipant: {
      userId: string;
      displayName: string | null;
      avatarUrl: string | null;
    }) => {
      if (nextParticipant.userId === userId) return;
      setSelectedParticipant(nextParticipant);
      setParticipantSheetVisible(true);
      requestAnimationFrame(() => {
        animateParticipantSheetIn();
      });
    },
    [animateParticipantSheetIn, userId],
  );

  const handleCloseParticipant = useCallback(() => {
    Animated.parallel([
      Animated.timing(participantBackdropOpacity, {
        toValue: 0,
        duration: 160,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(participantSheetTranslateY, {
        toValue: 28,
        duration: 160,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(participantSheetScale, {
        toValue: 0.985,
        duration: 160,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setParticipantSheetVisible(false);
        setSelectedParticipant(null);
      }
    });
  }, [
    participantBackdropOpacity,
    participantSheetScale,
    participantSheetTranslateY,
  ]);

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
    const coachMap = new Map<string, ChallengeCoachMessage>();
    for (const item of coachHistory) {
      coachMap.set(item.id, item);
    }
    if (dailyCoachMessage) {
      coachMap.set(dailyCoachMessage.id, dailyCoachMessage);
    }

    const coachTimeline: TimelineMessage[] = Array.from(coachMap.values()).map((item) => ({
      kind: "coach",
      id: item.id,
      body: item.body,
      createdAt: item.createdAt,
      senderId: "challenge-coach",
      senderName: t("common.challengeGuideName"),
      senderAvatar: null,
      coachDate: item.messageDate,
    }));

    const eventTimeline: TimelineMessage[] = messages.map((item) => ({
      ...item,
      kind: "event",
    }));

    return [...eventTimeline, ...coachTimeline].sort(
      (left, right) =>
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    );
  }, [coachHistory, dailyCoachMessage, messages, t]);

  useEffect(() => {
    if (timelineMessages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [timelineMessages.length]);

  useEffect(() => {
    if (!isFocused || !eventId || messages.length === 0 || markReadMutation.isPending) {
      return;
    }

    const latestMessage = messages[messages.length - 1];
    if (!latestMessage?.createdAt) return;
    if (lastMarkedReadAtRef.current === latestMessage.createdAt) return;

    lastMarkedReadAtRef.current = latestMessage.createdAt;
    markReadMutation.mutate({
      eventId,
      eventType,
      readAt: latestMessage.createdAt,
    });
  }, [eventId, eventType, isFocused, markReadMutation, messages]);

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
        err?.message ?? "No se pudo enviar el mensaje.",
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
      const canDelete = msg.senderId === userId || isAdmin;
      if (!canDelete) return;

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
    [eventId, userId, isAdmin, deleteMutation],
  );

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
        ],
      );
    },
    [eventId, eventType, kickMutation],
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

    try {
      for (const url of candidateUrls) {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          return;
        }
      }

      Alert.alert("Mapa", "No se pudo abrir el mapa.");
    } catch {
      Alert.alert("Mapa", "No se pudo abrir el mapa.");
    }
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
    [messages, participants],
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.eventChatBackground}>
        <AppHeader
          title={event?.title || "Evento"}
          showBack
          onBack={() => navigation.goBack()}
          style={styles.eventChatHeader}
          titleStyle={[styles.eventChatHeaderTitle, localStyles.headerTitle]}
          right={
            <TouchableOpacity
              style={styles.eventChatMenuButton}
              onPress={openMembersModal}
            >
              <Icon name="people" size={24} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          }
        />

        {eventType !== "challenge" ? (
          <View style={localStyles.eventMetaSection}>
            <View style={localStyles.eventMetaCard}>
              <View style={localStyles.eventMetaMain}>
                <View style={localStyles.eventMetaDateBlock}>
                  <View style={localStyles.eventMetaLine}>
                    <Icon name="calendar" size={15} color={PRIMARY_COLOR} />
                    <Text style={localStyles.eventMetaDateText}>
                      {formatEventChatDate(eventStartsAt)}
                    </Text>
                  </View>
                  <View style={localStyles.eventMetaLine}>
                    <Icon name="time" size={15} color={PRIMARY_COLOR} />
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
                    <Icon name="location" size={15} color={WHITE} />
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
                <Text style={localStyles.eventDescriptionText} numberOfLines={2}>
                  {event.description}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        <ScrollView
          ref={scrollRef}
          style={styles.eventChatMessagesContainer}
          contentContainerStyle={[
            styles.eventChatMessagesContent,
            localStyles.messagesContentCompact,
          ]}
          showsVerticalScrollIndicator={false}
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
            <VibesLoader size={72} style={{ marginVertical: 32 }} />
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
              const isCoach = msg.kind === "coach";
              const isMe = !isCoach && msg.senderId === userId;
              const sender = isCoach
                ? { name: msg.senderName, avatar: null }
                : getSenderInfo(msg.senderId);
              return (
                <TouchableOpacity
                  key={msg.id}
                  activeOpacity={isMe ? 0.7 : 0.82}
                  onPress={() => {
                    if (isMe || isCoach) return;
                    handleOpenParticipant({
                      userId: msg.senderId,
                      displayName: sender.name,
                      avatarUrl: sender.avatar,
                    });
                  }}
                  onLongPress={() => {
                    if (msg.kind === "event") handleLongPressMessage(msg);
                  }}
                  style={[
                    localStyles.messageRow,
                    isMe && localStyles.messageRowMe,
                  ]}
                >
                  {/* Avatar for other people's messages */}
                  {!isMe &&
                    (isCoach ? (
                      <View style={localStyles.coachAvatar}>
                        <Icon name="sparkles-outline" size={15} color={WHITE} />
                      </View>
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => openParticipantCard(msg.senderId)}
                      >
                        <Avatar uri={sender.avatar} size={28} />
                      </TouchableOpacity>
                    ))}
                  <View
                    style={[
                      localStyles.messageBubble,
                      isMe
                        ? localStyles.messageBubbleMe
                        : isCoach
                          ? localStyles.messageBubbleCoach
                        : localStyles.messageBubbleOther,
                    ]}
                  >
                    {!isMe && (
                      <TouchableOpacity
                        activeOpacity={isCoach ? 1 : 0.85}
                        onPress={() => {
                          if (isCoach) return;
                          openParticipantCard(msg.senderId);
                        }}
                      >
                        <Text
                          style={[
                            localStyles.messageSender,
                            isCoach && localStyles.messageSenderCoach,
                          ]}
                        >
                          {sender.name || "Participante"}
                        </Text>
                      </TouchableOpacity>
                    )}
                    <Text
                      style={[
                        localStyles.messageText,
                        isMe && { color: DARK_GRAY },
                      ]}
                    >
                      {msg.body}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        <View
          style={[
            styles.eventChatInputContainer,
            {
              paddingTop: 10,
              paddingBottom: Math.max(insets.bottom + 14, 24),
            },
          ]}
        >
          <Avatar
            uri={userId ? participantMap.current[userId]?.avatar : null}
            size={32}
          />
          <TextInput
            style={styles.eventChatInput}
            placeholder="Escribir mensaje..."
            placeholderTextColor={TEXT_SECONDARY}
            value={message}
            onChangeText={setMessage}
            onSubmitEditing={handleSend}
            returnKeyType="send"
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
            <Icon name="send" size={20} color={WHITE} />
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
              <Text style={localStyles.modalTitle}>
                Participantes ({participants.length})
              </Text>
              <TouchableOpacity onPress={closeMembersModal}>
                <Icon name="close" size={24} color={DARK_GRAY} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={participants.filter((item) => !userId || item.userId !== userId)}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => {
                const isCreator = item.userId === createdBy;
                const canKick = isAdmin && item.userId !== userId;
                return (
                  <TouchableOpacity
                    style={localStyles.memberRow}
                    activeOpacity={0.85}
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

      <Modal
        visible={participantSheetVisible}
        transparent
        animationType="none"
        onRequestClose={handleCloseParticipant}
      >
        <View style={styles.discoverSheetRoot}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.discoverSheetBackdrop,
              { opacity: participantBackdropOpacity },
            ]}
          />
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFillObject}
            onPress={handleCloseParticipant}
          />
          <TouchableOpacity
            style={styles.discoverSheetCloseButton}
            onPress={handleCloseParticipant}
            activeOpacity={0.9}
          >
            <Icon name="close" size={20} color="#2B2B2B" />
          </TouchableOpacity>
          <Animated.View
            style={[
              styles.discoverSheetContainer,
              localStyles.participantSheetAnimated,
              {
                opacity: participantBackdropOpacity,
                transform: [
                  { translateY: participantSheetTranslateY },
                  { scale: participantSheetScale },
                ],
              },
            ]}
          >
            <View style={styles.discoverSheetHandle} />
            {selectedParticipantCard ? (
              <UserProfileCard
                profile={selectedParticipantCard}
                onContactPress={handleConnectParticipant}
              />
            ) : (
              <View style={localStyles.participantSheetLoading}>
                <VibesLoader size={64} />
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default EventChat;

const localStyles = StyleSheet.create({
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
    letterSpacing: 0.2,
  },
  eventMetaSection: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
  },
  eventMetaCard: {
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.06)",
  },
  eventMetaMain: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  eventMetaDateBlock: {
    flex: 1,
    gap: 6,
  },
  eventMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eventMetaDateText: {
    color: PRIMARY_COLOR,
    fontSize: 15,
    fontWeight: "700",
  },
  eventMetaTimeText: {
    color: "#444",
    fontSize: 15,
    fontWeight: "600",
  },
  eventMapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  eventMapButtonText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "700",
  },
  eventLocationText: {
    marginTop: 10,
    color: "#444",
    fontSize: 13,
    lineHeight: 18,
  },
  eventDescriptionText: {
    marginTop: 8,
    color: TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 18,
  },
  messagesContentCompact: {
    paddingTop: 8,
  },
  emptyMessages: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyMessagesTitle: {
    color: DARK_GRAY,
    fontSize: 22,
    fontFamily: "CormorantGaramond_600SemiBold",
    textAlign: "center",
  },
  emptyMessagesText: {
    marginTop: 10,
    color: TEXT_SECONDARY,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "CormorantGaramond_500Medium",
    textAlign: "center",
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 8,
    gap: 8,
  },
  messageRowMe: {
    justifyContent: "flex-end",
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginBottom: 2,
  },
  coachAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginBottom: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2C98E",
  },
  messageBubble: {
    maxWidth: "72%",
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  messageBubbleMe: {
    alignSelf: "flex-end",
    backgroundColor: "#FFF3E2",
    borderBottomRightRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.30)",
    shadowColor: "#D9B07B",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  messageBubbleOther: {
    alignSelf: "flex-start",
    backgroundColor: WHITE,
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  messageBubbleCoach: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF9F1",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.24)",
  },
  messageSender: {
    fontSize: 12,
    fontFamily: "CormorantGaramond_700Bold",
    color: PRIMARY_COLOR,
    marginBottom: 2,
  },
  messageSenderCoach: {
    color: "#2B2B2B",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: "CormorantGaramond_600SemiBold",
    color: DARK_GRAY,
  },
  messageTime: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  messageTimeCoach: {
    color: "#2B2B2B",
    opacity: 0.68,
  },
  moreAvatar: {
    backgroundColor: "#F0EDE8",
    justifyContent: "center",
    alignItems: "center",
  },
  moreAvatarText: {
    fontSize: 11,
    fontFamily: "CormorantGaramond_700Bold",
    color: DARK_GRAY,
  },
  // Members modal
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(43, 43, 43, 0.22)",
  },
  modalCard: {
    backgroundColor: WHITE,
    width: "100%",
    maxWidth: 390,
    maxHeight: "74%",
    borderRadius: 28,
    padding: 20,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 18 },
    elevation: 14,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "CormorantGaramond_700Bold",
    color: DARK_GRAY,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  memberName: {
    fontSize: 16,
    fontFamily: "CormorantGaramond_600SemiBold",
    color: DARK_GRAY,
  },
  kickButton: {
    backgroundColor: "#FFE8E8",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  kickButtonText: {
    fontSize: 12,
    fontFamily: "CormorantGaramond_600SemiBold",
    color: "#D32F2F",
  },
  participantSheetAnimated: {
    overflow: "hidden",
  },
  participantSheetLoading: {
    minHeight: 360,
    alignItems: "center",
    justifyContent: "center",
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});
