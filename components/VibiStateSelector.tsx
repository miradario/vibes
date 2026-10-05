import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import AnimatedSheetModal from "./AnimatedSheetModal";
import { Text } from "./Typography";
import { vibesTheme } from "../src/theme/vibesTheme";
import {
  VIBI_ANIMATIONS,
  VIBI_LOOPS,
  playAnimation,
} from "../src/vibi/controller";
import { useVibi } from "../src/vibi/useVibi";
import type { VibiClipInfo } from "../src/vibi/animation";
const colors = vibesTheme.colors;
export default function VibiStateSelector({ info }: { info?: VibiClipInfo[] }) {
  const [open, setOpen] = useState(false);
  const state = useVibi();
  if (!__DEV__) return null;
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Probar estados de Vibi"
        style={styles.trigger}
      >
        <Text style={styles.triggerText}>Estados</Text>
      </Pressable>
      <AnimatedSheetModal
        visible={open}
        onClose={() => setOpen(false)}
        sheetStyle={styles.sheet}
      >
        <Text style={styles.title}>Vibi · estados de desarrollo</Text>
        <Text style={styles.subtitle}>
          Estado: {state.animation}.{" "}
          {info
            ? "Duraciones verificadas al cargar el GLB."
            : "Modelo 3D no disponible; se muestra la alternativa estática."}
        </Text>
        <ScrollView style={styles.list}>
          {VIBI_ANIMATIONS.map((name) => {
            const clip = info?.find((item) => item.name === name);
            return (
              <Pressable
                key={name}
                accessibilityRole="button"
                accessibilityState={{ selected: state.animation === name }}
                onPress={() => {
                  playAnimation(name);
                  setOpen(false);
                }}
                style={[
                  styles.item,
                  state.animation === name && styles.selected,
                ]}
              >
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.detail}>
                  {clip ? `${clip.duration.toFixed(2)} s` : "Sin cargar"} ·{" "}
                  {VIBI_LOOPS.has(name) ? "bucle" : "una vez"}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          style={styles.close}
        >
          <Text style={styles.name}>Cerrar</Text>
        </Pressable>
      </AnimatedSheetModal>
    </>
  );
}
const styles = StyleSheet.create({
  trigger: {
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accentBlue,
  },
  triggerText: { fontSize: 11, color: colors.primaryText },
  sheet: {
    padding: 20,
    paddingBottom: 32,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  title: { fontSize: 22, color: colors.primaryText },
  subtitle: {
    marginTop: 8,
    marginBottom: 12,
    fontSize: 14,
    color: colors.secondaryText,
  },
  list: { maxHeight: 380 },
  item: {
    padding: 12,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.secondaryText,
  },
  selected: {
    backgroundColor: colors.accentMustard,
    borderColor: colors.primaryText,
  },
  name: { fontSize: 16, color: colors.primaryText },
  detail: { marginTop: 3, fontSize: 12, color: colors.primaryText },
  close: {
    alignItems: "center",
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.accentMustard,
  },
});
