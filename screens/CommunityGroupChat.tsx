import KeyboardViewport from "../components/KeyboardViewport";
import {chatComposerBottomPadding} from "../src/lib/chatComposerLayout";
import ChatVisibleDate, { useChatVisibleDate } from "../components/ChatVisibleDate";
import BackButton from "../components/BackButton";
import VibesLoader from "../components/VibesLoader";
import ChatPhotoButton from "../components/ChatPhotoButton";
import ChatMessageContent from "../components/ChatMessageContent";
import HeartMessageBubble from "../components/HeartMessageBubble";
import { useMessageHearts } from "../src/queries/messageHearts.queries";
import { vibesTheme } from "../src/theme/vibesTheme";
import chatStyles, { DARK_GRAY, TEXT_SECONDARY, WHITE } from "../assets/styles";
import ParticipantsSheet from "../components/ParticipantsSheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MessageReceipt from "../components/MessageReceipt";
import { useMessageReceipts } from "../src/queries/communityReceipts.queries";
import AnimatedSheetModal from "../components/AnimatedSheetModal";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../src/lib/supabase";
import * as ImagePicker from "expo-image-picker";
import Avatar from "../components/Avatar";
import SwipeToReply from "../components/SwipeToReply";
import {
  QuotedMessage,
  ReplyPreviewBar,
  type ReplyTarget,
} from "../components/MessageReply";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, Keyboard, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text, TextInput } from "../components/Typography";
import {
  useNavigation,
  useRoute,
  useIsFocused,
} from "@react-navigation/native";
import ScreenContainer from "../components/ScreenContainer";
import { Icon } from "../components";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  useCommunityMessagesQuery,
  useCommunityGroupMembersQuery,
  useCommunityGroupsQuery,
  useUpdateCommunityGroupPhotoMutation,
  useSendCommunityMessageMutation,
  type CommunityMessage,
} from "../src/queries/communityGroups.queries";
import { handleApiError } from "../src/utils/handleApiError";
import { buttonDisabled } from "../components/ui/buttonStyles";
import { iconButtonFilled, iconButtonFilledIconColor, iconButtonFilledIconSize } from "../components/ui/surfaceStyles";
import * as ds from "../src/theme/tokens";

const COMPOSER_LINE_HEIGHT = 20;
const COMPOSER_VERTICAL_PADDING = 8;
const COMPOSER_MIN_HEIGHT =
  COMPOSER_LINE_HEIGHT + COMPOSER_VERTICAL_PADDING * 2;
const COMPOSER_MAX_HEIGHT =
  COMPOSER_LINE_HEIGHT * 4 + COMPOSER_VERTICAL_PADDING * 2;

export default function CommunityGroupChat() {
  const navigation = useNavigation();
  const { groupId, name, description } = useRoute().params as {
    groupId: string;
    name: string;
    description: string;
  };
  const { data: session } = useAuthSession();
  const messages = useCommunityMessagesQuery(groupId);
  const members = useCommunityGroupMembersQuery(groupId);
  const [membersVisible, setMembersVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [composerHeight, setComposerHeight] = useState(COMPOSER_MIN_HEIGHT);
  const insets = useSafeAreaInsets();
  const send = useSendCommunityMessageMutation(groupId);
  const groups = useCommunityGroupsQuery();
  const group = groups.data?.find((item) => item.id === groupId);
  const updatePhoto = useUpdateCommunityGroupPhotoMutation();
  const canEditPhoto = Boolean(
    session?.user.id && group?.created_by === session.user.id
  );
  const pendingPhoto = useRef(false);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      "keyboardDidShow",
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
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

  const editPhoto = async () => {
    if (!canEditPhoto || pickingPhoto || updatePhoto.isPending) return;
    setPickingPhoto(true);
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Acceso a fotos",
          "Permití acceso a tus fotos para elegir la imagen del grupo."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      const asset = result.canceled ? null : result.assets?.[0];
      if (asset)
        await updatePhoto.mutateAsync({
          groupId,
          uri: asset.uri,
          mimeType: asset.mimeType,
          oldPath: group?.photo_path,
        });
    } catch (error) {
      handleApiError(error, { toastTitle: "No se pudo actualizar la foto" });
    } finally {
      setPickingPhoto(false);
    }
  };
  const focused = useIsFocused();
  const hearts = useMessageHearts(
    "group",
    groupId,
    (messages.data ?? []).map((m) => m.id),
    focused
  );
  const receipts = useMessageReceipts(
    "group",
    groupId,
    (messages.data ?? []).map((m) => ({ id: m.id, senderId: m.sender_id })),
    focused
  );

  const visibleDate = useChatVisibleDate(groupId, true, receipts.onViewableItemsChanged);  const [actions, setActions] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const client = useQueryClient();
  const leave = () => {
    setActions(false);
    Alert.alert(
      "Abandonar grupo",
      "Vas a perder acceso al historial. Tus mensajes seguirán visibles para el grupo.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Abandonar",
          style: "destructive",
          onPress: async () => {
            setLeaving(true);
            const { error } = await supabase.rpc("leave_community_group", {
              target_group: groupId,
            });
            setLeaving(false);
            if (error) {
              handleApiError(error, {
                toastTitle: "No se pudo abandonar el grupo",
              });
              return;
            }
            client.removeQueries({
              queryKey: ["communityMessages", session?.user.id, groupId],
            });
            void client.invalidateQueries({ queryKey: ["communityGroups"] });
            void client.invalidateQueries({ queryKey: ["communityUnread"] });
            navigation.goBack();
          },
        },
      ]
    );
  };
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const listRef = useRef<FlatList<CommunityMessage>>(null);
  const inputRef = useRef<TextInput>(null);
  const messagesById = useMemo(
    () => new Map((messages.data ?? []).map((m) => [m.id, m])),
    [messages.data]
  );
  const authorName = (message: CommunityMessage) =>
    message.sender_id === session?.user.id ? "Vos" : message.senderName;
  const startReply = (message: CommunityMessage) => {
    setReplyTo({
      id: message.id,
      author: authorName(message),
      body: message.body,
    });
    inputRef.current?.focus();
  };
  const scrollToMessage = (messageId: string) => {
    const index = (messages.data ?? []).findIndex((m) => m.id === messageId);
    if (index < 0) return;
    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
  };
  const submit = async () => {
    if (!body.trim() || send.isPending) return;
    try {
      await send.mutateAsync({ body, replyToMessageId: replyTo?.id ?? null });
      setBody("");
      setReplyTo(null);
    } catch (error) {
      handleApiError(error, { toastTitle: "No se pudo enviar el mensaje" });
    }
  };
  return (
    <ScreenContainer edges={["top", "left", "right"]} style={s.screen}>
      <KeyboardViewport
        style={{ flex: 1 }}
      >
        <View style={s.header}>
          <BackButton accessibilityLabel="Volver"
            onPress={() => navigation.goBack()}
            style={s.back} />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Editar foto del grupo"
            disabled={!canEditPhoto || pickingPhoto || updatePhoto.isPending}
            onPress={() => void editPhoto()}
            style={{
              minWidth: 48,
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
              marginRight: ds.spacing[2],
            }}
          >
            {updatePhoto.isPending ? (
              <VibesLoader />
            ) : group?.photoUrl ? (
              <Avatar uri={group.photoUrl} size={44} />
            ) : (
              <Icon
                name="people-outline"
                size={ds.iconSize.xl}
                color={vibesTheme.colors.accentMustard}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Ver participantes del grupo"
            onPress={() => setMembersVisible(true)}
            style={{ flex: 1, minHeight: 48 }}
          >
            <Text style={s.title} numberOfLines={1}>
              {name}
            </Text>
            <Text numberOfLines={2} style={s.description}>
              {members.data
                ? `${members.data.length} participantes`
                : description || "Participantes"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Opciones del grupo"
            onPress={() => setActions(true)}
            disabled={leaving}
            style={{ padding: ds.spacing[3] }}
          >
            <Icon
              name="ellipsis-horizontal"
              size={ds.iconSize.lg}
              color={vibesTheme.colors.primaryText}
            />
          </TouchableOpacity>
        </View>
        <AnimatedSheetModal
          visible={actions}
          onClose={() => setActions(false)}
          onClosed={() => {
            if (pendingPhoto.current) {
              pendingPhoto.current = false;
              void editPhoto();
            }
          }}
          sheetStyle={{
            backgroundColor: vibesTheme.colors.background,
            padding: ds.spacing[8],
            borderTopLeftRadius: ds.radii.xl,
            borderTopRightRadius: ds.radii.xl,
          }}
        >
          {canEditPhoto && (
            <TouchableOpacity
              accessibilityRole="button"
              disabled={pickingPhoto || updatePhoto.isPending}
              onPress={() => {
                pendingPhoto.current = true;
                setActions(false);
              }}
              style={{ minHeight: 48, paddingVertical: ds.spacing[4] }}
            >
              <Text style={{ ...ds.textStyles.body, color: DARK_GRAY }}>
                Editar foto del grupo
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={leave}
            disabled={leaving}
            accessibilityLabel="Abandonar grupo"
          >
            <Text
              style={{
                ...ds.textStyles.body,
                color: vibesTheme.colors.primaryText,
                paddingVertical: ds.spacing[5],
              }}
            >
              Abandonar grupo
            </Text>
          </TouchableOpacity>
        </AnimatedSheetModal>
        <ParticipantsSheet
          visible={membersVisible}
          onClose={() => setMembersVisible(false)}
          participants={members.data ?? []}
          userId={session?.user.id}
          loading={members.isLoading}
          error={members.isError}
          retry={() => void members.refetch()}
        />
        {messages.isLoading ? (
          <VibesLoader />
        ) : null}
        {messages.isError ? (
          <TouchableOpacity onPress={() => void messages.refetch()}>
            <Text style={s.empty}>
              No pudimos cargar los mensajes. Tocá para reintentar.
            </Text>
          </TouchableOpacity>
        ) : null}
        {!messages.isLoading && !messages.isError && !messages.data?.length ? (
          <Text style={s.empty}>
            Este espacio ya es suyo. ¡Iniciá la conversación!
          </Text>
        ) : null}
        <View style={{ flex: 1, position: "relative" }}><FlatList
          ref={listRef}
          style={s.messages}
          onScrollToIndexFailed={({ index, averageItemLength }) => {
            listRef.current?.scrollToOffset({
              offset: index * averageItemLength,
              animated: true,
            });
          }}
          onViewableItemsChanged={visibleDate.onViewableItemsChanged}
          viewabilityConfig={receipts.viewabilityConfig}
          keyboardShouldPersistTaps="handled"
          inverted
          data={messages.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: ds.spacing[4] }}
          renderItem={({ item }) =>
            item.message_kind === "system" ? (
              <Text
                style={{
                  textAlign: "center",
                  padding: ds.spacing[3],
                  color: vibesTheme.colors.secondaryText,
                  ...ds.textStyles.bodySmall,
                }}
              >
                {item.body}
              </Text>
            ) : (
              <SwipeToReply onReply={() => startReply(item)}>
              <View
                style={[
                  s.messageRow,
                  item.sender_id === session?.user.id && {
                    justifyContent: "flex-end",
                  },
                ]}
              >
                {item.sender_id !== session?.user.id && (
                  <Avatar uri={item.senderAvatar} size={30} />
                )}
                <HeartMessageBubble
                  canReact={item.sender_id !== session?.user.id}
                  count={hearts.byMessage.get(item.id)?.count}
                  liked={hearts.byMessage.get(item.id)?.liked}
                  onHeart={(remove) => hearts.react(item.id, remove)}
                  style={[
                    s.bubble,
                    item.sender_id === session?.user.id && s.own,
                  ]}
                >
                  {(press, _longPress, reaction) => (
                    <>
                      <Text style={s.sender}>
                        {item.sender_id === session?.user.id
                          ? "Vos"
                          : item.senderName}
                      </Text>
                      {item.reply_to_message_id ? (
                        <QuotedMessage
                          author={
                            messagesById.get(item.reply_to_message_id)
                              ? authorName(
                                  messagesById.get(item.reply_to_message_id)!
                                )
                              : undefined
                          }
                          body={
                            messagesById.get(item.reply_to_message_id)?.body ??
                            null
                          }
                          onPress={() =>
                            scrollToMessage(item.reply_to_message_id!)
                          }
                        />
                      ) : null}
                      <ChatMessageContent
                        onPhotoPress={press}
                        body={item.body}
                        textStyle={s.body}
                      />
                      <View style={s.meta}>
                        <Text style={s.time}>
                          {new Date(item.created_at).toLocaleString("es-AR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                        {item.sender_id === session?.user.id ? (
                          <MessageReceipt
                            status={receipts.statuses.get(item.id)}
                          />
                        ) : null}
                      </View>
                      {reaction}
                    </>
                  )}
                </HeartMessageBubble>
              </View>
              </SwipeToReply>
            )
          }
        /><ChatVisibleDate date={visibleDate.date} /></View>
        {replyTo ? (
          <ReplyPreviewBar target={replyTo} onClose={() => setReplyTo(null)} />
        ) : null}
        <View
          style={[
            chatStyles.eventChatInputContainer,
            s.composer,
            {
              paddingBottom:
                chatComposerBottomPadding(insets.bottom, keyboardHeight > 0),
            },
          ]}
        >
          <ChatPhotoButton
            kind="group"
            chatId={groupId}
            userId={session?.user.id}
            disabled={send.isPending}
            onSend={(photoBody) => send.mutateAsync({ body: photoBody })}
          />
          <TextInput
            ref={inputRef}
            accessibilityLabel="Mensaje"
            placeholder="Escribí un mensaje…"
            style={[
              chatStyles.eventChatInput,
              s.input,
              Platform.OS === "ios" ? null : { height: composerHeight },
            ]}
            placeholderTextColor={TEXT_SECONDARY}
            value={body}
            onChangeText={setBody}
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
            maxLength={4000}
            editable={!send.isPending}
          />
          <TouchableOpacity
            accessibilityLabel="Enviar mensaje"
            disabled={!body.trim() || send.isPending}
            style={[
              iconButtonFilled,
              (!body.trim() || send.isPending) && buttonDisabled,
            ]}
            onPress={() => void submit()}
          >
            {send.isPending ? (
              <VibesLoader />
            ) : (
              <Icon name="send" size={iconButtonFilledIconSize} color={iconButtonFilledIconColor} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardViewport>
    </ScreenContainer>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: vibesTheme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: ds.spacing[4],
    gap: ds.spacing[3],
    flexShrink: 0,
  },
  messages: { flex: 1, minHeight: 0 },
  back: { padding: ds.spacing[2] },
  title: { ...ds.textStyles.heading, color: DARK_GRAY },
  description: { color: TEXT_SECONDARY, marginTop: ds.spacing[1] },
  empty: { textAlign: "center", color: TEXT_SECONDARY, padding: ds.spacing[6] },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: ds.spacing[2],
    marginBottom: ds.spacing[3],
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: ds.spacing[1],
    marginTop: ds.spacing[2],
  },
  bubble: {
    alignSelf: "flex-start",
    maxWidth: "78%",
    backgroundColor: WHITE,
    padding: ds.spacing[3],
    borderRadius: ds.radii.lg,
    ...ds.shadows.sm,
  },
  own: {
    // Android shadows show through translucent backgrounds.
    elevation: Platform.OS === "android" ? 0 : ds.shadows.sm.elevation,
    alignSelf: "flex-end",
    backgroundColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.medium),
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.scrim),
  },
  sender: {
    ...ds.textStyles.caption,
    color: vibesTheme.colors.primaryText,
    marginBottom: ds.spacing[1],
  },
  body: { color: DARK_GRAY, ...ds.textStyles.body },
  time: { color: TEXT_SECONDARY, ...ds.textStyles.micro },
  composer: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: ds.spacing[3],
    paddingTop: ds.spacing[2],
    gap: ds.spacing[3],
  },
  input: {
    flex: 1,
    maxHeight: COMPOSER_MAX_HEIGHT,
    minHeight: COMPOSER_MIN_HEIGHT,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: COMPOSER_VERTICAL_PADDING,
    borderRadius: ds.radii.xl,
    ...ds.textStyles.body, lineHeight: Platform.OS === "ios" ? undefined : COMPOSER_LINE_HEIGHT,
  },
});
