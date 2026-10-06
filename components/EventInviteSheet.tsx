import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AnimatedSheetModal from "./AnimatedSheetModal";
import Avatar from "./Avatar";
import VibesLoader from "./VibesLoader";
import { Text, TextInput } from "./Typography";
import {
  useMatchesQuery,
  useSendDirectMessageMutation,
  type MatchWithProfile,
} from "../src/queries/matches.queries";
import type { EventFeedItem } from "../src/queries/events.queries";
import { buildEventInvitation } from "../src/lib/eventInvites";
import { vibesTheme } from "../src/theme/vibesTheme";

export default function EventInviteSheet({
  event,
  visible,
  onClose,
  onDiscover,
}: {
  event: EventFeedItem;
  visible: boolean;
  onClose: () => void;
  onDiscover: () => void;
}) {
  const matches = useMatchesQuery();
  const send = useSendDirectMessageMutation();
  const [search, setSearch] = useState("");
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const sending = useRef(false);
  const discoverAfterClose = useRef(false);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const invitation = useMemo(() => buildEventInvitation(event), [event]);
  useEffect(() => {
    setSent(new Set());
    setError("");
    setSearch("");
  }, [event.id]);
  const contacts = (matches.data ?? []).filter(
    (match) =>
      match.isActive &&
      match.otherUserName
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase())
  );
  const close = () => {
    if (!sending.current) onClose();
  };
  const invite = async (match: MatchWithProfile) => {
    if (sending.current || sent.has(match.id)) return;
    sending.current = true;
    setSendingId(match.id);
    setError("");
    try {
      await send.mutateAsync({ matchId: match.id, body: invitation });
      setSent((current) => new Set([...current, match.id]));
    } catch {
      setError(
        `No pudimos enviar la invitación a ${match.otherUserName}. Intentá de nuevo.`
      );
    } finally {
      sending.current = false;
      setSendingId(null);
    }
  };
  return (
    <AnimatedSheetModal
      visible={visible}
      onClose={close}
      closeOnBackdropPress={!sendingId}
      onClosed={() => {
        if (discoverAfterClose.current) {
          discoverAfterClose.current = false;
          onDiscover();
        }
      }}
      sheetStyle={[
        s.sheet,
        {
          maxHeight: height - insets.top - 20,
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      <View style={s.header}>
        <Text style={s.title}>Invitar contactos</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Cerrar invitaciones"
          onPress={close}
          disabled={!!sendingId}
          style={s.close}
        >
          <Ionicons
            name="close"
            size={24}
            color={vibesTheme.colors.primaryText}
          />
        </TouchableOpacity>
      </View>
      <Text style={s.copy}>
        Invitá a gente con la que ya conectaste. Recibirá el evento en su chat.
      </Text>
      <View style={s.preview}>
        <Text style={s.previewTitle}>{event.title}</Text>
        <Text style={s.copy}>Te invito a este evento en Vibes.</Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        disabled={!!sendingId}
        style={s.discover}
        onPress={() => {
          discoverAfterClose.current = true;
          onClose();
        }}
      >
        <Ionicons
          name="compass-outline"
          size={24}
          color={vibesTheme.colors.primaryText}
        />
        <View style={s.discoverCopy}>
          <Text style={s.name}>Ir a Discover</Text>
          <Text style={s.copy}>Buscá nuevas personas para conectar.</Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={vibesTheme.colors.primaryText}
        />
      </TouchableOpacity>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar entre mis conexiones"
        accessibilityLabel="Buscar conexiones"
        placeholderTextColor={vibesTheme.colors.secondaryText}
        style={s.search}
      />
      {error ? (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      ) : null}
      {sent.size > 0 ? (
        <Text accessibilityLiveRegion="polite" style={s.copy}>
          {sent.size === 1
            ? "1 invitación enviada"
            : `${sent.size} invitaciones enviadas`}
        </Text>
      ) : null}
      {matches.isLoading ? (
        <VibesLoader size={32} />
      ) : matches.isError ? (
        <View style={s.empty}>
          <Text style={s.copy}>No pudimos cargar tus conexiones.</Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => void matches.refetch()}
            style={s.invite}
          >
            <Text style={s.buttonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          style={s.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={s.empty}>
              {search.trim()
                ? "No encontramos conexiones con ese nombre."
                : "Todavía no tenés conexiones. Encontrá personas en Discover."}
            </Text>
          }
          renderItem={({ item }) => {
            const invited = sent.has(item.id);
            return (
              <View style={s.row}>
                <Avatar uri={item.otherUserPhoto} size={44} />
                <Text numberOfLines={2} style={[s.name, s.contactName]}>
                  {item.otherUserName}
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={
                    invited
                      ? `Invitación enviada a ${item.otherUserName}`
                      : `Invitar a ${item.otherUserName}`
                  }
                  accessibilityState={{
                    disabled: invited || !!sendingId,
                    busy: sendingId === item.id,
                  }}
                  disabled={invited || !!sendingId}
                  onPress={() => void invite(item)}
                  style={[
                    s.invite,
                    invited && s.sent,
                    !invited && !!sendingId && { opacity: 0.5 },
                  ]}
                >
                  {sendingId === item.id ? (
                    <VibesLoader size={22} />
                  ) : (
                    <Text style={s.buttonText}>
                      {invited ? "Enviada" : "Invitar"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </AnimatedSheetModal>
  );
}
const c = vibesTheme.colors;
const s = StyleSheet.create({
  sheet: {
    backgroundColor: c.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 24,
    color: c.primaryText,
    fontFamily: vibesTheme.fonts.bold,
  },
  close: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { color: c.secondaryText, fontSize: 14, lineHeight: 20 },
  preview: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(244, 163, 64, 0.16)",
    gap: 4,
  },
  previewTitle: {
    color: c.primaryText,
    fontSize: 17,
    fontFamily: vibesTheme.fonts.medium,
  },
  discover: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    minHeight: 64,
    borderRadius: 16,
    backgroundColor: "rgba(57, 120, 184, 0.12)",
  },
  discoverCopy: { flex: 1 },
  name: {
    color: c.primaryText,
    fontSize: 16,
    fontFamily: vibesTheme.fonts.medium,
  },
  search: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: c.secondaryText,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: c.primaryText,
    fontSize: 16,
  },
  list: { flexGrow: 0, flexShrink: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  contactName: { flex: 1 },
  invite: {
    minHeight: 48,
    minWidth: 82,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.accentMustard,
  },
  sent: {
    backgroundColor: "rgba(57, 120, 184, 0.16)",
    borderWidth: 1,
    borderColor: c.accentBlue,
  },
  buttonText: {
    color: c.primaryText,
    fontSize: 14,
    fontFamily: vibesTheme.fonts.medium,
  },
  empty: {
    paddingVertical: 20,
    color: c.secondaryText,
    fontSize: 15,
    lineHeight: 22,
    gap: 12,
  },
  error: { color: c.primaryText, fontSize: 14, lineHeight: 20 },
});
