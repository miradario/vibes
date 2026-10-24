import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Text } from "./Typography";
import Icon from "./Icon";
import { normalizeSchedule, formatSession, formatEventRecurrence } from "../src/lib/eventSchedule";
import { vibesTheme } from "../src/theme/vibesTheme";

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
      <View style={s.badge}><Icon name="repeat" size={17} color={c.primaryText} /><Text style={s.badgeText}>Evento frecuente</Text></View>
      <Text style={s.title}>{frequency}</Text>
      <Text style={s.hint}>{upcoming.length ? "Próximos encuentros" : "Encuentros anteriores"} · {entries.length} en la serie</Text>
      <Text style={s.hint}>La inscripción y los cupos son compartidos por todos los encuentros.</Text>
    </View> : null}
    {visible.map(entry => <TouchableOpacity key={entry.startsAt} accessibilityRole="button" accessibilityLabel={`Agregar ${formatSession(entry.startsAt)} a mi calendario`} onPress={() => onCalendar(entry.startsAt)} style={s.row}>
      <Icon name="calendar-outline" size={25} color={c.accentBlue} />
      <View style={s.copy}><Text style={s.date}>{formatSession(entry.startsAt)}{entry.endsAt ? ` — ${formatSession(entry.endsAt)}` : ""}</Text><Text style={s.hint}>Agregar a mi calendario</Text></View>
    </TouchableOpacity>)}
    {frequency && entries.length > visible.length ? <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded }} style={s.more} onPress={() => setExpanded(true)}>
      <Text style={s.moreText}>Ver las {entries.length} fechas de la serie</Text>
    </TouchableOpacity> : frequency && expanded && entries.length > 3 ? <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded }} style={s.more} onPress={() => setExpanded(false)}><Text style={s.moreText}>Mostrar menos</Text></TouchableOpacity> : null}
  </View>;
}
const c = vibesTheme.colors;
const s = StyleSheet.create({
  intro: { gap: 8, marginTop: 12, marginBottom: 8 },
  badge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: `${c.accentMustard}24`, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { color: c.primaryText, fontSize: 13, lineHeight: 18, fontFamily: vibesTheme.fonts.semibold },
  title: { color: c.primaryText, fontSize: 16, lineHeight: 24, fontFamily: vibesTheme.fonts.semibold },
  hint: { color: c.secondaryText, fontSize: 14, lineHeight: 20, fontFamily: vibesTheme.fonts.regular },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, minHeight: 48 },
  copy: { flex: 1, gap: 4 },
  date: { color: c.primaryText, fontSize: 16, lineHeight: 24, fontFamily: vibesTheme.fonts.medium },
  more: { minHeight: 44, justifyContent: "center", paddingVertical: 10 },
  moreText: { color: c.primaryText, fontSize: 16, lineHeight: 22, fontFamily: vibesTheme.fonts.semibold, textDecorationLine: "underline" },
});
