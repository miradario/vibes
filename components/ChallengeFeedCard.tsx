import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "./Typography";
import Icon from "./Icon";
import MediaImage from "./MediaImage";
import { getChallengeTimeline } from "../src/lib/challengeTimeline";
import type { EventFeedItem } from "../src/queries/events.queries";
import ForYouTag from "./ForYouTag";
import { isCuratedChallenge } from "../src/lib/curatedChallenges";
import { vibesTheme } from "../src/theme/vibesTheme";

export default function ChallengeFeedCard({ item, joined, onPress, footer, featured = false }: {
  item: EventFeedItem; joined: boolean; onPress: () => void; footer?: React.ReactNode; featured?: boolean;
}) {
  const timeline = getChallengeTimeline(item.startsAt, item.durationDays);
  const completed = Math.min(timeline.totalDays, Math.max(0, Number(item.viewerCompletedDaysCount) || 0));
  const percent = Math.round(completed / timeline.totalDays * 100);
  const count = item.participantCount ?? (Number.parseInt(item.attendees, 10) || 0);
  const upcoming = timeline.status === "upcoming";
  // Curated "Por Vibes" challenges are a catalog: no participant count or status.
  const curated = isCuratedChallenge(item);
  return <View style={s.card}><TouchableOpacity style={{ gap: 12 }} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Ver ${item.title}${joined ? `, ${completed} de ${timeline.totalDays} días completados` : ""}`} activeOpacity={0.85}>
    <View style={s.row}>
      <MediaImage source={typeof item.image === "string" ? { uri: item.image } : item.image} style={s.photo} />
      <View style={s.copy}>
        {featured ? <ForYouTag /> : null}
        <Text style={s.title}>{item.title}</Text>
        <View style={s.metaRow}>{curated ? null : <><Icon name="people" size={15} color={c.secondaryText} /><Text style={s.meta}>{count} {count === 1 ? "participante" : "participantes"}</Text></>}<Icon name="time-outline" size={15} color={c.secondaryText} /><Text style={s.meta}>{timeline.totalDays} días</Text></View>
        {curated ? null : upcoming ? <View style={s.pending}><Text style={s.pendingText}>{timeline.startsInDays === 1 ? "Empieza mañana" : `Empieza en ${timeline.startsInDays} días`}</Text></View> : !joined ? <Text style={s.caption}>{timeline.status === "finished" ? "Finalizado" : `Día del grupo: ${timeline.currentDay} de ${timeline.totalDays}`}</Text> : null}
      </View>
      <Icon name="chevron-forward" size={22} color={c.secondaryText} />
    </View>
    {joined && !upcoming ? <View style={s.progressRow}>
      <Text style={s.caption}>{completed} de {timeline.totalDays} días</Text>
      <View style={s.track} accessibilityRole="progressbar" accessibilityLabel="Tu avance" accessibilityValue={{ min: 0, max: 100, now: percent }}><View style={[s.fill, { width: `${percent}%` }]} /></View>
      <Text style={s.percent}>{percent}%</Text>
    </View> : null}
  </TouchableOpacity>
    {footer}
  </View>;
}
const c = vibesTheme.colors;
const s = StyleSheet.create({
  card: { padding: 14, borderRadius: 20, borderWidth: 1, borderColor: `${c.primaryText}24`, backgroundColor: c.surface, marginBottom: 12, gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  photo: { width: 76, height: 76, borderRadius: 12, alignSelf: "flex-start" },
  copy: { flex: 1, minWidth: 0, gap: 9 },
  title: { fontFamily: vibesTheme.fonts.bold, fontSize: 17, lineHeight: 23, color: c.primaryText },
  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", columnGap: 5, rowGap: 5 },
  meta: { fontSize: 12, color: c.secondaryText },
  caption: { fontSize: 13, lineHeight: 19, color: c.secondaryText },
  percent: { fontSize: 14, fontFamily: vibesTheme.fonts.bold, color: c.accentBlue },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  track: { flex: 1, height: 7, borderRadius: 5, overflow: "hidden", backgroundColor: `${c.accentBlue}14` },
  fill: { height: "100%", backgroundColor: c.accentBlue, borderRadius: 5 },
  pending: { flexDirection: "row", gap: 6, padding: 8, borderRadius: 8, alignSelf: "flex-start", backgroundColor: `${c.accentMustard}20` },
  pendingText: { color: c.primaryText, fontSize: 13, flexShrink: 1, fontFamily: vibesTheme.fonts.medium },
});
