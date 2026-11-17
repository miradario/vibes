import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "../Typography";
import Icon from "../Icon";
import { cardStyles } from "../ui/surfaceStyles";
import { sessionNeedsStudent, sessionStatusLabel, sessionWhen, type StudentSession } from "../../src/sessions/sessions";
import * as ds from "../../src/theme/tokens";

/** Card of a student session: title, facilitator, date and a status pill. Needs-action
 * sessions (confirm or pay) use the accent card tone so they stand out in lists. */
export default function SessionCard({ session, onPress }: { session: StudentSession; onPress: () => void }) {
  const needs = sessionNeedsStudent(session);
  const status = needs === "pay" ? "Pago pendiente" : sessionStatusLabel(session);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Ver sesión ${session.title} con ${session.organizer_name}, ${status}`}
      activeOpacity={ds.opacity.pressed}
      onPress={onPress}
      style={[needs ? cardStyles.accent : cardStyles.base, cardStyles.padding, s.card]}
    >
      <View style={s.copy}>
        <Text style={s.title} numberOfLines={2}>{session.title}</Text>
        <Text style={s.meta} numberOfLines={1}>{session.organizer_name}</Text>
        <Text style={s.meta}>{sessionWhen(session)}</Text>
        <View style={[s.pill, needs ? s.pillAction : session.status === "pending" ? s.pillPending : null]}>
          <Text style={s.pillText}>{status}</Text>
        </View>
      </View>
      <Icon name="chevron-forward" size={ds.iconSize.md} color={ds.colors.icon.muted} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: ds.spacing[3] },
  copy: { flex: 1, gap: ds.spacing[1], minWidth: 0 },
  title: { ...ds.textStyles.subtitle, color: ds.colors.text.primary },
  meta: { ...ds.textStyles.bodySmall, color: ds.colors.text.secondary },
  pill: { alignSelf: "flex-start", marginTop: ds.spacing[1], paddingHorizontal: ds.spacing[2], paddingVertical: ds.spacing[1], borderRadius: ds.radii.pill, backgroundColor: ds.colors.feedback.infoBg },
  pillPending: { backgroundColor: ds.colors.bg.selected },
  pillAction: { backgroundColor: ds.colors.feedback.warningBg },
  pillText: { ...ds.textStyles.caption, color: ds.colors.text.primary },
});
