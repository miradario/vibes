import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import ScreenContainer from "../components/ScreenContainer";
import { Icon } from "../components";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  useCommunityMessagesQuery,
  useSendCommunityMessageMutation,
} from "../src/queries/communityGroups.queries";
import { handleApiError } from "../src/utils/handleApiError";

export default function CommunityGroupChat() {
  const navigation = useNavigation();
  const { groupId, name, description } = useRoute().params as {
    groupId: string;
    name: string;
    description: string;
  };
  const { data: session } = useAuthSession();
  const messages = useCommunityMessagesQuery(groupId);
  const send = useSendCommunityMessageMutation(groupId);
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
    <ScreenContainer
      edges={["top", "left", "right", "bottom"]}
      style={s.screen}
    >
      <View style={s.header}>
        <TouchableOpacity
          accessibilityLabel="Volver"
          onPress={() => navigation.goBack()}
          style={s.back}
        >
          <Icon name="chevron-back" size={26} color="#403B36" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>
            {name}
          </Text>
          <Text numberOfLines={2} style={s.description}>
            {description || "Grupo de la comunidad"}
          </Text>
        </View>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {messages.isLoading ? <ActivityIndicator color="#B98235" /> : null}
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
          inverted
          data={messages.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View
              style={[s.bubble, item.sender_id === session?.user.id && s.own]}
            >
              <Text style={s.sender}>
                {item.sender_id === session?.user.id ? "Vos" : item.senderName}
              </Text>
              <Text style={s.body}>{item.body}</Text>
              <Text style={s.time}>
                {new Date(item.created_at).toLocaleString("es-AR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          )}
        />
        <View style={s.composer}>
          <TextInput
            accessibilityLabel="Mensaje"
            placeholder="Escribí un mensaje…"
            style={s.input}
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={4000}
            editable={!send.isPending}
          />
          <TouchableOpacity
            accessibilityLabel="Enviar mensaje"
            disabled={!body.trim() || send.isPending}
            style={[
              s.send,
              (!body.trim() || send.isPending) && { opacity: 0.4 },
            ]}
            onPress={() => void submit()}
          >
            {send.isPending ? (
              <ActivityIndicator color="#403B36" />
            ) : (
              <Icon name="send" size={22} color="#403B36" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FEFEFD" },
  header: { flexDirection: "row", alignItems: "center", padding: 16, gap: 10 },
  back: { padding: 8 },
  title: { fontSize: 21, color: "#403B36", fontWeight: "600" },
  description: { color: "#7B746C", marginTop: 4 },
  empty: { textAlign: "center", color: "#7B746C", padding: 24 },
  bubble: {
    alignSelf: "flex-start",
    maxWidth: "85%",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  own: { alignSelf: "flex-end", backgroundColor: "#F2DFBA" },
  sender: {
    fontSize: 12,
    fontWeight: "600",
    color: "#85612A",
    marginBottom: 4,
  },
  body: { color: "#403B36", fontSize: 16 },
  time: { color: "#7B746C", fontSize: 11, marginTop: 6 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    padding: 14,
    backgroundColor: "white",
    borderRadius: 20,
    fontSize: 16,
  },
  send: { padding: 14, borderRadius: 24, backgroundColor: "#E4B76E" },
});
