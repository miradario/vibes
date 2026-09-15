import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedSheetModal from "./AnimatedSheetModal";
import Avatar from "./Avatar";
import { Icon } from "./index";
import {
  useCommunityGroupsQuery,
  useCreateCommunityGroupMutation,
} from "../src/queries/communityGroups.queries";
import type { MatchWithProfile } from "../src/queries/matches.queries";
import { handleApiError } from "../src/utils/handleApiError";
import { vibesTheme } from "../src/theme/vibesTheme";

export default function CommunityGroups({
  matches,
  groups,
  variant = "list",
}: {
  variant?: "create" | "list";
  matches: MatchWithProfile[];
  groups: ReturnType<typeof useCommunityGroupsQuery>;
}) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const create = useCreateCommunityGroupMutation();
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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
  return (
    <View style={variant === "create" ? undefined : s.section}>
      {variant === "create" ? (
        <TouchableOpacity
          accessibilityRole="button"
          style={s.create}
          onPress={() => setVisible(true)}
        >
          <Icon name="add" size={21} color="#B57716" />
          <Text style={s.createLabel}>Crear grupo</Text>
        </TouchableOpacity>
      ) : null}
      {variant === "list" ? (
        <>
          {groups.isLoading ? <ActivityIndicator color="#B98235" /> : null}
          {groups.isError ? (
            <TouchableOpacity onPress={() => void groups.refetch()}>
              <Text style={s.hint}>
                No pudimos cargar tus grupos. Tocá para reintentar.
              </Text>
            </TouchableOpacity>
          ) : null}
          {(groups.data ?? []).length > 0 ? (
            <Text style={s.heading}>COMUNIDAD</Text>
          ) : null}
          {(groups.data ?? []).map((group) => (
            <TouchableOpacity
              accessibilityRole="button"
              key={group.id}
              style={s.row}
              onPress={() => open(group.id, group.name, group.description)}
            >
              <View style={s.avatar}>
                <Icon name="people-outline" size={26} color="#B57716" />
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={s.title}>
                  {group.name}
                </Text>
                <Text numberOfLines={1} style={s.hint}>
                  {group.description || "Abrir conversación"}
                </Text>
              </View>
              <Icon name="chevron-forward" size={18} color="#7B746C" />
            </TouchableOpacity>
          ))}
        </>
      ) : null}
      <AnimatedSheetModal
        visible={visible}
        onClose={() => {
          if (!create.isPending) setVisible(false);
        }}
        closeOnBackdropPress={!create.isPending}
        sheetStyle={[s.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={s.row}>
              <Text style={[s.title, { flex: 1 }]}>Nuevo grupo</Text>
              <TouchableOpacity
                accessibilityLabel="Cerrar"
                disabled={create.isPending}
                onPress={() => setVisible(false)}
              >
                <Icon name="close" size={24} color="#7B746C" />
              </TouchableOpacity>
            </View>
            <Text style={s.hint}>
              Elegí un nombre y sumá conexiones para compartir lo que les gusta.
            </Text>
            <Text style={s.heading}>Nombre del grupo</Text>
            <TextInput
              accessibilityLabel="Nombre del grupo"
              style={s.input}
              placeholder="Por ejemplo, Meditamos juntos"
              value={name}
              onChangeText={setName}
              maxLength={80}
              editable={!create.isPending}
            />
            <Text style={s.heading}>Descripción (opcional)</Text>
            <TextInput
              accessibilityLabel="Descripción del grupo"
              style={s.input}
              placeholder="¿De qué se trata este grupo?"
              value={description}
              onChangeText={setDescription}
              maxLength={500}
              multiline
              editable={!create.isPending}
            />
            <Text style={s.heading}>
              Sumar conexiones · {selected.length} seleccionadas
            </Text>
            {matches.length === 0 ? (
              <Text style={s.hint}>
                Conectá con alguien para poder sumarlo a tu primer grupo.
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
                  size={24}
                  color="#B98235"
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
                {create.isPending ? "Creando…" : "Crear grupo"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </AnimatedSheetModal>
    </View>
  );
}
const s = StyleSheet.create({
  section: { marginVertical: 12 },
  create: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#B57716",
  },
  createLabel: {
    color: "#B57716",
    fontSize: 14,
    fontFamily: vibesTheme.fonts.medium,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FBECD5",
  },
  title: {
    color: "#403B36",
    fontSize: 17,
    fontFamily: vibesTheme.fonts.medium,
  },
  hint: { color: "#7B746C", fontSize: 14, marginTop: 4 },
  heading: { color: "#7B746C", fontSize: 14, marginTop: 18, marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  sheet: {
    backgroundColor: "#FEFEFD",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    maxHeight: "85%",
  },
  input: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    color: "#403B36",
    fontSize: 16,
  },
  button: {
    alignItems: "center",
    backgroundColor: "#E4B76E",
    padding: 16,
    borderRadius: 14,
    marginTop: 20,
  },
});
