import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Text } from "./Typography";
import Icon from "./Icon";
import { normalizeSchedule, formatSession, formatEventRecurrence } from "../src/lib/eventSchedule";
import { vibesTheme } from "../src/theme/vibesTheme";
import * as ds from "../src/theme/tokens";

export default function EventOccurrenceList({ schedule, startsAt, onCalendar }: {
  schedule: unknown;
  startsAt?: string | null;
  onCalendar: (startsAt: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const entries = normalizeSchedule(schedule, startsAt);
  const frequency = formatEventRecurrence(entries);
  const upcoming = entries.filter(entry => Date.parse(entry.endsAt ?? entry.startsAt) >= Date.now());
  const preview = upcoming.length ? upcoming : entries;
  const visible = frequency && !expanded ? preview.slice(0, 3) : entries;
  return <View>
    {frequency ? <View style={s.intro}>
      <View style={s.badge}><Icon name="repeat" size={ds.iconSize.sm} color={c.primaryText} /><Text style={s.badgeText}>Evento frecuente</Text></View>
      <Text style={s.title}>{frequency}</Text>
      <Text style={s.hint}>{upcoming.length ? "Próximos encuentros" : "Encuentros anteriores"} · {entries.length} en la serie</Text>
      <Text style={s.hint}>La inscripción y los cupos son compartidos por todos los encuentros.</Text>
    </View> : null}
    {visible.map(entry => <TouchableOpacity key={entry.startsAt} accessibilityRole="button" accessibilityLabel={`Agregar ${formatSession(entry.startsAt)} a mi calendario`} onPress={() => onCalendar(entry.startsAt)} style={s.row}>
      <Icon name="calendar-outline" size={ds.iconSize.lg} color={c.accentBlue} />
      <View style={s.copy}><Text style={s.date}>{formatSession(entry.startsAt)}{entry.endsAt ? ` — ${formatSession(entry.endsAt)}` : ""}</Text><Text style={s.hint}>Agregar a mi calendario</Text></View>
    </TouchableOpacity>)}
    {frequency && entries.length > visible.length ? <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded }} style={s.more} onPress={() => setExpanded(true)}>
      <Text style={s.moreText}>Ver las {entries.length} fechas de la serie</Text>
    </TouchableOpacity> : frequency && expanded && entries.length > 3 ? <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded }} style={s.more} onPress={() => setExpanded(false)}><Text style={s.moreText}>Mostrar menos</Text></TouchableOpacity> : null}
  </View>;
}
const c = vibesTheme.colors;
const s = StyleSheet.create({
  intro: { gap: ds.spacing[2], marginTop: ds.spacing[3], marginBottom: ds.spacing[2] },
  badge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: ds.spacing[2], backgroundColor: ds.colors.bg.selected, borderRadius: ds.radii.pill, paddingHorizontal: ds.spacing[3], paddingVertical: ds.spacing[2] },
  badgeText: { color: c.primaryText, ...ds.textStyles.label },
  title: { color: c.primaryText, ...ds.textStyles.subtitle },
  hint: { color: c.secondaryText, ...ds.textStyles.bodySmall },
  row: { flexDirection: "row", alignItems: "center", gap: ds.spacing[4], paddingVertical: ds.spacing[4], minHeight: 48 },
  copy: { flex: 1, gap: ds.spacing[1] },
  date: { color: c.primaryText, ...ds.textStyles.subtitleMedium },
  more: { minHeight: 44, justifyContent: "center", paddingVertical: ds.spacing[3] },
  moreText: { color: c.primaryText, ...ds.textStyles.subtitle, textDecorationLine: "underline" },
});
