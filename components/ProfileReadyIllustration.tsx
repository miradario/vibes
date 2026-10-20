import React from "react";
import { StyleSheet, View } from "react-native";
import Icon from "./Icon";
import PlayfulVibesLogo from "./PlayfulVibesLogo";
import { vibesTheme } from "../src/theme/vibesTheme";

export default function ProfileReadyIllustration(_props: { english?: boolean }) {
  return <View style={s.scene} accessible={false} pointerEvents="none">
    <PlayfulVibesLogo style={s.figure} />
    <View style={s.profileCard}>
      <Icon name="person" size={31} color={vibesTheme.colors.accentBlue} />
      <View style={s.check}><Icon name="checkmark" size={19} color={vibesTheme.colors.primaryText} /></View>
    </View>
  </View>;
}
const s = StyleSheet.create({
  scene: { width: "100%", maxWidth: 320, height: 250, alignSelf: "center", marginTop: 24, marginBottom: 8 },
  figure: { position: "absolute", width: 170, height: 204, bottom: 0, left: 50 },
  profileCard: { position: "absolute", right: 68, top: 123, width: 45, height: 55, borderRadius: 8, borderWidth: 3, borderColor: vibesTheme.colors.accentBlue, backgroundColor: vibesTheme.colors.surface, alignItems: "center", justifyContent: "center", transform: [{ rotate: "12deg" }] },
  check: { position: "absolute", top: -12, right: -12, width: 28, height: 28, borderRadius: 14, backgroundColor: vibesTheme.colors.accentBlue, borderWidth: 3, borderColor: vibesTheme.colors.surface, alignItems: "center", justifyContent: "center" },
});
