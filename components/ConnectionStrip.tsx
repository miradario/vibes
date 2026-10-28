import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Avatar from "./Avatar";
import Icon from "./Icon";
import { Text } from "./Typography";
import { vibesTheme } from "../src/theme/vibesTheme";
import { useConnectionStripVisibility } from "../src/hooks/useConnectionStripVisibility";
import type { IncomingLike, MatchWithProfile } from "../src/queries/matches.queries";

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
          <View style={[s.connectionsStrip, compact && { marginBottom: 8 }]}>
            <View style={[s.stripHeadingRow, compact && { marginBottom: 0 }]}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Ver nuevas conexiones" onPress={onViewAll} style={s.stripHeading}>
                <Text style={s.stripTitle}>Nuevas conexiones</Text>
                {/* Same chevron as Home's SectionHeader ("Tus desafíos", "Eventos para vos"). */}
                <Icon name="chevron-forward" size={20} color={vibesTheme.colors.accentMustard} />
              </TouchableOpacity>
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
                <View style={[s.stripAvatar, compact && { width: 48, height: 48, borderRadius: 24 }]}><Avatar uri={canViewPhotos || blurHiddenPhotos ? item.otherUserPhoto : null} blurRadius={!canViewPhotos && blurHiddenPhotos ? 24 : 0} size={avatarSize} /></View>
                <Text numberOfLines={1} style={s.stripName}>{item.otherUserName?.trim().split(/\s+/)[0] || "Vibes"}</Text>
              </TouchableOpacity>)}
            </ScrollView>
            </View>
          </View>
        ) : null}

  </>);
}
const s = StyleSheet.create({
  connectionsStrip: { marginBottom: 12 },
  stripHeadingRow: { flexDirection: "row", alignItems: "center", marginBottom: 0 },
  stripHeading: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44, marginBottom: -8 },
  stripRow: { flexDirection: "row", alignItems: "flex-start" },
  stripScroll: { flex: 1 },
  stripTitle: { color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.bold, fontSize: 19, lineHeight: 25 },
  stripPeople: { alignItems: "flex-start", gap: 8, paddingTop: STRIP_PADDING_TOP, paddingBottom: 4, paddingRight: 8 },
  stripPerson: { width: 62, alignItems: "center", gap: NAME_GAP },
  stripAvatar: { width: 54, height: 54, borderWidth: 2, borderColor: vibesTheme.colors.accentBlue, borderRadius: 27, padding: 1, alignItems: "center", justifyContent: "center", backgroundColor: vibesTheme.colors.surface, overflow: "hidden" },
  requestStack: { position: "relative" },
  stackedAvatar: { position: "absolute", top: 0, borderColor: vibesTheme.colors.accentMustard },
  requestBadge: { zIndex: MAX_STACKED_REQUESTS + 1, position: "absolute", top: -4, right: -4, minWidth: 24, height: 24, paddingHorizontal: 5, borderRadius: 12, borderWidth: 2, borderColor: vibesTheme.colors.surface, backgroundColor: vibesTheme.colors.accentMustard, alignItems: "center", justifyContent: "center" },
  requestCount: { color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.bold, fontSize: 12 },
  stripName: { color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.regular, fontSize: 12, lineHeight: NAME_LINE_HEIGHT, textAlign: "center" },
  stripDivider: { width: 1, height: 72, backgroundColor: `${vibesTheme.colors.secondaryText}30`, marginHorizontal: 2 },
});
