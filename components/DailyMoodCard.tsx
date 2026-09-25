import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "./Typography";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../src/lib/supabase";
import { localDayKey, MOODS } from "../src/lib/profileQuestions";
import { useCalmMotion } from "../src/hooks/useCalmMotion";
import { vibesTheme } from "../src/theme/vibesTheme";
import AnimatedSheetModal from "./AnimatedSheetModal";

export default function DailyMoodCard({
  userId,
  enabled = true,
}: {
  userId?: string;
  enabled?: boolean;
}) {
  const [day, setDay] = useState(localDayKey);
  const [draft, setDraft] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [due, setDue] = useState(false);
  const epoch = useRef(0);
  const savingRef = useRef(false);
  const { visible, reduceMotion } = useCalmMotion();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const storageKey = `dailyMoodPrompt:${userId}`;

  useEffect(() => {
    const refresh = () => setDay(localDayKey());
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    const timer = setInterval(refresh, 30000);
    refresh();
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);

  const load = useCallback(async () => {
    const generation = ++epoch.current;
    setLoading(true);
    setLoadFailed(false);
    setError("");
    setDue(false);
    if (!userId) {
      setLoading(false);
      return;
    }
    let dismissedToday = false;
    try {
      const [{ data, error: loadError }, dismissed] = await Promise.all([
        supabase
          .from("private_user_state")
          .select("mood_day,moods")
          .eq("user_id", userId)
          .maybeSingle(),
        AsyncStorage.getItem(storageKey).catch(() => null),
      ]);
      if (generation !== epoch.current) return;
      dismissedToday = dismissed === day;
      if (loadError) throw loadError;
      const today = data?.mood_day === day;
      const selected = today && Array.isArray(data.moods) ? data.moods.map((mood: string) => mood === "Sanando" ? "Óptimo" : mood) : [];
      setDraft(selected);
      setDue(!today && dismissed !== day);
    } catch {
      if (generation === epoch.current) {
        setDue(!dismissedToday);
        setLoadFailed(true);
        setError("No pudimos cargar tu estado. Intentá de nuevo.");
      }
    } finally {
      if (generation === epoch.current) setLoading(false);
    }
  }, [day, userId, storageKey]);
  useEffect(() => {
    void load();
    return () => {
      epoch.current++;
    };
  }, [load]);
  useEffect(() => {
    if (!visible || !enabled || loading || !due) return;
    const timer = setTimeout(() => setOpen(true), 350);
    return () => clearTimeout(timer);
  }, [visible, enabled, loading, due]);

  const dismiss = () => {
    if (savingRef.current) return;
    setOpen(false);
    setDue(false);
    void AsyncStorage.setItem(storageKey, day).catch(() => {});
  };
  const save = async () => {
    if (!userId || loading || savingRef.current) return;
    if (localDayKey() !== day) {
      setDay(localDayKey());
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError("");
    const generation = epoch.current;
    try {
      const { error: saveError } = await supabase
        .from("private_user_state")
        .upsert(
          { user_id: userId, mood_day: day, moods: draft },
          { onConflict: "user_id" }
        );
      if (saveError) throw saveError;
      if (generation !== epoch.current) return;
      setOpen(false);
      setDue(false);
      void AsyncStorage.setItem(storageKey, day).catch(() => {});
    } catch {
      if (generation === epoch.current)
        setError(
          "No pudimos guardar. Tus opciones siguen seleccionadas; intentá de nuevo."
        );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  if (!userId) return null;
  return (
    <AnimatedSheetModal
      visible={open && visible && enabled}
      onClose={dismiss}
      closeOnBackdropPress={!saving}
      offsetY={reduceMotion ? 0 : 80}
      sheetInDuration={reduceMotion ? 0 : 260}
      sheetOutDuration={reduceMotion ? 0 : 180}
      sheetInDelay={0}
      sheetStyle={[
        s.sheet,
        {
          maxHeight: height - insets.top - 16,
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      <View style={s.handle} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        <View style={s.header}>
          <View />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Cerrar sin guardar"
            disabled={saving}
            onPress={dismiss}
            style={s.close}
          >
            <Ionicons name="close" size={23} color={vibesTheme.colors.secondaryText} />
          </TouchableOpacity>
        </View>
        <Text accessibilityRole="header" style={s.title}>
          ¿Cómo te sentís hoy?
        </Text>
        <View style={s.options}>
          {MOODS.map((mood) => {
            const selected = draft.includes(mood);
            return (
              <TouchableOpacity
                key={mood}
                accessibilityRole="checkbox"
                accessibilityLabel={mood}
                accessibilityState={{
                  checked: selected,
                  disabled: loading || saving,
                }}
                disabled={loading || saving}
                onPress={() =>
                  setDraft((current) =>
                    current.includes(mood)
                      ? current.filter((v) => v !== mood)
                      : [...current, mood]
                  )
                }
                style={[s.option, selected && s.selected]}
                activeOpacity={0.75}
              >
                <Text style={[s.optionText, selected && s.selectedText]}>
                  {mood}
                </Text>
                <Ionicons
                  name={selected ? "checkmark-circle" : "ellipse-outline"}
                  size={18}
                  color={selected ? vibesTheme.colors.primaryText : vibesTheme.colors.accentBlue}
                />
              </TouchableOpacity>
            );
          })}
        </View>
        {loading ? (
          <Text style={s.privacyText}>Cargando tu estado…</Text>
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        ) : null}
      </ScrollView>
      <View style={s.footer}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: loading || saving, busy: saving }}
          disabled={loading || saving}
          onPress={() => void (loadFailed ? load() : save())}
          style={[s.save, (loading || saving) && { opacity: 0.5 }]}
        >
          <Text style={s.saveText}>
            {saving
              ? "Guardando…"
              : loadFailed
              ? "Reintentar"
              : "Guardar"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          disabled={saving}
          onPress={dismiss}
          style={s.skip}
        >
          <Text style={s.skipText}>Ahora no</Text>
        </TouchableOpacity>
      </View>
    </AnimatedSheetModal>
  );
}
const s = StyleSheet.create({
  sheet: {
    backgroundColor: vibesTheme.colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxWidth: 540,
    alignSelf: "center",
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(216, 140, 122, 0.39)",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  content: { paddingHorizontal: 24, paddingBottom: 10 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(228, 183, 110, 0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  close: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    color: vibesTheme.colors.secondaryText,
    marginBottom: 10,
  },
  title: {
    marginBottom: 14,
    fontSize: 27,
    lineHeight: 33,
    color: vibesTheme.colors.primaryText,
    fontFamily: vibesTheme.fonts.medium,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: vibesTheme.colors.secondaryText,
    marginTop: 8,
    marginBottom: 20,
  },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: 17,
    backgroundColor: vibesTheme.colors.background,
    borderWidth: 1,
    borderColor: "rgba(110, 110, 110, 0.30)",
  },
  selected: { backgroundColor: "rgba(228, 183, 110, 0.39)", borderColor: vibesTheme.colors.accentMustard },
  optionText: {
    fontSize: 14,
    color: vibesTheme.colors.secondaryText,
    fontFamily: vibesTheme.fonts.medium,
    flexShrink: 1,
  },
  selectedText: { color: vibesTheme.colors.secondaryText },
  privacy: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    marginTop: 18,
  },
  privacyText: {
    fontSize: 12,
    lineHeight: 18,
    color: vibesTheme.colors.secondaryText,
    flexShrink: 1,
  },
  error: { color: vibesTheme.colors.primaryText, fontSize: 14, lineHeight: 20, marginTop: 10 },
  footer: { paddingHorizontal: 24, paddingTop: 10 },
  save: {
    minHeight: 52,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.accentMustard,
    borderRadius: 20,
  },
  saveText: {
    color: vibesTheme.colors.primaryText,
    fontSize: 17,
    fontFamily: vibesTheme.fonts.medium,
  },
  skip: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  skipText: { color: vibesTheme.colors.secondaryText, fontSize: 15 },
});
