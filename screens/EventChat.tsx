/** @format */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import styles, { TEXT_SECONDARY, WHITE, PRIMARY_COLOR, DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  useEventParticipantsQuery,
  useEventMessagesQuery,
  useSendEventMessageMutation,
  useDeleteEventMessageMutation,
  useKickParticipantMutation,
  type EventType,
  type EventMessage,
} from "../src/queries/events.queries";

const LOGO = require("../assets/images/logo.png");

const EventChat = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const event = (route.params as any)?.event;
  const eventId = event?.id as string | undefined;
  const eventType = (event?.type ?? "event") as EventType;
  const createdBy = event?.createdBy as string | undefined;

  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  const isAdmin = Boolean(userId && createdBy && userId === createdBy);

  const { data: participants = [] } = useEventParticipantsQuery(eventId);
  const { data: messages = [], isLoading: messagesLoading } = useEventMessagesQuery(eventId);
  const sendMutation = useSendEventMessageMutation();
  const deleteMutation = useDeleteEventMessageMutation();
  const kickMutation = useKickParticipantMutation();

  const [message, setMessage] = useState("");
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Build a lookup for sender info from participants
  const participantMap = useRef<Record<string, { name: string | null; avatar: string | null }>>({});
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

  const handleSend = async () => {
    const body = message.trim();
    if (!body || !eventId || !userId) {
      console.log("[EventChat] Send blocked:", { body: !!body, eventId, userId });
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
      Alert.alert("Error al enviar", err?.message ?? "No se pudo enviar el mensaje.");
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.eventChatBackground}>
        <View style={styles.eventChatHeader}>
          <TouchableOpacity
            style={styles.eventChatBackButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="chevron-back" size={24} color={TEXT_SECONDARY} />
          </TouchableOpacity>
          <View style={styles.eventChatHeaderInfo}>
            <Image source={LOGO} style={styles.eventChatHeaderLogo} />
            <View>
              <Text style={styles.eventChatHeaderTitle}>
                {event?.title || "Evento"}
              </Text>
              <Text style={styles.eventChatHeaderSubtitle}>
                {participants.length} participante{participants.length !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.eventChatMenuButton}
            onPress={() => setMembersModalVisible(true)}
          >
            <Icon name="people" size={24} color={TEXT_SECONDARY} />
          </TouchableOpacity>
        </View>

        <View style={styles.eventChatParticipantsSection}>
          <View style={styles.eventChatParticipants}>
            {participants.slice(0, 8).map((participant, index) => (
              <Image
                key={participant.id}
                source={
                  participant.avatarUrl
                    ? { uri: participant.avatarUrl }
                    : LOGO
                }
                style={[
                  styles.eventChatParticipantAvatar,
                  index > 0 && { marginLeft: -15 },
                ]}
              />
            ))}
            {participants.length > 8 && (
              <View style={[styles.eventChatParticipantAvatar, localStyles.moreAvatar, { marginLeft: -15 }]}>
                <Text style={localStyles.moreAvatarText}>+{participants.length - 8}</Text>
              </View>
            )}
          </View>
          <Text style={styles.eventChatDescription}>
            Este es el espacio del evento.{"\n"}
            Usalo para coordinar, compartir{"\n"}y llegar con presencia.
          </Text>
          <View style={styles.eventChatTags}>
            <View style={styles.eventChatTag}>
              <Text style={styles.eventChatTagIcon}>🌿</Text>
              <Text style={styles.eventChatTagText}>Escucha</Text>
            </View>
            <View style={styles.eventChatTag}>
              <Text style={styles.eventChatTagIcon}>🙏</Text>
              <Text style={styles.eventChatTagText}>Respeto</Text>
            </View>
            <View style={styles.eventChatTag}>
              <Text style={styles.eventChatTagIcon}>🧘</Text>
              <Text style={styles.eventChatTagText}>Presencia</Text>
            </View>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.eventChatMessagesContainer}
          contentContainerStyle={styles.eventChatMessagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messagesLoading ? (
            <ActivityIndicator color={PRIMARY_COLOR} style={{ marginVertical: 32 }} />
          ) : messages.length === 0 ? (
            <View style={localStyles.emptyMessages}>
              <Text style={localStyles.emptyMessagesTitle}>Aún no hay mensajes</Text>
              <Text style={localStyles.emptyMessagesText}>
                Sé el primero en romper el hielo 🧊
              </Text>
            </View>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === userId;
              const sender = getSenderInfo(msg.senderId);
              return (
                <TouchableOpacity
                  key={msg.id}
                  activeOpacity={0.7}
                  onLongPress={() => handleLongPressMessage(msg)}
                  style={[
                    localStyles.messageRow,
                    isMe && localStyles.messageRowMe,
                  ]}
                >
                  {/* Avatar for other people's messages */}
                  {!isMe && (
                    <Image
                      source={sender.avatar ? { uri: sender.avatar } : LOGO}
                      style={localStyles.messageAvatar}
                    />
                  )}
                  <View
                    style={[
                      localStyles.messageBubble,
                      isMe ? localStyles.messageBubbleMe : localStyles.messageBubbleOther,
                    ]}
                  >
                    {!isMe && (
                      <Text style={localStyles.messageSender}>
                        {sender.name || "Participante"}
                      </Text>
                    )}
                    <Text style={[localStyles.messageText, isMe && { color: WHITE }]}>
                      {msg.body}
                    </Text>
                    <Text
                      style={[
                        localStyles.messageTime,
                        isMe && { color: "rgba(255,255,255,0.7)" },
                      ]}
                    >
                      {formatTime(msg.createdAt)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        <View style={styles.eventChatInputContainer}>
          <Image
            source={
              userId && participantMap.current[userId]?.avatar
                ? { uri: participantMap.current[userId].avatar! }
                : LOGO
            }
            style={localStyles.inputAvatar}
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
        animationType="slide"
        onRequestClose={() => setMembersModalVisible(false)}
      >
        <View style={localStyles.modalOverlay}>
          <View style={localStyles.modalCard}>
            <View style={localStyles.modalHeader}>
              <Text style={localStyles.modalTitle}>
                Participantes ({participants.length})
              </Text>
              <TouchableOpacity onPress={() => setMembersModalVisible(false)}>
                <Icon name="close" size={24} color={DARK_GRAY} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={participants}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => {
                const isCreator = item.userId === createdBy;
                const canKick = isAdmin && item.userId !== userId;
                return (
                  <View style={localStyles.memberRow}>
                    <Image
                      source={item.avatarUrl ? { uri: item.avatarUrl } : LOGO}
                      style={localStyles.memberAvatar}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={localStyles.memberName}>
                        {item.displayName || "Participante"}
                        {isCreator ? " 👑" : ""}
                      </Text>
                    </View>
                    {canKick && (
                      <TouchableOpacity
                        onPress={() => handleKick(item.userId, item.displayName)}
                        style={localStyles.kickButton}
                      >
                        <Text style={localStyles.kickButtonText}>Expulsar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default EventChat;

const localStyles = StyleSheet.create({
  emptyMessages: {
    paddingHorizontal: 24,
    paddingVertical: 32,
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
  messageBubble: {
    maxWidth: "72%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageBubbleMe: {
    alignSelf: "flex-end",
    backgroundColor: PRIMARY_COLOR,
    borderBottomRightRadius: 4,
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
  messageSender: {
    fontSize: 12,
    fontFamily: "CormorantGaramond_700Bold",
    color: PRIMARY_COLOR,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 15,
    fontFamily: "CormorantGaramond_500Medium",
    color: DARK_GRAY,
  },
  messageTime: {
    fontSize: 10,
    color: TEXT_SECONDARY,
    marginTop: 4,
    alignSelf: "flex-end",
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
    backgroundColor: "rgba(43, 43, 43, 0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
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
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});
