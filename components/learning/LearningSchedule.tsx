import React, { useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Text } from "../Typography";
import AnimatedSheetModal from "../AnimatedSheetModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { buttonStyle } from "../ui/buttonStyles";
import Icon from "../Icon";
import { learningSchedulePreview } from "../../src/learning/schedule";
import type { LearningSession } from "../../src/learning/types";
import * as ds from "../../src/theme/tokens";
export default function LearningSchedule({ sessions, timezone, teachers }: { sessions: LearningSession[]; timezone: string; teachers?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(false);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const now = Date.now();
  const { ordered, preview, nextId } = learningSchedulePreview(sessions, now);
  if (!ordered.length) return null;
  const visible = expanded ? ordered : preview;
  const time = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: false });
  return <>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Ver programa y próximos encuentros" accessibilityState={{ expanded: open }} onPress={() => {setExpanded(false); setOpen(true);}} style={s.trigger}>
      <Icon name="calendar-outline" size={ds.iconSize.md} color={ds.colors.icon.default} />
      <Text style={[s.label,{flex:1}]}>Ver próximos encuentros</Text>
      <Icon name="chevron-forward" size={ds.iconSize.md} color={ds.colors.icon.default} />
    </TouchableOpacity>
    <AnimatedSheetModal visible={open} onClose={() => setOpen(false)} sheetStyle={[s.sheet,{maxHeight:height-insets.top-ds.spacing[4],paddingBottom:Math.max(insets.bottom,ds.spacing[4])}]}>
    <View style={s.modalHeader}><Text accessibilityRole="header" style={[s.title,{flex:1}]}>Programa y encuentros</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar encuentros" onPress={() => setOpen(false)} style={s.close}><Icon name="close" size={ds.iconSize.lg} color={ds.colors.icon.default} /></TouchableOpacity></View>
    <ScrollView contentContainerStyle={s.block}>
    {teachers ? <Text style={s.meta}>Con {teachers}</Text> : null}
    <View style={s.list}>{visible.map((session, index) => {
      const date = new Date(session.starts_at);
      const inProgress = Date.parse(session.starts_at) < now;
      const next = session.id === nextId;
      return <View key={session.id} style={[s.row, index > 0 && s.separator]}>
        <View style={[s.date, next && s.nextDate]}><Text style={s.day}>{date.toLocaleDateString("es-AR", { timeZone: timezone, day: "numeric" })}</Text><Text style={s.meta}>{date.toLocaleDateString("es-AR", { timeZone: timezone, month: "short" }).replace(".", "").toLocaleUpperCase("es-AR")}</Text></View>
        <View style={s.copy}><Text style={s.label}>Encuentro {ordered.indexOf(session) + 1}</Text><Text style={s.meta}>{time(session.starts_at)}–{time(session.ends_at)}</Text></View>
        {next || inProgress ? <View style={s.badge}><Text style={s.badgeText}>{inProgress ? "En curso" : "Próximo"}</Text></View> : null}
      </View>;
    })}</View>
    {ordered.length > preview.length ? <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={s.more}><Text style={s.label}>{expanded ? "Ver menos encuentros" : `Ver los ${ordered.length} encuentros`}</Text><Icon name={expanded ? "chevron-up" : "chevron-down"} size={ds.iconSize.md} color={ds.colors.icon.default} /></TouchableOpacity> : null}
    <Text style={s.meta}>Horarios de {timezone === "America/Buenos_Aires" || timezone === "America/Argentina/Buenos_Aires" ? "Buenos Aires (UTC−3)" : timezone.replace(/_/g, " ")}</Text>
    </ScrollView>
    </AnimatedSheetModal>
  </>;
}
const s = StyleSheet.create({
  trigger: { ...buttonStyle("accent", "lg"), justifyContent: "flex-start" },
  sheet: { backgroundColor: ds.colors.bg.surface, borderTopLeftRadius: ds.radii.xl, borderTopRightRadius: ds.radii.xl, padding: ds.spacing[4], gap: ds.spacing[3] },
  modalHeader: { flexDirection:"row", alignItems:"center", gap:ds.spacing[2] },
  close: { minWidth:44,minHeight:44,alignItems:"center",justifyContent:"center" },
  block: { gap: ds.spacing[2] }, title: { ...ds.textStyles.title, color: ds.colors.text.primary }, meta: { ...ds.textStyles.bodySmall, color: ds.colors.text.secondary },
  list: { borderWidth: 1, borderColor: ds.colors.border.default, borderRadius: ds.radii.lg, paddingHorizontal: ds.spacing[3] },
  row: { flexDirection: "row", alignItems: "center", gap: ds.spacing[3], paddingVertical: ds.spacing[2] }, separator: { borderTopWidth: 1, borderTopColor: ds.colors.border.subtle },
  date: { width: 48, minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: ds.radii.md, backgroundColor: ds.colors.bg.subtle }, nextDate: { backgroundColor: ds.colors.bg.selected },
  day: { ...ds.textStyles.heading, color: ds.colors.text.primary }, label: { ...ds.textStyles.label, color: ds.colors.text.primary }, copy: { flex: 1, minWidth: 0 },
  badge: { paddingHorizontal: ds.spacing[2], paddingVertical: ds.spacing[1], backgroundColor: ds.colors.bg.selected, borderRadius: ds.radii.pill }, badgeText: { ...ds.textStyles.caption, color: ds.colors.text.onAccent },
  more: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: ds.spacing[2] },
});
