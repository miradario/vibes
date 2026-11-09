import VibesLoader from "./VibesLoader";
import UnreadBadge from "./UnreadBadge";
import { useCommunityUnreadQuery } from "../src/queries/communityReceipts.queries";
import KeyboardSheetModal from "./KeyboardSheetModal";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text, TextInput } from "./Typography";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedSheetModal from "./AnimatedSheetModal";
import Avatar from "./Avatar";
import { Icon } from "./index";
import {
  useCommunityGroupsQuery,
  useCreateCommunityGroupMutation,
  useCommunityInvitationsQuery,
  useRespondCommunityInvitationMutation,
  type CommunityGroupInvitation,
} from "../src/queries/communityGroups.queries";
import type { MatchWithProfile } from "../src/queries/matches.queries";
import { handleApiError } from "../src/utils/handleApiError";
import { vibesTheme } from "../src/theme/vibesTheme";
import * as ds from "../src/theme/tokens";

export default function CommunityGroups({
  matches,
  groups,
  invitations,
  variant = "list",
  showGroups = true,
}: {
  variant?: "create" | "list";
  // Messages renders the groups itself, merged with event/challenge groups.
  showGroups?: boolean;
  matches: MatchWithProfile[];
  groups: ReturnType<typeof useCommunityGroupsQuery>;
  invitations: ReturnType<typeof useCommunityInvitationsQuery>;
}) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const create = useCreateCommunityGroupMutation();
  const respond = useRespondCommunityInvitationMutation();
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const { data: unread = [] } = useCommunityUnreadQuery();
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [focusedField, setFocusedField] = useState<
    "name" | "description" | null
  >(null);
  const [selected, setSelected] = useState<string[]>([]);
  const open = (id: string, title: string, detail: string) =>
    navigation.navigate(
      "CommunityGroupChat" as never,
      { groupId: id, name: title, description: detail } as never
    );
  const submit = async () => {
    if (!name.trim() || selected.length === 0 || create.isPending) return;
    try {
      const id = await create.mutateAsync({
        name,
        description,
        memberIds: selected,
      });
      setVisible(false);
      open(id, name.trim(), description.trim());
      setName("");
      setDescription("");
      setSelected([]);
    } catch (error) {
      handleApiError(error, { toastTitle: "No se pudo crear el grupo" });
    }
  };
  const answerInvitation = async (invitation: CommunityGroupInvitation, accept: boolean) => {
    if (respond.isPending) return;
    setInvitationError(null);
    try {
      const groupId = await respond.mutateAsync({ id: invitation.id, accept });
      if (accept) open(groupId, invitation.group_name, invitation.group_description);
    } catch (error) {
      setInvitationError("No pudimos responder la invitación. Intentá nuevamente.");
      handleApiError(error, { toastTitle: "No se pudo responder la invitación" });
    }
  };
  return (
    <View
      style={
        variant === "create" ? { maxWidth: "46%", flexShrink: 1 } : s.section
      }
    >
      {variant === "create" ? (
        <TouchableOpacity
          accessibilityRole="button"
          style={s.create}
          onPress={() => setVisible(true)}
        >
          <Icon name="add" size={ds.iconSize.md} color={vibesTheme.colors.primaryText} />
          <Text style={s.createLabel}>Crear grupo</Text>
        </TouchableOpacity>
      ) : null}
      {variant === "list" ? (
        <>
          {invitations.isLoading ? <VibesLoader /> : null}
          {invitations.isError ? (
            <TouchableOpacity accessibilityRole="button" onPress={() => void invitations.refetch()}>
              <Text style={s.hint}>No pudimos cargar tus invitaciones. Tocá para reintentar.</Text>
            </TouchableOpacity>
          ) : null}
          {(invitations.data?.length ?? 0) > 0 ? <Text style={s.heading}>INVITACIONES A GRUPOS</Text> : null}
          {(invitations.data ?? []).map(invitation => (
            <View key={invitation.id} style={s.invitation}>
              <Text style={s.title}>{invitation.group_name}</Text>
              <Text style={s.hint}>{invitation.inviterName} te invita a unirte.</Text>
              {invitation.group_description ? <Text style={s.hint}>{invitation.group_description}</Text> : null}
              <Text style={s.hint}>Solo entrarás al grupo si aceptás.</Text>
              <View style={s.row}>
                <TouchableOpacity accessibilityRole="button" disabled={respond.isPending}
                  onPress={() => void answerInvitation(invitation, true)}
                  style={[s.invitationAction, { backgroundColor: vibesTheme.colors.primaryText, opacity: respond.isPending ? 0.5 : 1 }]}>
                  <Text style={[s.title, { color: vibesTheme.colors.surface }]}>Aceptar</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" disabled={respond.isPending}
                  onPress={() => void answerInvitation(invitation, false)} style={s.invitationAction}>
                  <Text style={s.title}>Rechazar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {respond.isPending ? <VibesLoader /> : null}
          {invitationError ? <Text accessibilityRole="alert" style={s.hint}>{invitationError}</Text> : null}
          {groups.isLoading ? <VibesLoader /> : null}
          {groups.isError ? (
            <TouchableOpacity onPress={() => void groups.refetch()}>
              <Text style={s.hint}>
                No pudimos cargar tus grupos. Tocá para reintentar.
              </Text>
            </TouchableOpacity>
          ) : null}
          {showGroups && (groups.data ?? []).length > 0 ? (
            <Text style={s.heading}>COMUNIDAD</Text>
          ) : null}
          {(showGroups ? groups.data ?? [] : []).map((group) => (
            <TouchableOpacity
              accessibilityRole="button"
              key={group.id}
              style={[s.row, s.conversationRow]}
              onPress={() => open(group.id, group.name, group.description)}
            >
              {group.photoUrl ? (
                <Avatar uri={group.photoUrl} size={48} />
              ) : (
                <View style={s.avatar}>
                  <Icon name="people-outline" size={ds.iconSize.lg} color={vibesTheme.colors.accentMustard} />
                </View>
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={s.title}>
                  {group.name}
                </Text>
                <Text numberOfLines={1} style={s.hint}>
                  {group.lastMessage?.body || "Todavía no hay mensajes"}
                </Text>
              </View>
              <UnreadBadge
                count={Number(
                  unread.find(
                    (r) => r.kind === "group" && r.conversation_id === group.id
                  )?.unread_count ?? 0
                )}
              />
            </TouchableOpacity>
          ))}
        </>
      ) : null}
      <KeyboardSheetModal
        visible={visible}
        onClose={() => {
          if (!create.isPending) setVisible(false);
        }}
      >
        <View style={[s.sheet, { maxHeight: "100%" }]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={s.row}>
              <Text style={[s.title, { flex: 1 }]}>Nuevo grupo</Text>
              <TouchableOpacity
                accessibilityLabel="Cerrar"
                disabled={create.isPending}
                onPress={() => setVisible(false)}
              >
                <Icon name="close" size={ds.iconSize.lg} color={vibesTheme.colors.secondaryText} />
              </TouchableOpacity>
            </View>
            <Text style={s.hint}>
              Elegí un nombre e invitá conexiones. Cada persona deberá aceptar para entrar al grupo.
            </Text>
            <Text style={s.heading}>Nombre del grupo</Text>
            <TextInput
              accessibilityLabel="Nombre del grupo"
              style={[s.input, focusedField === "name" && s.inputFocused]}
              onFocus={() => setFocusedField("name")}
              onBlur={() => setFocusedField(null)}
              placeholderTextColor={vibesTheme.colors.secondaryText}
              selectionColor={vibesTheme.colors.accentMustard}
              placeholder="Por ejemplo, Meditamos juntos"
              value={name}
              onChangeText={setName}
              maxLength={80}
              editable={!create.isPending}
            />
            <Text style={s.heading}>Descripción (opcional)</Text>
            <TextInput
              accessibilityLabel="Descripción del grupo"
              style={[
                s.input,
                s.descriptionInput,
                focusedField === "description" && s.inputFocused,
              ]}
              onFocus={() => setFocusedField("description")}
              onBlur={() => setFocusedField(null)}
              placeholderTextColor={vibesTheme.colors.secondaryText}
              selectionColor={vibesTheme.colors.accentMustard}
              textAlignVertical="top"
              placeholder="¿De qué se trata este grupo?"
              value={description}
              onChangeText={setDescription}
              maxLength={500}
              multiline
              editable={!create.isPending}
            />
            <Text style={s.heading}>
              Invitar conexiones · {selected.length} seleccionadas
            </Text>
            {matches.length === 0 ? (
              <Text style={s.hint}>
                Conectá con alguien para poder invitarlo a tu primer grupo.
              </Text>
            ) : null}
            {matches.map((match) => (
              <TouchableOpacity
                key={match.id}
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked: selected.includes(match.otherUserId),
                }}
                disabled={create.isPending}
                style={s.row}
                onPress={() =>
                  setSelected((ids) =>
                    ids.includes(match.otherUserId)
                      ? ids.filter((id) => id !== match.otherUserId)
                      : ids.length < 100
                      ? [...ids, match.otherUserId]
                      : ids
                  )
                }
              >
                <Avatar uri={match.otherUserPhoto} size={36} />
                <Text style={[s.title, { flex: 1 }]}>
                  {match.otherUserName}
                </Text>
                <Icon
                  name={
                    selected.includes(match.otherUserId)
                      ? "checkbox"
                      : "square-outline"
                  }
                  size={ds.iconSize.lg}
                  color={vibesTheme.colors.accentMustard}
                />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              accessibilityRole="button"
              disabled={
                !name.trim() || selected.length === 0 || create.isPending
              }
              onPress={() => void submit()}
              style={[
                s.button,
                (!name.trim() || selected.length === 0 || create.isPending) && {
                  opacity: 0.5,
                },
              ]}
            >
              <Text style={s.title}>
                {create.isPending ? "Creando…" : "Crear grupo y enviar invitaciones"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardSheetModal>
    </View>
  );
}
const s = StyleSheet.create({
  invitation: {
    padding: ds.spacing[4],
    marginVertical: ds.spacing[2],
    borderRadius: ds.radii.lg,
    borderWidth: 1,
    borderColor: vibesTheme.colors.accentBlue,
    backgroundColor: vibesTheme.colors.surface,
  },
  invitationAction: {
    flex: 1,
    minHeight: 44,
    padding: ds.spacing[3],
    borderRadius: ds.radii.md,
    borderWidth: 1,
    borderColor: vibesTheme.colors.primaryText,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { marginTop: ds.spacing[1], marginBottom: 0 },
  conversationRow: {
    minHeight: 76,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.scrim),
  },
  create: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ds.spacing[2],
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[3],
    borderRadius: ds.radii.lg,
    backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.subtle),
  },
  createLabel: {
    flexShrink: 1,
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.subtitle,
    includeFontPadding: false,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.scrim),
  },
  title: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.subtitleMedium,
  },
  hint: { color: vibesTheme.colors.secondaryText, ...ds.textStyles.bodySmall, marginTop: ds.spacing[1] },
  heading: { color: vibesTheme.colors.secondaryText, ...ds.textStyles.bodySmall, marginTop: ds.spacing[3], marginBottom: ds.spacing[1] },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
    paddingVertical: ds.spacing[3],
  },
  sheet: {
    backgroundColor: vibesTheme.colors.background,
    borderTopLeftRadius: ds.radii.xl,
    borderTopRightRadius: ds.radii.xl,
    padding: ds.spacing[5],
    maxHeight: "85%",
  },
  input: {
    minHeight: 52,
    backgroundColor: ds.colors.bg.selected,
    borderWidth: 1,
    borderColor: vibesTheme.colors.accentCoral,
    borderRadius: ds.radii.md,
    padding: ds.spacing[4],
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.body,
  },
  inputFocused: {
    borderColor: vibesTheme.colors.accentMustard,
    backgroundColor: ds.colors.bg.selected,
  },
  descriptionInput: {
    minHeight: 104,
  },
  button: {
    alignItems: "center",
    backgroundColor: vibesTheme.colors.accentMustard,
    padding: ds.spacing[4],
    borderRadius: ds.radii.lg,
    marginTop: ds.spacing[5],
  },
});
