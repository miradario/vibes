/** @format */

import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
} from "react-native";
import { useIsFocused, useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components";
import AppHeader from "../components/AppHeader";
import Avatar from "../components/Avatar";
import AnimatedSheetModal from "../components/AnimatedSheetModal";
import UserProfileSheet from "../components/UserProfileSheet";
import styles, { DARK_GRAY } from "../assets/styles";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  useDirectMessagesQuery,
  useMarkDirectMessagesReadMutation,
  useSendDirectMessageMutation,
  useDeleteDirectMessageMutation,
  useReportUserMutation,
  useUnmatchMutation,
  type ReportReason,
  type DirectMessage,
} from "../src/queries/matches.queries";
import { mapCandidateToConnectionProfile } from "../src/lib/connectionProfiles";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";
import { vibesTheme } from "../src/theme/vibesTheme";
import VibesLoader from "../components/VibesLoader";

const REPORT_REASONS: ReportReason[] = [
  "Spam o contenido irrelevante",
  "Lenguaje ofensivo",
  "Acoso o incomodidad",
  "Contenido inapropiado",
  "Perfil falso o engañoso",
];

const Chat = () => {
  const navigation = useNavigation();
  const route = useRoute() as any;
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { matchId, otherUserId, otherUserName, otherUserPhoto } =
    route?.params ?? {};

  // Estado para mostrar CardItem modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { data: profile } = useProfileQuery(otherUserId);
  const { data: preferences } = useUserPreferencesQuery(otherUserId);
  const profileCard = mapCandidateToConnectionProfile({
    id: otherUserId ?? matchId ?? "chat-user",
    displayName:
      profile?.displayName ??
      profile?.display_name ??
      profile?.name ??
      otherUserName ??
      "Chat",
    photos:
      profile?.photos ??
      (otherUserPhoto ? [otherUserPhoto] : []),
    ...profile,
    ...(preferences ?? {}),
  });

  const { data: session } = useAuthSession();
  const myId = session?.user?.id;

  const { data: messages, isLoading } = useDirectMessagesQuery(matchId);
  const markReadMutation = useMarkDirectMessagesReadMutation();
  const sendMutation = useSendDirectMessageMutation();
  const deleteMutation = useDeleteDirectMessageMutation();
  const unmatchMutation = useUnmatchMutation();
  const reportMutation = useReportUserMutation();

  const [text, setText] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportReason, setSelectedReportReason] =
    useState<ReportReason | null>(null);
  const [reportDetails, setReportDetails] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const lastMarkedReadAtRef = useRef<string | null>(null);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages?.length]);

  useEffect(() => {
    if (!isFocused || !matchId || !messages?.length || markReadMutation.isPending) return;

    const latestMessage = messages[messages.length - 1];
    if (!latestMessage?.createdAt) return;
    if (lastMarkedReadAtRef.current === latestMessage.createdAt) return;

    lastMarkedReadAtRef.current = latestMessage.createdAt;

    markReadMutation.mutate({
      matchId,
      readAt: latestMessage.createdAt,
    });
  }, [isFocused, markReadMutation, matchId, messages]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardHeight(event.endCoordinates.height);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 80);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleSend = () => {
    const body = text.trim();
    if (!body || !matchId) return;
    setText("");
    sendMutation.mutate(
      { matchId, body },
      {
        onError: (err) => {
          Alert.alert("Error", err.message || "No se pudo enviar el mensaje");
        },
      },
    );
  };

  const handleLongPress = (msg: DirectMessage) => {
    if (msg.senderId !== myId) return;
    Alert.alert("¿Eliminar mensaje?", msg.text.slice(0, 60), [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () =>
          deleteMutation.mutate({ messageId: msg.id, matchId: msg.matchId }),
      },
    ]);
  };

  const handleAbandonConnection = () => {
    setShowActionsModal(false);
    if (!matchId) return;

    Alert.alert(
      "Abandonar conexión",
      "Se eliminará esta conexión y ya no vas a poder ver este chat.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Abandonar",
          style: "destructive",
          onPress: () => {
            unmatchMutation.mutate(matchId, {
              onSuccess: () => navigation.goBack(),
              onError: (err) =>
                Alert.alert(
                  "Error",
                  err.message || "No se pudo abandonar la conexión.",
                ),
            });
          },
        },
      ],
    );
  };

  const openReportModal = () => {
    setShowActionsModal(false);
    setShowReportModal(true);
  };

  const closeReportModal = () => {
    setShowReportModal(false);
    setSelectedReportReason(null);
    setReportDetails("");
  };

  const submitReport = () => {
    if (!otherUserId || !selectedReportReason) return;

    reportMutation.mutate(
      {
        reportedUserId: String(otherUserId),
        matchId,
        reason: selectedReportReason,
        details: reportDetails,
      },
      {
        onSuccess: () => {
          if (!matchId) {
            closeReportModal();
            Alert.alert("Reporte enviado", "Gracias por contarnos qué pasó.");
            return;
          }

          unmatchMutation.mutate(matchId, {
            onSuccess: () => {
              closeReportModal();
              Alert.alert(
                "Reporte enviado",
                "Gracias por contarnos qué pasó. También quitamos esta conexión.",
                [{ text: "OK", onPress: () => navigation.goBack() }],
              );
            },
            onError: (err) => {
              closeReportModal();
              Alert.alert(
                "Reporte enviado",
                err.message ||
                  "El reporte fue enviado, pero no se pudo quitar la conexión.",
              );
            },
          });
        },
        onError: (err) =>
          Alert.alert("Error", err.message || "No se pudo enviar el reporte."),
      },
    );
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = ({ item }: { item: DirectMessage }) => {
    const isOwn = item.senderId === myId;
    const bubble = (
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => handleLongPress(item)}
        style={[
          isOwn ? styles.chatBubbleRight : styles.chatBubbleLeft,
          localStyles.messageBubble,
        ]}
      >
        <Text
          style={isOwn ? styles.chatBubbleTextRight : styles.chatBubbleTextLeft}
        >
          {item.text}
        </Text>
        <Text
          style={[
            localStyles.msgTime,
            isOwn ? localStyles.msgTimeRight : localStyles.msgTimeLeft,
          ]}
        >
          {formatTime(item.createdAt)}
        </Text>
      </TouchableOpacity>
    );

    if (isOwn) {
      return <View style={localStyles.ownMessageRow}>{bubble}</View>;
    }

    return (
      <View style={localStyles.incomingMessageRow}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setShowProfileModal(true)}
        >
          <Avatar uri={otherUserPhoto} size={28} />
        </TouchableOpacity>
        {bubble}
      </View>
    );
  };

  const matchDate = messages?.[0]?.createdAt;

  return (
    <KeyboardAvoidingView
      style={styles.bg}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? Math.max(insets.top + 8, 24) : 0}
    >
      <AppHeader
        showBack
        onBack={() => navigation.goBack()}
        style={styles.chatHeader}
        right={
          <TouchableOpacity onPress={() => setShowActionsModal(true)}>
            <Icon name="ellipsis-horizontal" size={20} color={DARK_GRAY} />
          </TouchableOpacity>
        }
      >
        <TouchableOpacity style={styles.chatHeaderCenter} onPress={() => setShowProfileModal(true)}>
          <Avatar uri={otherUserPhoto} size={32} />
          <Text style={styles.chatName}>
            {(() => {
              const name = profile?.display_name || profile?.name || otherUserName || "Chat";
              let age = "";
              if (profile?.birth_date) {
                const birthYear = new Date(profile.birth_date).getFullYear();
                const thisYear = new Date().getFullYear();
                age = String(thisYear - birthYear);
              }
              return age ? `${name}, ${age}` : name;
            })()}
          </Text>
        </TouchableOpacity>
      </AppHeader>
      <UserProfileSheet
        visible={showProfileModal}
        profile={profileCard}
        onClose={() => setShowProfileModal(false)}
      />

      <Modal
        transparent
        animationType="fade"
        visible={showActionsModal}
        onRequestClose={() => setShowActionsModal(false)}
      >
        <Pressable
          style={localStyles.modalBackdrop}
          onPress={() => setShowActionsModal(false)}
        >
          <Pressable style={localStyles.actionsSheet} onPress={() => undefined}>
            <Text style={localStyles.modalTitle}>Opciones de conexión</Text>
            <TouchableOpacity
              style={localStyles.actionRow}
              onPress={handleAbandonConnection}
              disabled={unmatchMutation.isPending}
            >
              <Icon name="close-circle-outline" size={21} color="#D88C7A" />
              <Text style={[localStyles.actionText, localStyles.dangerText]}>
                Abandonar conexión
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={localStyles.actionRow}
              onPress={openReportModal}
            >
              <Icon name="flag-outline" size={21} color={DARK_GRAY} />
              <Text style={localStyles.actionText}>Reportar persona</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <AnimatedSheetModal
        visible={showReportModal}
        onClose={closeReportModal}
        offsetY={320}
        sheetStyle={[
          localStyles.reportSheet,
          { paddingBottom: Math.max(insets.bottom + 20, 30) },
        ]}
      >
          <Pressable onPress={() => undefined}>
            <Text style={localStyles.modalTitle}>¿Por qué querés reportar?</Text>
            <Text style={localStyles.modalSubtitle}>
              Tu reporte nos ayuda a cuidar la comunidad.
            </Text>

            {REPORT_REASONS.map((reason) => {
              const selected = selectedReportReason === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  style={[
                    localStyles.reasonRow,
                    selected && localStyles.reasonRowSelected,
                  ]}
                  onPress={() => setSelectedReportReason(reason)}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      localStyles.radio,
                      selected && localStyles.radioSelected,
                    ]}
                  >
                    {selected ? <View style={localStyles.radioDot} /> : null}
                  </View>
                  <Text style={localStyles.reasonText}>{reason}</Text>
                </TouchableOpacity>
              );
            })}

            <TextInput
              style={localStyles.reportInput}
              placeholder="Contanos qué pasó..."
              placeholderTextColor="#999"
              value={reportDetails}
              onChangeText={setReportDetails}
              multiline
              textAlignVertical="top"
              maxLength={800}
            />

            <TouchableOpacity
              style={[
                localStyles.reportButton,
                (!selectedReportReason ||
                  reportMutation.isPending ||
                  unmatchMutation.isPending) &&
                  localStyles.reportButtonDisabled,
              ]}
              disabled={
                !selectedReportReason ||
                reportMutation.isPending ||
                unmatchMutation.isPending
              }
              onPress={submitReport}
              activeOpacity={0.9}
            >
              <Text style={localStyles.reportButtonText}>
                {reportMutation.isPending || unmatchMutation.isPending
                  ? "Enviando..."
                  : "Enviar reporte"}
              </Text>
            </TouchableOpacity>
          </Pressable>
      </AnimatedSheetModal>

      <View style={localStyles.chatBody}>
        {/* Messages */}
        {isLoading ? (
          <View style={localStyles.loadingWrap}>
            <VibesLoader size={78} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages ?? []}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            contentContainerStyle={[
              localStyles.messageList,
              {
                paddingBottom:
                  Platform.OS === "android" && keyboardHeight > 0
                    ? keyboardHeight + 88
                    : Math.max(insets.bottom + 28, 44),
              },
            ]}
            ListHeaderComponent={
              <Text style={styles.chatMatchedText}>
                Conectaste con {otherUserName || "esta persona"}
                {matchDate
                  ? ` el ${new Date(matchDate).toLocaleDateString()}`
                  : ""}
                .
              </Text>
            }
            ListEmptyComponent={
              <View style={localStyles.emptyWrap}>
                <Text style={localStyles.emptyText}>
                  Saludá a {otherUserName || "tu conexión"}.
                </Text>
              </View>
            }
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
          />
        )}

        {/* Input */}
        <View
          style={[
            styles.chatInputBar,
            {
              paddingBottom: Math.max(insets.bottom + 12, 20),
              marginBottom:
                Platform.OS === "android" && keyboardHeight > 0
                  ? keyboardHeight
                  : 0,
            },
          ]}
        >
          <TextInput
            style={localStyles.input}
            placeholder="Escribí un mensaje..."
            placeholderTextColor="#999"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
            returnKeyType="default"
            onFocus={() =>
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 120)
            }
          />
          <TouchableOpacity onPress={handleSend} disabled={!text.trim()}>
            <Text style={[styles.chatSend, !text.trim() && { opacity: 0.4 }]}>
              ENVIAR
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default Chat;

const localStyles = StyleSheet.create({
  chatBody: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    flexGrow: 1,
  },
  incomingMessageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  ownMessageRow: {
    alignItems: "flex-end",
    marginBottom: 12,
  },
  messageBubble: {
    marginBottom: 0,
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
    marginBottom: 4,
  },
  msgTime: {
    fontSize: 10,
    marginTop: 4,
  },
  msgTimeRight: {
    color: "rgba(0,0,0,0.35)",
    textAlign: "right",
  },
  msgTimeLeft: {
    color: "rgba(0,0,0,0.35)",
  },
  input: {
    flex: 1,
    color: "#2B2B2B",
    fontSize: 14,
    maxHeight: 80,
    marginRight: 8,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 180,
  },
  emptyText: {
    color: "#AEBFD1",
    fontSize: 16,
    fontFamily: vibesTheme.fonts.medium,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(43, 43, 43, 0.34)",
  },
  actionsSheet: {
    marginHorizontal: 16,
    marginBottom: 18,
    borderRadius: 22,
    backgroundColor: "#F6F6F4",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    shadowColor: "#2B2B2B",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  reportSheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: "#F6F6F4",
    paddingHorizontal: 20,
    paddingTop: 22,
    shadowColor: "#2B2B2B",
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -8 },
    elevation: 10,
  },
  modalTitle: {
    color: DARK_GRAY,
    fontSize: 22,
    lineHeight: 27,
    fontFamily: vibesTheme.fonts.bold,
  },
  modalSubtitle: {
    marginTop: 4,
    marginBottom: 14,
    color: "#6E6E6E",
    fontSize: 15,
    lineHeight: 21,
    fontFamily: vibesTheme.fonts.medium,
  },
  actionRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(43, 43, 43, 0.08)",
  },
  actionText: {
    color: DARK_GRAY,
    fontSize: 17,
    fontFamily: vibesTheme.fonts.semibold,
  },
  dangerText: {
    color: "#D88C7A",
  },
  reasonRow: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.52)",
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.07)",
  },
  reasonRowSelected: {
    backgroundColor: "rgba(228, 183, 110, 0.14)",
    borderColor: "rgba(228, 183, 110, 0.52)",
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.24)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  radioSelected: {
    borderColor: "#E4B76E",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E4B76E",
  },
  reasonText: {
    flex: 1,
    color: DARK_GRAY,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.medium,
  },
  reportInput: {
    minHeight: 96,
    maxHeight: 140,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
    color: DARK_GRAY,
    fontSize: 15,
    lineHeight: 20,
    backgroundColor: "rgba(255, 255, 255, 0.58)",
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
    fontFamily: vibesTheme.fonts.medium,
  },
  reportButton: {
    minHeight: 54,
    borderRadius: 27,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E4B76E",
  },
  reportButtonDisabled: {
    opacity: 0.48,
  },
  reportButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: vibesTheme.fonts.bold,
  },
});
