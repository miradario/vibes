import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Avatar from "./Avatar";
import Icon from "./Icon";
import { Text } from "./Typography";
import { vibesTheme } from "../src/theme/vibesTheme";
import type { IncomingLike, MatchWithProfile } from "../src/queries/matches.queries";

type Props = {
  incomingLikes: IncomingLike[];
  newConnections: MatchWithProfile[];
  onRequests: () => void;
  onViewAll: () => void;
  onConnection: (item: MatchWithProfile) => void;
  compact?: boolean;
  canViewPhotos?: boolean;
};
export default function ConnectionStrip({ incomingLikes, newConnections, onRequests, onViewAll, onConnection, compact = false, canViewPhotos = true }: Props) {
  return (<>
        {(incomingLikes.length > 0 || newConnections.length > 0) ? (
          <View style={[s.connectionsStrip, compact && { marginBottom: 12 }]}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Ver nuevas conexiones" onPress={onViewAll} style={s.stripHeading}>
              <Text style={s.stripTitle}>Nuevas conexiones</Text>
              <Icon name="chevron-forward" size={22} color={vibesTheme.colors.secondaryText} />
            </TouchableOpacity>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.stripPeople}>
              {incomingLikes.length > 0 && <>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Ver ${incomingLikes.length} solicitudes de conexión`} onPress={onRequests} style={[s.stripPerson, compact && { width: 62 }]}>
                  <View style={[s.requestAvatarWrap, compact && { width: 54, height: 54 }]}>
                    <View style={[s.stripAvatar, { borderColor: vibesTheme.colors.accentMustard }, compact && { width: 54, height: 54, borderRadius: 27 }]}>
                      <Avatar uri={incomingLikes[0]?.likerUserPhoto ?? null} size={compact ? 48 : 60} blurRadius={16} />
                    </View>
                    <View style={s.requestBadge}><Text style={s.requestCount}>{incomingLikes.length > 99 ? "99+" : incomingLikes.length}</Text></View>
                  </View>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[s.stripName, { fontFamily: vibesTheme.fonts.bold }]}>Solicitudes</Text>
                </TouchableOpacity>
                {newConnections.length > 0 && <View style={[s.stripDivider, compact && { height: 72 }]} />}
              </>}
              {newConnections.map(item => <TouchableOpacity key={item.id} accessibilityRole="button" accessibilityLabel={`Conversar con ${item.otherUserName}`} onPress={() => onConnection(item)} style={[s.stripPerson, compact && { width: 62 }]}>
                <View style={[s.stripAvatar, compact && { width: 54, height: 54, borderRadius: 27 }]}><Avatar uri={canViewPhotos ? item.otherUserPhoto : null} size={compact ? 48 : 60} /></View>
                <Text numberOfLines={1} style={s.stripName}>{item.otherUserName?.trim().split(/\s+/)[0] || "Vibes"}</Text>
              </TouchableOpacity>)}
            </ScrollView>
          </View>
        ) : null}

  </>);
}
const s = StyleSheet.create({
  connectionsStrip: { marginBottom: 20 },
  stripHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44, marginBottom: 8 },
  stripTitle: { color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.bold, fontSize: 19, lineHeight: 25 },
  stripPeople: { alignItems: "flex-start", gap: 12, paddingTop: 6, paddingBottom: 4, paddingRight: 8 },
  stripPerson: { width: 74, alignItems: "center", gap: 8 },
  stripAvatar: { width: 66, height: 66, borderWidth: 2, borderColor: vibesTheme.colors.accentBlue, borderRadius: 33, padding: 1, alignItems: "center", justifyContent: "center", backgroundColor: vibesTheme.colors.surface, overflow: "hidden" },
  requestAvatarWrap: { width: 66, height: 66 },
  requestBadge: { position: "absolute", top: -4, right: -4, minWidth: 24, height: 24, paddingHorizontal: 5, borderRadius: 12, borderWidth: 2, borderColor: vibesTheme.colors.surface, backgroundColor: vibesTheme.colors.accentMustard, alignItems: "center", justifyContent: "center" },
  requestCount: { color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.bold, fontSize: 12 },
  stripName: { color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.regular, fontSize: 12, lineHeight: 16, textAlign: "center" },
  stripDivider: { width: 1, height: 90, backgroundColor: `${vibesTheme.colors.secondaryText}30`, marginHorizontal: 2 },
});
