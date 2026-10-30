import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Avatar from "./Avatar";
import SectionHeader from "./ui/SectionHeader";
import { Text } from "./Typography";
import { vibesTheme } from "../src/theme/vibesTheme";
import { useConnectionStripVisibility } from "../src/hooks/useConnectionStripVisibility";
import type { IncomingLike, MatchWithProfile } from "../src/queries/matches.queries";
import * as ds from "../src/theme/tokens";

type Props = {
  incomingLikes: IncomingLike[];
  newConnections: MatchWithProfile[];
  onRequests: () => void;
  onViewAll: () => void;
  onConnection: (item: MatchWithProfile) => void;
  compact?: boolean;
  persistent?: boolean;
  canViewPhotos?: boolean;
  blurHiddenPhotos?: boolean;
};
const MAX_STACKED_REQUESTS = 3;
const STRIP_PADDING_TOP = 4;
const NAME_GAP = 4;
const NAME_LINE_HEIGHT = 16;
export default function ConnectionStrip({ incomingLikes: allIncomingLikes, newConnections: allNewConnections, onRequests, onViewAll, onConnection, compact = false, persistent = false, canViewPhotos = true, blurHiddenPhotos = false }: Props) {
  const visibility = useConnectionStripVisibility(allNewConnections, allIncomingLikes, persistent);
  const incomingLikes = visibility.requests;
  const newConnections = visibility.connections;
  // Home can show blurred previews; other surfaces retain their photo gate.
  const stackedLikes = incomingLikes.slice(0, MAX_STACKED_REQUESTS);
  const avatarBox = compact ? 48 : 54;
  const avatarSize = compact ? 42 : 48;
  const stackStep = Math.round(avatarBox * 0.55);
  const stackWidth = avatarBox + Math.max(0, stackedLikes.length - 1) * stackStep;
  return (<>
        {(incomingLikes.length > 0 || newConnections.length > 0) ? (
          <View style={[s.connectionsStrip, compact && { marginBottom: ds.spacing[2] }]}>
            <View style={[s.stripHeadingRow, compact && { marginBottom: 0 }]}>
<SectionHeader title="Nuevas conexiones" accessibilityLabel="Ver nuevas conexiones" onPress={onViewAll} style={s.stripHeading} />
            </View>
            <View style={s.stripRow}>
            <ScrollView style={s.stripScroll} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.stripPeople}>
              {incomingLikes.length > 0 && <>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Ver ${incomingLikes.length} solicitudes de conexión`} onPress={onRequests} style={[s.stripPerson, { width: stackWidth }]}>
                  <View style={[s.requestStack, { width: stackWidth, height: avatarBox }]}>
                    {stackedLikes.map((like, index) => (
                      <View key={like.id ?? index} style={[s.stripAvatar, s.stackedAvatar, { width: avatarBox, height: avatarBox, borderRadius: avatarBox / 2, left: index * stackStep, zIndex: stackedLikes.length - index }]}>
                        <Avatar uri={canViewPhotos || blurHiddenPhotos ? like.likerUserPhoto ?? null : null} blurRadius={!canViewPhotos && blurHiddenPhotos ? 24 : 0} size={avatarSize} />
                      </View>
                    ))}
                    <View pointerEvents="none" style={s.requestBadge}><Text style={s.requestCount}>{incomingLikes.length > 99 ? "99+" : incomingLikes.length}</Text></View>
                  </View>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[s.stripName, { fontFamily: vibesTheme.fonts.bold }]}>Solicitudes</Text>
                </TouchableOpacity>
                {newConnections.length > 0 && <View style={[s.stripDivider, compact && { height: 64 }]} />}
              </>}
              {newConnections.map(item => <TouchableOpacity key={item.id} accessibilityRole="button" accessibilityLabel={`Conversar con ${item.otherUserName}`} onPress={() => onConnection(item)} style={[s.stripPerson, compact && { width: 54 }]}>
                <View style={[s.stripAvatar, compact && { width: 48, height: 48, borderRadius: ds.radii.pill }]}><Avatar uri={canViewPhotos || blurHiddenPhotos ? item.otherUserPhoto : null} blurRadius={!canViewPhotos && blurHiddenPhotos ? 24 : 0} size={avatarSize} /></View>
                <Text numberOfLines={1} style={s.stripName}>{item.otherUserName?.trim().split(/\s+/)[0] || "Vibes"}</Text>
              </TouchableOpacity>)}
            </ScrollView>
            </View>
          </View>
        ) : null}

  </>);
}
const s = StyleSheet.create({
  connectionsStrip: { marginBottom: ds.spacing[3] },
  stripHeadingRow: { flexDirection: "row", alignItems: "center", marginBottom: 0 },
  stripHeading: { flex: 1, marginBottom: -ds.spacing[2] },
  stripRow: { flexDirection: "row", alignItems: "flex-start" },
  stripScroll: { flex: 1 },
  stripPeople: { alignItems: "flex-start", gap: ds.spacing[2], paddingTop: STRIP_PADDING_TOP, paddingBottom: ds.spacing[1], paddingRight: ds.spacing[2] },
  stripPerson: { width: 62, alignItems: "center", gap: NAME_GAP },
  stripAvatar: { width: 54, height: 54, borderWidth: 2, borderColor: vibesTheme.colors.accentBlue, borderRadius: ds.radii.pill, padding: ds.spacing[0], alignItems: "center", justifyContent: "center", backgroundColor: vibesTheme.colors.surface, overflow: "hidden" },
  requestStack: { position: "relative" },
  stackedAvatar: { position: "absolute", top: 0, borderColor: vibesTheme.colors.accentMustard },
  requestBadge: { zIndex: MAX_STACKED_REQUESTS + 1, position: "absolute", top: -4, right: -4, minWidth: 24, height: 24, paddingHorizontal: ds.spacing[1], borderRadius: ds.radii.pill, borderWidth: 2, borderColor: vibesTheme.colors.surface, backgroundColor: vibesTheme.colors.accentMustard, alignItems: "center", justifyContent: "center" },
  requestCount: { color: vibesTheme.colors.primaryText, ...ds.textStyles.caption },
  stripName: { color: vibesTheme.colors.primaryText, ...ds.textStyles.caption, lineHeight: NAME_LINE_HEIGHT, textAlign: "center" },
  stripDivider: { width: 1, height: 72, backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.medium), marginHorizontal: ds.spacing[1] },
});
