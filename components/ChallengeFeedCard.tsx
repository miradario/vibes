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
import * as ds from "../src/theme/tokens";

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
  return <View style={s.card}><TouchableOpacity style={{ gap: ds.spacing[3] }} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Ver ${item.title}${joined ? `, ${completed} de ${timeline.totalDays} días completados` : ""}`} activeOpacity={0.85}>
    <View style={s.row}>
      <MediaImage source={typeof item.image === "string" ? { uri: item.image } : item.image} style={s.photo} />
      <View style={s.copy}>
        {featured ? <ForYouTag /> : null}
        <Text style={s.title}>{item.title}</Text>
        <View style={s.metaRow}>{curated ? null : <><Icon name="people" size={ds.iconSize.sm} color={c.secondaryText} /><Text style={s.meta}>{count} {count === 1 ? "participante" : "participantes"}</Text></>}<Icon name="time-outline" size={ds.iconSize.sm} color={c.secondaryText} /><Text style={s.meta}>{timeline.totalDays} días</Text></View>
        {curated ? null : upcoming ? <View style={s.pending}><Text style={s.pendingText}>{timeline.startsInDays === 1 ? "Empieza mañana" : `Empieza en ${timeline.startsInDays} días`}</Text></View> : !joined ? <Text style={s.caption}>{timeline.status === "finished" ? "Finalizado" : `Día del grupo: ${timeline.currentDay} de ${timeline.totalDays}`}</Text> : null}
      </View>
      <Icon name="chevron-forward" size={ds.iconSize.lg} color={c.secondaryText} />
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
  card: { padding: ds.spacing[4], borderRadius: ds.radii.xl, borderWidth: 1, borderColor: ds.colors.border.default, backgroundColor: c.surface, marginBottom: ds.spacing[3], gap: ds.spacing[3] },
  row: { flexDirection: "row", alignItems: "center", gap: ds.spacing[4] },
  photo: { width: 76, height: 76, borderRadius: ds.radii.md, alignSelf: "flex-start" },
  copy: { flex: 1, minWidth: 0, gap: ds.spacing[2] },
  title: { ...ds.textStyles.subtitle, color: c.primaryText },
  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", columnGap: ds.spacing[1], rowGap: ds.spacing[1] },
  meta: { ...ds.textStyles.caption, color: c.secondaryText },
  caption: { ...ds.textStyles.bodySmall, color: c.secondaryText },
  percent: { ...ds.textStyles.label, color: c.accentBlue },
  progressRow: { flexDirection: "row", alignItems: "center", gap: ds.spacing[3] },
  track: { flex: 1, height: 7, borderRadius: ds.radii.pill, overflow: "hidden", backgroundColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.subtle) },
  fill: { height: "100%", backgroundColor: c.accentBlue, borderRadius: ds.radii.xs },
  pending: { flexDirection: "row", gap: ds.spacing[2], padding: ds.spacing[2], borderRadius: ds.radii.sm, alignSelf: "flex-start", backgroundColor: ds.colors.bg.selected },
  pendingText: { color: c.primaryText, ...ds.textStyles.labelMedium, flexShrink: 1 },
});
