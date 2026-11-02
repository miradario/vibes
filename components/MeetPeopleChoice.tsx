import React from "react";
import { View, Switch, StyleSheet } from "react-native";
import { Text } from "./Typography";
import { vibesTheme } from "../src/theme/vibesTheme";
import * as ds from "../src/theme/tokens";

export default function MeetPeopleChoice({ enabled, onChange, disabled = false, english = false }: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  english?: boolean;
}) {
  return <View style={s.container}>
    <View style={s.row}>
      <Text style={s.title}>{english ? "Meet people" : "Conocer gente"}</Text>
      <Switch value={enabled} onValueChange={onChange} disabled={disabled}
        accessibilityLabel={english ? "Meet people" : "Conocer gente"}
        accessibilityState={{ disabled, checked: enabled }}
        trackColor={{ false: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.medium), true: c.accentMustard }} thumbColor={c.surface} ios_backgroundColor={ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.medium)} />
    </View>
    <Text style={s.hint}>{english
      ? "Turn this off to use Vibes without meeting people. Your profile will not appear in Discover; Discover and people suggestions on Home will be hidden. You can change this in Settings."
      : "Desactivá esta opción si no querés conocer gente. Tu perfil no aparecerá en Descubrir y se ocultarán esa sección y las sugerencias de personas en Home. Podés cambiarlo en Configuración."}</Text>
  </View>;
}
const c = vibesTheme.colors;
const s = StyleSheet.create({
  container: { padding: ds.spacing[4], borderRadius: ds.radii.lg, backgroundColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.subtle), gap: ds.spacing[2], marginVertical: ds.spacing[4], width: "100%" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: ds.spacing[3], minHeight: 44 },
  title: { flex: 1, color: c.primaryText, ...ds.textStyles.subtitle },
  hint: { color: c.secondaryText, ...ds.textStyles.bodySmall },
});
