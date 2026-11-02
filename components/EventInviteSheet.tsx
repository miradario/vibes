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
import { useEventParticipantsQuery, useChallengeParticipantsQuery, type EventFeedItem } from "../src/queries/events.queries";
import { eligibleInviteContacts } from "../src/lib/eventInviteContacts";
import { buildClassInvitation, type ClassInvitation, buildChallengeInvitation, buildEventInvitation } from "../src/lib/eventInvites";
import { useInviteToChallengeMutation } from "../src/queries/challengeRestart.queries";
import { shareClassInvite, shareChallengeInvite, shareEventInvite } from "../src/lib/socialShare";
import { vibesTheme } from "../src/theme/vibesTheme";
import * as ds from "../src/theme/tokens";

export default function EventInviteSheet({
  event,
  classInvite,
  privateChallenge,
  visible,
  onClose,
}: {
  event?: EventFeedItem;
  classInvite?: ClassInvitation;
  /** Private challenge: invites go through challenge invitations (no chat message, no public link). */
  privateChallenge?: { event: EventFeedItem; excludeUserIds: string[] };
  visible: boolean;
  onClose: () => void;
  onDiscover: () => void;
}) {
  const isPrivateChallenge = Boolean(privateChallenge);
  const isClass = Boolean(classInvite);
  const content = privateChallenge?.event ?? classInvite ?? event!;
  const isChallenge = isPrivateChallenge || event?.type === "challenge";
  const matches = useMatchesQuery();
  const eventParticipants = useEventParticipantsQuery(visible && !isClass && !isPrivateChallenge && !isChallenge ? event?.id : undefined);
  const challengeParticipants = useChallengeParticipantsQuery(visible && !isClass && !isPrivateChallenge && isChallenge ? event?.id : undefined);
  const participants = isClass || isPrivateChallenge ? {data: [], isLoading:false, isError:false, refetch:async()=>{}} : isChallenge ? challengeParticipants : eventParticipants;
  const send = useSendDirectMessageMutation();
  const inviteToChallenge = useInviteToChallengeMutation();
  const [search, setSearch] = useState("");
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [sentUserIds, setSentUserIds] = useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const sending = useRef(false);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const invitation = useMemo(() => privateChallenge ? "" : classInvite ? buildClassInvitation(classInvite) : isChallenge ? buildChallengeInvitation(event!) : buildEventInvitation(event!), [event, classInvite, privateChallenge, isChallenge]);
  useEffect(() => {
    setSent(new Set());
    setSentUserIds(new Set());
    setError("");
    setSearch("");
  }, [content.id]);
  // Private challenge: hide pending/accepted invitees, but keep the ones invited in this session visible as "Enviada".
  const excludedIds = privateChallenge
    ? privateChallenge.excludeUserIds.filter(id => !sentUserIds.has(String(id)))
    : (participants.data ?? []).map(person => person.userId);
  const contacts = eligibleInviteContacts(matches.data ?? [], excludedIds, event?.createdBy, search);
  const close = () => {
    if (!sending.current) onClose();
  };
  const invite = async (match: MatchWithProfile) => {
    if (sending.current || sent.has(match.id) || participants.isLoading || participants.isError || !contacts.some(contact => contact.id === match.id)) return;
    sending.current = true;
    setSendingId(match.id);
    setError("");
    try {
      if (privateChallenge) {
        await inviteToChallenge.mutateAsync({ challengeId: privateChallenge.event.id, inviteeIds: [match.otherUserId] });
      } else {
        await send.mutateAsync({ matchId: match.id, body: invitation });
      }
      setSent((current) => new Set([...current, match.id]));
      setSentUserIds((current) => new Set([...current, String(match.otherUserId)]));
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
      sheetStyle={[
        s.sheet,
        {
          maxHeight: height - insets.top - 20,
          paddingBottom: Math.max(insets.bottom, ds.spacing[4]),
        },
      ]}
    >
      <View style={s.header}>
        <Text style={s.title}>{isClass ? "Invitar a la clase" : isChallenge ? "Invitar al desafío" : "Invitar al evento"}</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Cerrar invitaciones"
          onPress={close}
          disabled={!!sendingId}
          style={s.close}
        >
          <Ionicons
            name="close"
            size={ds.iconSize.lg}
            color={vibesTheme.colors.primaryText}
          />
        </TouchableOpacity>
      </View>
      <Text style={s.copy}>
        {isPrivateChallenge ? "Invitá a gente con la que ya conectaste. Recibirá la invitación para unirse al desafío." : "Invitá a gente con la que ya conectaste. Recibirá la invitación en su chat."}
      </Text>
      <View style={s.preview}>
        <Text style={s.previewTitle}>{content.title}</Text>
        <Text style={s.copy}>{isPrivateChallenge ? "Te invito a este desafío privado en Vibes." : isClass ? "Te invito a esta clase en Vibes." : isChallenge ? "Te invito a este desafío en Vibes." : "Te invito a este evento en Vibes."}</Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Invitar por WhatsApp o enlace"
        disabled={!!sendingId}
        style={s.discover}
        onPress={async () => {
          setError("");
          try { await (classInvite ? shareClassInvite(classInvite.title, classInvite.url) : isChallenge ? shareChallengeInvite(privateChallenge?.event ?? event!) : shareEventInvite(event!)); }
          catch { setError("No pudimos abrir las opciones para compartir. Intentá de nuevo."); }
        }}
      >
        <Ionicons name="share-outline" size={ds.iconSize.lg} color={vibesTheme.colors.primaryText} />
        <View style={s.discoverCopy}>
          <Text style={s.name}>Invitar por WhatsApp o enlace</Text>
          <Text style={s.copy}>{isPrivateChallenge ? "El link solo abre el desafío para quienes ya tengan acceso." : "Elegí personas que no estén en tus contactos de Vibes."}</Text>
        </View>
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
      {matches.isLoading || participants.isLoading ? (
        <VibesLoader />
      ) : matches.isError || participants.isError ? (
        <View style={s.empty}>
          <Text style={s.copy}>No pudimos cargar las conexiones o los participantes.</Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => { void matches.refetch(); void participants.refetch(); }}
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
                : matches.data?.some(match => match.isActive)
                  ? "Todas tus conexiones ya participan. No hay personas nuevas para invitar."
                  : "Todavía no tenés conexiones para invitar."}
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
                    <VibesLoader />
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
    borderTopLeftRadius: ds.radii.xl,
    borderTopRightRadius: ds.radii.xl,
    paddingHorizontal: ds.spacing[5],
    paddingTop: ds.spacing[4],
    gap: ds.spacing[3],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: ds.spacing[3],
  },
  title: {
    flex: 1,
    ...ds.textStyles.title,
    color: c.primaryText,
  },
  close: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { color: c.secondaryText, ...ds.textStyles.bodySmall },
  preview: {
    padding: ds.spacing[4],
    borderRadius: ds.radii.lg,
    backgroundColor: ds.colors.bg.selected,
    gap: ds.spacing[1],
  },
  previewTitle: {
    color: c.primaryText,
    ...ds.textStyles.subtitleMedium,
  },
  discover: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
    padding: ds.spacing[4],
    minHeight: 64,
    borderRadius: ds.radii.lg,
    backgroundColor: ds.colors.feedback.infoBg,
  },
  discoverCopy: { flex: 1 },
  name: {
    color: c.primaryText,
    ...ds.textStyles.subtitleMedium,
  },
  search: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: c.secondaryText,
    borderRadius: ds.radii.lg,
    paddingHorizontal: ds.spacing[4],
    color: c.primaryText,
    ...ds.textStyles.body,
  },
  list: { flexGrow: 0, flexShrink: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
    paddingVertical: ds.spacing[3],
  },
  contactName: { flex: 1 },
  invite: {
    minHeight: 48,
    minWidth: 82,
    paddingHorizontal: ds.spacing[3],
    borderRadius: ds.radii.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.accentMustard,
  },
  sent: {
    backgroundColor: ds.colors.feedback.infoBg,
    borderWidth: 1,
    borderColor: c.accentBlue,
  },
  buttonText: {
    color: c.primaryText,
    ...ds.textStyles.labelMedium,
  },
  empty: {
    paddingVertical: ds.spacing[5],
    color: c.secondaryText,
    ...ds.textStyles.body,
    gap: ds.spacing[3],
  },
  error: { color: c.primaryText, ...ds.textStyles.bodySmall },
});
