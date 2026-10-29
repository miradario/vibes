import Icon from "../components/Icon";
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { Text } from "../components/Typography";
import { vibesTheme } from "../src/theme/vibesTheme";
import { useI18n } from "../src/i18n";
import Events from "./Events";
import { LearningExplore, LearningCreateAction } from "./Learning";
import * as ds from "../src/theme/tokens";

export function ClassesTab() {
  return <Activities section="classes" />;
}

export default function Activities({ section = "events" }: { section?: "events" | "classes" }) {
  const navigation = useNavigation();
  const activeSection = section;
  const { locale } = useI18n();
  const english = locale.startsWith("en");
  return (
    <ScreenContainer style={s.screen}>
      <View style={s.header}>
        <View style={s.titleRow}><Text accessibilityRole="header" style={s.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{activeSection === "classes" ? (english ? "Classes" : "Clases") : (english ? "Events" : "Eventos")}</Text>{activeSection === "classes" ? <LearningCreateAction /> : <View style={s.actions}>{([["add", "Crear evento", "CreateEvent"], ["archive-outline", "Ver eventos pasados", "PastEvents"]] as const).map(([icon, label, route]) => <TouchableOpacity key={route} accessibilityRole="button" accessibilityLabel={label} style={s.action} onPress={() => navigation.navigate(route as never)}><Icon name={icon} size={ds.iconSize.lg} color={c.primaryText} /></TouchableOpacity>)}</View>}</View>

      </View>
      {activeSection === "events" ? <Events section="event" embedded /> : <LearningExplore embedded />}
    </ScreenContainer>
  );
}
const c = vibesTheme.colors;
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  header: { paddingHorizontal: ds.spacing[5], paddingTop: ds.spacing[3], gap: ds.spacing[4] },
  titleRow: {flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:ds.spacing[2]},
  actions: { flexDirection: "row", gap: ds.spacing[2] },
  action: { width: 44, height: 44, borderRadius: ds.radii.lg, backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.subtle), alignItems: "center", justifyContent: "center" },
  title: { flex: 1, ...ds.textStyles.display, color: c.primaryText },
});
