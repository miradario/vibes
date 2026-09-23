import React from "react";
import {
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedSheetModal from "./AnimatedSheetModal";
import Avatar from "./Avatar";
import Icon from "./Icon";
import { Text } from "./Typography";
import { vibesTheme } from "../src/theme/vibesTheme";

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
        gap: 12,
        alignItems: "center",
        minHeight: 60,
        paddingVertical: 8,
      }}
    >
      <Avatar uri={person.avatarUrl} size={42} />
      <Text style={{ flex: 1, fontSize: 17 }}>
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
        backgroundColor: "#FEFEFD",
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        padding: 20,
        paddingBottom: Math.max(insets.bottom, 20),
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
        <Text style={{ fontSize: 22, fontFamily: vibesTheme.fonts.semibold }}>
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
          <Icon name="close" size={24} color="#403B36" />
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator color="#B98235" />
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
              <Text style={{ marginVertical: 12, color: "#6E6E6E" }}>
                Otros participantes ({others.length})
              </Text>
            </>
          }
          ListEmptyComponent={
            <Text style={{ paddingVertical: 16 }}>
              Todavía no hay otros participantes.
            </Text>
          }
        />
      )}
    </AnimatedSheetModal>
  );
}
