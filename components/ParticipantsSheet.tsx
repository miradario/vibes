import VibesLoader from "./VibesLoader";
import React from "react";
import { FlatList, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedSheetModal from "./AnimatedSheetModal";
import Avatar from "./Avatar";
import Icon from "./Icon";
import { Text } from "./Typography";
import { vibesTheme } from "../src/theme/vibesTheme";
import * as ds from "../src/theme/tokens";

type Participant = {
  userId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};
export default function ParticipantsSheet({
  visible,
  onClose,
  participants,
  userId,
  loading,
  error,
  retry,
}: {
  visible: boolean;
  onClose: () => void;
  participants: Participant[];
  userId?: string;
  loading?: boolean;
  error?: boolean;
  retry?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const others = participants.filter((person) => person.userId !== userId);
  const self = participants.find((person) => person.userId === userId);
  const row = (person: Participant) => (
    <View
      style={{
        flexDirection: "row",
        gap: ds.spacing[3],
        alignItems: "center",
        minHeight: 60,
        paddingVertical: ds.spacing[2],
      }}
    >
      <Avatar uri={person.avatarUrl} size={42} />
      <Text style={{ flex: 1, ...ds.textStyles.body }}>
        {person.displayName || "Participante"}
        {person.userId === userId ? " (vos)" : ""}
      </Text>
    </View>
  );
  return (
    <AnimatedSheetModal
      visible={visible}
      onClose={onClose}
      sheetStyle={{
        backgroundColor: vibesTheme.colors.background,
        borderTopLeftRadius: ds.radii.xl,
        borderTopRightRadius: ds.radii.xl,
        padding: ds.spacing[5],
        paddingBottom: Math.max(insets.bottom, ds.spacing[5]),
        maxHeight: "80%",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ ...ds.textStyles.title }}>
          Participantes ({participants.length})
        </Text>
        <TouchableOpacity
          accessibilityLabel="Cerrar participantes"
          onPress={onClose}
          style={{
            width: 48,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="close" size={ds.iconSize.lg} color={vibesTheme.colors.primaryText} />
        </TouchableOpacity>
      </View>
      {loading ? (
        <VibesLoader />
      ) : error ? (
        <TouchableOpacity onPress={retry} style={{ minHeight: 48 }}>
          <Text>No pudimos cargar los participantes. Reintentar</Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={others}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => row(item)}
          ListHeaderComponent={
            <>
              {self ? row(self) : null}
              <Text style={{ marginVertical: ds.spacing[3], color: vibesTheme.colors.secondaryText }}>
                Otros participantes ({others.length})
              </Text>
            </>
          }
          ListEmptyComponent={
            <Text style={{ paddingVertical: ds.spacing[4] }}>
              Todavía no hay otros participantes.
            </Text>
          }
        />
      )}
    </AnimatedSheetModal>
  );
}
