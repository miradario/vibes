import React, { useRef } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedSheetModal from "../AnimatedSheetModal";
import Icon from "../Icon";
import { Text } from "../Typography";
import MyReservations from "./MyReservations";
import type { ActivitiesKind } from "../../src/featureFlags/activities";
import * as ds from "../../src/theme/tokens";

/** Share of the window the sheet takes (tall sheet, below the status bar). */
const SHEET_HEIGHT = 0.9;

/**
 * Mis reservas as a tall bottom sheet (AnimatedSheetModal, fixed header with close, scroll and
 * bottom safe area). Opening a detail closes the sheet first and navigates on onClosed, so the
 * new screen isn't pushed behind the modal.
 */
export default function MyReservationsSheet({ visible, onClose, kinds }: { visible: boolean; onClose: () => void; kinds: ActivitiesKind[] }) {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const pending = useRef<{ route: string; params?: Record<string, unknown> } | null>(null);
  const sheetHeight = Math.min(Math.round(height * SHEET_HEIGHT), height - insets.top - ds.spacing[4]);
  return (
    <AnimatedSheetModal
      visible={visible}
      onClose={onClose}
      onClosed={() => {
        const next = pending.current;
        pending.current = null;
        if (next) nav.navigate(next.route, next.params);
      }}
      sheetStyle={[s.sheet, { height: sheetHeight, paddingBottom: Math.max(insets.bottom, ds.spacing[4]) }]}
    >
      <View style={s.header}>
        <Text accessibilityRole="header" style={s.title}>Mis reservas</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar mis reservas" onPress={onClose} style={s.close}>
          <Icon name="close" size={ds.iconSize.lg} color={ds.colors.icon.default} />
        </TouchableOpacity>
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <MyReservations kinds={kinds} navigate={(route, params) => { pending.current = { route, params }; onClose(); }} />
      </ScrollView>
    </AnimatedSheetModal>
  );
}

const s = StyleSheet.create({
  sheet: { backgroundColor: ds.colors.bg.surface, borderTopLeftRadius: ds.radii.xl, borderTopRightRadius: ds.radii.xl, paddingTop: ds.spacing[4], paddingHorizontal: ds.spacing[5], gap: ds.spacing[3] },
  header: { flexDirection: "row", alignItems: "center", gap: ds.spacing[2] },
  title: { flex: 1, ...ds.textStyles.title, color: ds.colors.text.primary },
  close: { minWidth: ds.touchTarget, minHeight: ds.touchTarget, alignItems: "center", justifyContent: "center" },
  scroll: { flex: 1 },
  content: { paddingBottom: ds.spacing[4] },
});
