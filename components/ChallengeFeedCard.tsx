import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "./Typography";
import Icon from "./Icon";
import MediaImage from "./MediaImage";
import { getChallengeTimeline } from "../src/lib/challengeTimeline";
import type { EventFeedItem } from "../src/queries/events.queries";
import { vibesTheme } from "../src/theme/vibesTheme";

export default function ChallengeFeedCard({ item, joined, featured, onPress }: {
  item: EventFeedItem; joined: boolean; featured: boolean; onPress: () => void;
}) {
  const timeline = getChallengeTimeline(item.startsAt, item.durationDays);
  const completed = Math.min(timeline.totalDays, Math.max(0, Number(item.viewerCompletedDaysCount) || 0));
  const percent = Math.round(completed / timeline.totalDays * 100);
  const count = item.participantCount ?? (Number.parseInt(item.attendees, 10) || 0);
  const upcoming = timeline.status === "upcoming";
  return <TouchableOpacity style={[s.card, featured && s.featured]} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Ver ${item.title}${joined ? `, ${completed} de ${timeline.totalDays} días completados` : ""}`} activeOpacity={0.85}>
    <View style={s.row}>
      <MediaImage source={typeof item.image === "string" ? { uri: item.image } : item.image} style={s.photo} />
      <View style={s.copy}>
        <Text style={s.title}>{item.title}</Text>
        <View style={s.metaRow}><Icon name="people" size={15} color={c.secondaryText} /><Text style={s.meta}>{count} {count === 1 ? "participante" : "participantes"}</Text><Icon name="time-outline" size={15} color={c.secondaryText} /><Text style={s.meta}>{timeline.totalDays} días</Text></View>
        {upcoming ? <View style={s.pending}><Icon name="time-outline" size={16} color={c.primaryText} /><Text style={s.pendingText}>{timeline.startsInDays === 1 ? "Empieza mañana" : `Empieza en ${timeline.startsInDays} días`}</Text></View> : joined ? <>
          {featured ? <Text style={s.groupDay}>Día del grupo: {timeline.currentDay} de {timeline.totalDays}</Text> : null}
          <Text style={s.caption}>{featured ? "Tu avance" : `Tu avance: ${completed} de ${timeline.totalDays} días`}</Text>
          <View style={s.progressCopy}>{featured ? <Text style={s.completed}>{completed} de {timeline.totalDays} días completados</Text> : <View />}<Text style={s.percent}>{percent}%</Text></View>
          <View style={s.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }}><View style={[s.fill, { width: `${percent}%` }]} /></View>
        </> : <Text style={s.caption}>{timeline.status === "finished" ? "Finalizado" : `Día del grupo: ${timeline.currentDay} de ${timeline.totalDays}`}</Text>}
      </View>
      {!featured ? <Icon name="chevron-forward" size={22} color={c.secondaryText} /> : null}
    </View>
    {featured ? <View style={s.action}><Text style={s.actionText}>Ver actividad de hoy</Text><Icon name="arrow-forward" size={23} color={c.surface} /></View> : null}
  </TouchableOpacity>;
}
const c = vibesTheme.colors;
const s = StyleSheet.create({
  card: { padding: 14, borderRadius: 20, borderWidth: 1, borderColor: `${c.primaryText}24`, backgroundColor: c.surface, marginBottom: 12, gap: 18 },
  featured: { backgroundColor: `${c.accentBlue}10`, borderColor: `${c.accentBlue}28` },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  photo: { width: 84, height: 96, borderRadius: 12, alignSelf: "flex-start" },
  copy: { flex: 1, minWidth: 0, gap: 9 },
  title: { fontFamily: vibesTheme.fonts.bold, fontSize: 17, lineHeight: 23, color: c.primaryText },
  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", columnGap: 5, rowGap: 5 },
  meta: { fontSize: 12, color: c.secondaryText },
  groupDay: { alignSelf: "flex-start", padding: 6, borderRadius: 7, backgroundColor: `${c.accentBlue}12`, fontSize: 12, color: c.secondaryText },
  caption: { fontSize: 13, lineHeight: 19, color: c.secondaryText },
  progressCopy: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  completed: { flex: 1, color: c.primaryText, fontSize: 13, lineHeight: 19, fontFamily: vibesTheme.fonts.semibold },
  percent: { fontSize: 14, fontFamily: vibesTheme.fonts.bold, color: c.accentBlue },
  track: { height: 9, borderRadius: 5, overflow: "hidden", backgroundColor: `${c.accentBlue}14` },
  fill: { height: "100%", backgroundColor: c.accentBlue, borderRadius: 5 },
  pending: { flexDirection: "row", gap: 6, padding: 8, borderRadius: 8, alignSelf: "flex-start", backgroundColor: `${c.accentMustard}20` },
  pendingText: { color: c.primaryText, fontSize: 13, flexShrink: 1, fontFamily: vibesTheme.fonts.medium },
  action: { minHeight: 50, borderRadius: 25, backgroundColor: c.primaryText, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, gap: 10 },
  actionText: { color: c.surface, fontFamily: vibesTheme.fonts.semibold, fontSize: 16, flexShrink: 1 },
});
