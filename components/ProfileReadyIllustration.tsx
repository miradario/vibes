import React from "react";
import { StyleSheet, View } from "react-native";
import Icon from "./Icon";
import PlayfulVibesLogo from "./PlayfulVibesLogo";
import { vibesTheme } from "../src/theme/vibesTheme";
import * as ds from "../src/theme/tokens";

export default function ProfileReadyIllustration(_props: { english?: boolean }) {
  return <View style={s.scene} accessible={false} pointerEvents="none">
    <PlayfulVibesLogo style={s.figure} />
    <View style={s.profileCard}>
      <Icon name="person" size={ds.iconSize.xl} color={vibesTheme.colors.accentBlue} />
      <View style={s.check}><Icon name="checkmark" size={ds.iconSize.md} color={vibesTheme.colors.primaryText} /></View>
    </View>
  </View>;
}
const s = StyleSheet.create({
  scene: { width: "100%", maxWidth: 320, height: 250, alignSelf: "center", marginTop: ds.spacing[6], marginBottom: ds.spacing[2] },
  figure: { position: "absolute", width: 170, height: 204, bottom: 0, left: 50 },
  profileCard: { position: "absolute", right: 68, top: 123, width: 45, height: 55, borderRadius: ds.radii.sm, borderWidth: 3, borderColor: vibesTheme.colors.accentBlue, backgroundColor: vibesTheme.colors.surface, alignItems: "center", justifyContent: "center", transform: [{ rotate: "12deg" }] },
  check: { position: "absolute", top: -12, right: -12, width: 28, height: 28, borderRadius: ds.radii.pill, backgroundColor: vibesTheme.colors.accentBlue, borderWidth: 3, borderColor: vibesTheme.colors.surface, alignItems: "center", justifyContent: "center" },
});
