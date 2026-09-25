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
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
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
} from "../src/queries/communityGroups.queries";
import { handleApiError } from "../src/utils/handleApiError";

const COMPOSER_LINE_HEIGHT = 20;
const COMPOSER_VERTICAL_PADDING = 8;
const COMPOSER_MIN_HEIGHT = COMPOSER_LINE_HEIGHT + COMPOSER_VERTICAL_PADDING * 2;
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
    const showSubscription = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
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
  const receipts = useMessageReceipts(
    "group",
    groupId,
    (messages.data ?? []).map((m) => ({ id: m.id, senderId: m.sender_id })),
    focused
  );
  const [actions, setActions] = useState(false);
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
  const submit = async () => {
    if (!body.trim() || send.isPending) return;
    try {
      await send.mutateAsync(body);
      setBody("");
    } catch (error) {
      handleApiError(error, { toastTitle: "No se pudo enviar el mensaje" });
    }
  };
  return (
    <ScreenContainer edges={["top", "left", "right"]} style={s.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        enabled={Platform.OS === "ios"}
        keyboardVerticalOffset={0}
      >
        <View style={s.header}>
          <TouchableOpacity
            accessibilityLabel="Volver"
            onPress={() => navigation.goBack()}
            style={s.back}
          >
            <Icon name="chevron-back" size={26} color={vibesTheme.colors.primaryText} />
          </TouchableOpacity>
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
              marginRight: 8,
            }}
          >
            {updatePhoto.isPending ? (
              <ActivityIndicator />
            ) : group?.photoUrl ? (
              <Avatar uri={group.photoUrl} size={44} />
            ) : (
              <Icon name="people-outline" size={30} color={vibesTheme.colors.accentMustard} />
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
            style={{ padding: 12 }}
          >
            <Icon name="ellipsis-horizontal" size={22} color={vibesTheme.colors.primaryText} />
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
            padding: 28,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
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
              style={{ minHeight: 48, paddingVertical: 16 }}
            >
              <Text style={{ fontSize: 18, color: DARK_GRAY }}>
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
              style={{ fontSize: 18, color: vibesTheme.colors.primaryText, paddingVertical: 20 }}
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
        {messages.isLoading ? <ActivityIndicator color={vibesTheme.colors.accentMustard} /> : null}
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
        <FlatList
          style={s.messages}
          onViewableItemsChanged={receipts.onViewableItemsChanged}
          viewabilityConfig={receipts.viewabilityConfig}
          keyboardShouldPersistTaps="handled"
          inverted
          data={messages.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) =>
            item.message_kind === "system" ? (
              <Text
                style={{
                  textAlign: "center",
                  padding: 12,
                  color: vibesTheme.colors.secondaryText,
                  fontSize: 13,
                }}
              >
                {item.body}
              </Text>
            ) : (
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
                <View
                  style={[
                    s.bubble,
                    item.sender_id === session?.user.id && s.own,
                  ]}
                >
                  <Text style={s.sender}>
                    {item.sender_id === session?.user.id
                      ? "Vos"
                      : item.senderName}
                  </Text>
                  <Text style={s.body}>{item.body}</Text>
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
                      <MessageReceipt status={receipts.statuses.get(item.id)} />
                    ) : null}
                  </View>
                </View>
              </View>
            )
          }
        />
        <View
          style={[
            chatStyles.eventChatInputContainer,
            s.composer,
            {
              paddingBottom:
                keyboardHeight > 0 ? 12 : Math.max(insets.bottom + 8, 18),
            },
          ]}
        >
          <TextInput
            accessibilityLabel="Mensaje"
            placeholder="Escribí un mensaje…"
            style={[
              chatStyles.eventChatInput,
              s.input,
              { height: composerHeight },
            ]}
            placeholderTextColor={TEXT_SECONDARY}
            value={body}
            onChangeText={setBody}
            multiline
            scrollEnabled={composerHeight >= COMPOSER_MAX_HEIGHT}
            onContentSizeChange={(event) => {
              const nextHeight = Math.min(
                COMPOSER_MAX_HEIGHT,
                Math.max(
                  COMPOSER_MIN_HEIGHT,
                  event.nativeEvent.contentSize.height
                )
              );
              setComposerHeight(nextHeight);
            }}
            textAlignVertical="top"
            maxLength={4000}
            editable={!send.isPending}
          />
          <TouchableOpacity
            accessibilityLabel="Enviar mensaje"
            disabled={!body.trim() || send.isPending}
            style={[
              chatStyles.eventChatSendButton,
              s.send,
              (!body.trim() || send.isPending) && { opacity: 0.4 },
            ]}
            onPress={() => void submit()}
          >
            {send.isPending ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <Icon name="send" size={22} color={WHITE} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: vibesTheme.colors.background },
  header: { flexDirection: "row", alignItems: "center", padding: 16, gap: 10, flexShrink: 0 },
  messages: { flex: 1, minHeight: 0 },
  back: { padding: 8 },
  title: { fontSize: 21, color: DARK_GRAY, fontWeight: "600" },
  description: { color: TEXT_SECONDARY, marginTop: 4 },
  empty: { textAlign: "center", color: TEXT_SECONDARY, padding: 24 },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 10,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 6,
  },
  bubble: {
    alignSelf: "flex-start",
    maxWidth: "78%",
    backgroundColor: WHITE,
    padding: 12,
    borderRadius: 16,
    shadowColor: vibesTheme.colors.primaryText,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  own: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(228, 183, 110, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.30)",
  },
  sender: {
    fontSize: 12,
    fontWeight: "600",
    color: vibesTheme.colors.primaryText,
    marginBottom: 4,
  },
  body: { color: DARK_GRAY, fontSize: 16 },
  time: { color: TEXT_SECONDARY, fontSize: 11 },
  composer: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 6,
    gap: 10,
  },
  input: {
    flex: 1,
    maxHeight: COMPOSER_MAX_HEIGHT,
    minHeight: COMPOSER_MIN_HEIGHT,
    lineHeight: COMPOSER_LINE_HEIGHT,
    paddingHorizontal: 14,
    paddingVertical: COMPOSER_VERTICAL_PADDING,
    borderRadius: 20,
    fontSize: 16,
  },
  send: { width: 48, height: 48, borderRadius: 24 },
});
