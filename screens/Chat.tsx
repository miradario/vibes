import KeyboardViewport from "../components/KeyboardViewport";
import {chatComposerBottomPadding} from "../src/lib/chatComposerLayout";
import ChatVisibleDate, { useChatVisibleDate } from "../components/ChatVisibleDate";
import { messagePreview } from "../src/lib/chatPhotos";
import ChatPhotoButton from "../components/ChatPhotoButton";
import ChatMessageContent from "../components/ChatMessageContent";
import HeartMessageBubble from "../components/HeartMessageBubble";
import { useMessageHearts } from "../src/queries/messageHearts.queries";
import MessageEntrance from "../components/MessageEntrance";
import { useConnectionOpened } from "../src/queries/homeActivity.queries";
import ScreenContainer from "../components/ScreenContainer";
import MessageReceipt from "../components/MessageReceipt";
import { useMessageReceipts } from "../src/queries/communityReceipts.queries";
/** @format */

import React, { useRef, useEffect, useMemo, useState } from "react";
import {
  View,
  TouchableOpacity,
  FlatList,

  Keyboard,
  Platform,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
} from "react-native";
import { Text, TextInput } from "../components/Typography";
import {
  useIsFocused,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components";
import AppHeader from "../components/AppHeader";
import Avatar from "../components/Avatar";
import AnimatedSheetModal from "../components/AnimatedSheetModal";
import UserProfileSheet from "../components/UserProfileSheet";
import styles, { DARK_GRAY, TEXT_SECONDARY, WHITE } from "../assets/styles";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  useDirectMessagesQuery,
  useMarkDirectMessagesReadMutation,
  useSendDirectMessageMutation,
  useDeleteDirectMessageMutation,
  useReportUserMutation,
  useBlockUserMutation,
  useUnmatchMutation,
  type ReportReason,
  type DirectMessage,
} from "../src/queries/matches.queries";
import { mapCandidateToConnectionProfile } from "../src/lib/connectionProfiles";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";
import { vibesTheme } from "../src/theme/vibesTheme";
import VibesLoader from "../components/VibesLoader";
import SwipeToReply from "../components/SwipeToReply";
import {
  QuotedMessage,
  ReplyPreviewBar,
  type ReplyTarget,
} from "../components/MessageReply";
import { buttonContentColor, buttonLabel, buttonStyle } from "../components/ui/buttonStyles";
import * as ds from "../src/theme/tokens";

const REPORT_REASONS: ReportReason[] = [
  "Spam o contenido irrelevante",
  "Lenguaje ofensivo",
  "Acoso o incomodidad",
  "Contenido inapropiado",
  "Perfil falso o engañoso",
];
const COMPOSER_LINE_HEIGHT = 20;
const COMPOSER_VERTICAL_PADDING = 8;
const COMPOSER_MIN_HEIGHT =
  COMPOSER_LINE_HEIGHT + COMPOSER_VERTICAL_PADDING * 2;
const COMPOSER_MAX_HEIGHT =
  COMPOSER_LINE_HEIGHT * 4 + COMPOSER_VERTICAL_PADDING * 2;

const Chat = () => {
  const navigation = useNavigation();
  const route = useRoute() as any;
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { matchId, otherUserId, otherUserName, otherUserPhoto } =
    route?.params ?? {};

  // Estado para mostrar CardItem modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { data: session } = useAuthSession();
  const myId = session?.user?.id;
  const { data: profile } = useProfileQuery(otherUserId);
  const { data: preferences } = useUserPreferencesQuery(otherUserId);
  const otherUserAvatar = profile?.photos?.[0]?.url ?? otherUserPhoto ?? null;
  const profileCard = mapCandidateToConnectionProfile({
    id: otherUserId ?? matchId ?? "chat-user",
    displayName:
      profile?.displayName ??
      profile?.display_name ??
      profile?.name ??
      otherUserName ??
      "Chat",
    photos: profile?.photos ?? (otherUserPhoto ? [otherUserPhoto] : []),
    ...profile,
    ...(preferences ?? {}),
    hideAge: preferences == null || preferences.hideAge === true,
  });

  useConnectionOpened(matchId, isFocused);
  const { data: messages, isLoading } = useDirectMessagesQuery(matchId);
  const hearts = useMessageHearts(
    "direct",
    matchId,
    (messages ?? []).map((m) => m.id),
    isFocused
  );
  const receipts = useMessageReceipts(
    "direct",
    matchId,
    messages ?? [],
    isFocused
  );

  const visibleDate = useChatVisibleDate(matchId, false, receipts.onViewableItemsChanged);  const sendMutation = useSendDirectMessageMutation();
  const deleteMutation = useDeleteDirectMessageMutation();
  const unmatchMutation = useUnmatchMutation();
  const reportMutation = useReportUserMutation();
  const blockMutation = useBlockUserMutation();

  const [text, setText] = useState("");
  // Consume a suggested opener once; never send automatically or overwrite later edits.
  useEffect(() => {
    const draft = route?.params?.initialDraft;
    if (typeof draft !== "string" || !draft.trim()) return;
    setText(draft.trim());
    navigation.setParams({ initialDraft: undefined } as never);
  }, [route?.params?.initialDraft, matchId, navigation]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [composerHeight, setComposerHeight] = useState(COMPOSER_MIN_HEIGHT);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportReason, setSelectedReportReason] =
    useState<ReportReason | null>(null);
  const [reportDetails, setReportDetails] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const messagesById = useMemo(
    () => new Map((messages ?? []).map((message) => [message.id, message])),
    [messages]
  );
  const otherDisplayName =
    profile?.display_name || profile?.name || otherUserName || "Conexión";
  const authorName = (senderId: string) =>
    senderId === myId ? "Vos" : otherDisplayName;

  const startReply = (msg: DirectMessage) => {
    setReplyTo({ id: msg.id, author: authorName(msg.senderId), body: msg.text });
    inputRef.current?.focus();
  };

  const scrollToMessage = (messageId: string) => {
    const index = (messages ?? []).findIndex((m) => m.id === messageId);
    if (index < 0) return;
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
      viewPosition: 0.5,
    });
  };
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
    const showSubscription = Keyboard.addListener(
      "keyboardDidShow",
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 80);
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

  const handleSend = () => {
    const body = text.trim();
    if (!body || !matchId) return;
    const reply = replyTo;
    setText("");
    setReplyTo(null);
    sendMutation.mutate(
      { matchId, body, replyToMessageId: reply?.id ?? null },
      {
        onError: (err) => {
          setText(body);
          setReplyTo(reply);
          Alert.alert("Error", err.message || "No se pudo enviar el mensaje");
        },
      }
    );
  };

  const handleLongPress = (msg: DirectMessage) => {
    if (msg.deliveryStatus === "sending") return;
    if (msg.senderId !== myId) return;
    Alert.alert(
      "¿Eliminar mensaje?",
      (messagePreview(msg.text) ?? "").slice(0, 60),
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () =>
            deleteMutation.mutate({ messageId: msg.id, matchId: msg.matchId }),
        },
      ]
    );
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
                  err.message || "No se pudo abandonar la conexión."
                ),
            });
          },
        },
      ]
    );
  };

  const openReportModal = () => {
    setShowActionsModal(false);
    setShowReportModal(true);
  };

  const handleBlockUser = () => {
    setShowActionsModal(false);
    if (!otherUserId) return;
    Alert.alert(
      "Bloquear persona",
      "Ya no podrán verse ni enviarse mensajes.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Bloquear",
          style: "destructive",
          onPress: () =>
            blockMutation.mutate(
              { blockedUserId: String(otherUserId), matchId },
              {
                onSuccess: () => navigation.goBack(),
                onError: (error) =>
                  Alert.alert("Error", error.message || "No se pudo bloquear."),
              }
            ),
        },
      ]
    );
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
            Alert.alert(
              "Reporte enviado",
              "Gracias por contarnos qué pasó. Bloqueamos a esta persona."
            );
            return;
          }

          unmatchMutation.mutate(matchId, {
            onSuccess: () => {
              closeReportModal();
              Alert.alert(
                "Reporte enviado",
                "Gracias por contarnos qué pasó. Bloqueamos a esta persona y quitamos esta conexión.",
                [{ text: "OK", onPress: () => navigation.goBack() }]
              );
            },
            onError: (err) => {
              closeReportModal();
              Alert.alert(
                "Reporte enviado",
                err.message ||
                  "El reporte fue enviado, pero no se pudo quitar la conexión."
              );
            },
          });
        },
        onError: (err) =>
          Alert.alert("Error", err.message || "No se pudo enviar el reporte."),
      }
    );
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = ({ item }: { item: DirectMessage }) => {
    const isOwn = item.senderId === myId;
    const quoted = item.replyToMessageId
      ? messagesById.get(item.replyToMessageId)
      : null;
    const bubble = (
      <HeartMessageBubble
        canReact={!isOwn}
        count={hearts.byMessage.get(item.id)?.count}
        liked={hearts.byMessage.get(item.id)?.liked}
        onHeart={(remove) => hearts.react(item.id, remove)}
        onLongPress={() => handleLongPress(item)}
        style={[
          localStyles.messageBubble,
          isOwn
            ? localStyles.messageBubbleRight
            : localStyles.messageBubbleLeft,
        ]}
      >
        {(press, longPress, reaction) => (
          <>
            {item.replyToMessageId ? (
              <QuotedMessage
                author={quoted ? authorName(quoted.senderId) : undefined}
                body={quoted?.text ?? null}
                onPress={() => scrollToMessage(item.replyToMessageId!)}
              />
            ) : null}
            <ChatMessageContent
              onPhotoPress={press}
              onLongPress={longPress}
              body={item.text}
              textStyle={
                isOwn
                  ? localStyles.messageTextRight
                  : localStyles.messageTextLeft
              }
            />
            <View style={localStyles.messageMetaRow}>
              <Text
                style={[
                  localStyles.msgTime,
                  isOwn ? localStyles.msgTimeRight : localStyles.msgTimeLeft,
                ]}
              >
                {formatTime(item.createdAt)}
              </Text>
              {isOwn ? (
                <MessageReceipt
                  status={
                    item.deliveryStatus === "sending"
                      ? "sending"
                      : receipts.statuses.get(item.id)
                  }
                />
              ) : null}
            </View>
            {reaction}
          </>
        )}
      </HeartMessageBubble>
    );

    const canReply = item.deliveryStatus !== "sending";

    if (isOwn) {
      return (
        <SwipeToReply enabled={canReply} onReply={() => startReply(item)}>
          <MessageEntrance
            sending={item.deliveryStatus === "sending"}
            style={localStyles.ownMessageRow}
          >
            {bubble}
          </MessageEntrance>
        </SwipeToReply>
      );
    }

    return (
      <SwipeToReply enabled={canReply} onReply={() => startReply(item)}>
      <View style={localStyles.incomingMessageRow}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setShowProfileModal(true)}
        >
          <Avatar uri={otherUserAvatar} size={28} />
        </TouchableOpacity>
        {bubble}
      </View>
      </SwipeToReply>
    );
  };

  const matchDate = messages?.[0]?.createdAt;

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <KeyboardViewport
        style={styles.bg}
      >
        <AppHeader
          showBack
          onBack={() => navigation.goBack()}
          style={styles.chatHeader}
          right={
            <TouchableOpacity onPress={() => setShowActionsModal(true)}>
              <Icon name="ellipsis-horizontal" size={ds.iconSize.md} color={DARK_GRAY} />
            </TouchableOpacity>
          }
        >
          <TouchableOpacity
            style={styles.chatHeaderCenter}
            onPress={() => setShowProfileModal(true)}
          >
            <Avatar uri={otherUserAvatar} size={32} />
            <Text style={styles.chatName}>
              {(() => {
                const name =
                  profile?.display_name ||
                  profile?.name ||
                  otherUserName ||
                  "Chat";
                const age = profileCard.age;
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
            <Pressable
              style={[
                localStyles.actionsSheet,
                { marginBottom: insets.bottom + ds.spacing[6] },
              ]}
              onPress={() => undefined}
            >
              <Text style={localStyles.modalTitle}>Opciones de conexión</Text>
              <TouchableOpacity
                style={localStyles.actionRow}
                onPress={handleAbandonConnection}
                disabled={unmatchMutation.isPending}
              >
                <Icon
                  name="close-circle-outline"
                  size={ds.iconSize.md}
                  color={vibesTheme.colors.accentCoral}
                />
                <Text style={[localStyles.actionText, localStyles.dangerText]}>
                  Abandonar conexión
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={localStyles.actionRow}
                onPress={openReportModal}
              >
                <Icon name="flag-outline" size={ds.iconSize.md} color={DARK_GRAY} />
                <Text style={localStyles.actionText}>Reportar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={localStyles.actionRow}
                onPress={handleBlockUser}
                disabled={blockMutation.isPending}
              >
                <Icon
                  name="ban-outline"
                  size={ds.iconSize.md}
                  color={vibesTheme.colors.accentCoral}
                />
                <Text style={[localStyles.actionText, localStyles.dangerText]}>
                  Bloquear
                </Text>
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
            { paddingBottom: Math.max(insets.bottom + ds.spacing[5], ds.spacing[8]) },
          ]}
        >
          <Pressable onPress={() => undefined}>
            <Text style={localStyles.modalTitle}>
              ¿Por qué querés reportar?
            </Text>
            <Text style={localStyles.modalSubtitle}>
              Tu reporte nos ayuda a cuidar la comunidad. La persona también
              quedará bloqueada para protegerte.
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
              placeholderTextColor={vibesTheme.colors.secondaryText}
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
                  : "Enviar reporte y bloquear"}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </AnimatedSheetModal>

        <View style={localStyles.chatBody}>
          {/* Messages */}
          {isLoading ? (
            <View style={localStyles.loadingWrap}>
              <VibesLoader />
            </View>
          ) : (
            <View style={{ flex: 1, position: "relative" }}><FlatList
              ref={flatListRef}
              style={{ flex: 1 }}
              onLayout={() => {
                if (keyboardHeight > 0) {
                  flatListRef.current?.scrollToEnd({ animated: false });
                }
              }}
              onViewableItemsChanged={visibleDate.onViewableItemsChanged}
              viewabilityConfig={receipts.viewabilityConfig}
              data={messages ?? []}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              onScrollToIndexFailed={({ index, averageItemLength }) => {
                flatListRef.current?.scrollToOffset({
                  offset: index * averageItemLength,
                  animated: true,
                });
              }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
              contentContainerStyle={[
                localStyles.messageList,
                {
                  paddingBottom: ds.spacing[4],
                },
              ]}
              ListHeaderComponent={
                messages?.length ? (
                  <Text style={styles.chatMatchedText}>
                    Conectaste con {otherUserName || "esta persona"}
                    {matchDate
                      ? ` el ${new Date(matchDate).toLocaleDateString()}`
                      : ""}
                    .
                  </Text>
                ) : null
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
            /><ChatVisibleDate date={visibleDate.date} /></View>
          )}

          {replyTo ? (
            <ReplyPreviewBar
              target={replyTo}
              onClose={() => setReplyTo(null)}
            />
          ) : null}
          {/* Input */}
          <View
            style={[
              styles.eventChatInputContainer,
              localStyles.inputContainer,
              {
                paddingBottom:
                  chatComposerBottomPadding(insets.bottom, keyboardHeight > 0),
                marginBottom: 0,
              },
            ]}
          >
            <ChatPhotoButton
              kind="direct"
              chatId={matchId}
              userId={myId}
              disabled={sendMutation.isPending}
              onSend={(body) => sendMutation.mutateAsync({ matchId, body })}
            />
            <TextInput
              ref={inputRef}
              style={[
                styles.eventChatInput,
                localStyles.composerInput,
                Platform.OS === "ios" ? null : { height: composerHeight },
              ]}
              placeholder="Escribí un mensaje..."
              placeholderTextColor={TEXT_SECONDARY}
              value={text}
              onChangeText={setText}
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
              maxLength={2000}
              returnKeyType="default"
              onFocus={() =>
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 120)
              }
            />
            <TouchableOpacity
              style={[
                styles.eventChatSendButton,
                (!text.trim() || sendMutation.isPending) && { opacity: 0.4 },
              ]}
              onPress={handleSend}
              disabled={!text.trim() || sendMutation.isPending}
            >
              <Icon name="send" size={ds.iconSize.md} color={WHITE} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardViewport>
    </ScreenContainer>
  );
};

export default Chat;

const localStyles = StyleSheet.create({
  chatBody: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: ds.spacing[4],
    paddingTop: ds.spacing[2],
    flexGrow: 1,
  },
  incomingMessageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: ds.spacing[2],
    gap: ds.spacing[2],
  },
  ownMessageRow: {
    alignItems: "flex-end",
    marginBottom: ds.spacing[2],
  },
  messageBubble: {
    marginBottom: 0,
    maxWidth: "72%",
    borderRadius: ds.radii.lg,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[3],
    ...ds.shadows.sm,
  },
  msgTime: {
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
  msgTimeRight: {
    textAlign: "right",
  },
  msgTimeLeft: {},
  inputContainer: {
    flexShrink: 0,
    backgroundColor: ds.colors.bg.surfaceTranslucent,
    borderTopColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.scrim),
    paddingTop: ds.spacing[3],
    alignItems: "flex-end",
  },
  composerInput: {
    minHeight: COMPOSER_MIN_HEIGHT,
    maxHeight: COMPOSER_MAX_HEIGHT,
    lineHeight: Platform.OS === "ios" ? undefined : COMPOSER_LINE_HEIGHT,
    paddingVertical: COMPOSER_VERTICAL_PADDING,
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
    paddingTop: /* ds-lint-allow layout: paddingTop 180 (medida de layout fuera de la escala) */ 180,
  },
  emptyText: {
    color: TEXT_SECONDARY,
    ...ds.textStyles.subtitleMedium,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: ds.colors.scrim,
  },
  actionsSheet: {
    marginHorizontal: ds.spacing[4],
    borderRadius: ds.radii.xl,
    backgroundColor: vibesTheme.colors.background,
    paddingHorizontal: ds.spacing[4],
    paddingTop: ds.spacing[4],
    paddingBottom: ds.spacing[3],
    ...ds.shadows.md,
  },
  reportSheet: {
    borderTopLeftRadius: ds.radii.xl,
    borderTopRightRadius: ds.radii.xl,
    backgroundColor: vibesTheme.colors.background,
    paddingHorizontal: ds.spacing[5],
    paddingTop: ds.spacing[6],
    ...ds.shadows.lg,
  },
  modalTitle: {
    color: DARK_GRAY,
    ...ds.textStyles.title,
  },
  modalSubtitle: {
    marginTop: ds.spacing[1],
    marginBottom: ds.spacing[4],
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.subtitleMedium,
  },
  actionRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
    borderTopWidth: 1,
    borderTopColor: ds.colors.border.subtle,
  },
  actionText: {
    color: DARK_GRAY,
    ...ds.textStyles.subtitle,
  },
  dangerText: {
    color: vibesTheme.colors.accentBlue,
  },
  reasonRow: {
    minHeight: 48,
    borderRadius: ds.radii.lg,
    paddingHorizontal: ds.spacing[3],
    marginBottom: ds.spacing[2],
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ds.withAlpha(ds.colors.base.paper, ds.opacity.strong),
    borderWidth: 1,
    borderColor: ds.colors.border.subtle,
  },
  reasonRowSelected: {
    backgroundColor: ds.colors.bg.selected,
    borderColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.strong),
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: ds.radii.pill,
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.ink, ds.opacity.medium),
    alignItems: "center",
    justifyContent: "center",
    marginRight: ds.spacing[3],
  },
  radioSelected: {
    borderColor: vibesTheme.colors.accentMustard,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: ds.radii.pill,
    backgroundColor: vibesTheme.colors.accentMustard,
  },
  reasonText: {
    flex: 1,
    color: DARK_GRAY,
    ...ds.textStyles.subtitleMedium,
  },
  reportInput: {
    minHeight: 96,
    maxHeight: 140,
    borderRadius: ds.radii.lg,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[3],
    marginTop: ds.spacing[1],
    color: DARK_GRAY,
    ...ds.textStyles.subtitleMedium,
    backgroundColor: ds.withAlpha(ds.colors.base.paper, ds.opacity.high),
    borderWidth: 1,
    borderColor: ds.colors.border.subtle,
  },
  reportButton: {
    ...buttonStyle("accent", "lg"),
    marginTop: ds.spacing[4],
  },
  reportButtonDisabled: {
    opacity: 0.48,
  },
  reportButtonText: {
    ...buttonLabel("lg", "accent"),
  },
  messageBubbleLeft: {
    alignSelf: "flex-start",
    backgroundColor: WHITE,
    borderBottomLeftRadius: ds.radii.xs,
  },
  messageBubbleRight: {
    alignSelf: "flex-end",
    backgroundColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.medium),
    borderBottomRightRadius: ds.radii.sm,
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.scrim),
    ...ds.glow.accent,
    // Android shadows show through translucent backgrounds.
    elevation: Platform.OS === "android" ? 0 : ds.shadows.sm.elevation,
  },
  messageTextLeft: {
    color: DARK_GRAY,
    ...ds.textStyles.body,
  },
  messageTextRight: {
    color: DARK_GRAY,
    ...ds.textStyles.body,
  },
});
