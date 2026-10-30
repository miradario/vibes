import EnergySlider from "./EnergySlider";
import VibesLoader from "./VibesLoader";
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
import Vibi from "./Vibi";
import { useNavigation } from "@react-navigation/native";
import { useVibiEnabled } from "../src/featureFlags/useVibiEnabled";
import VibiDailyTip from "./VibiDailyTip";
import {
  ENERGY_SOURCES,
  getVibiDailyPrompt,
  claimVibiDailyGreetingForDay,
} from "../src/lib/vibiDailyPrompts";
import { buttonContentColor, buttonDisabled, buttonLabel, buttonStyle } from "./ui/buttonStyles";
import * as ds from "../src/theme/tokens";

export default function DailyMoodCard({
  userId,
  enabled = true,
}: {
  userId?: string;
  enabled?: boolean;
}) {
  const navigation = useNavigation<any>();
  const vibiEnabled = useVibiEnabled();
  const [day, setDay] = useState(localDayKey);
  const prompt = getVibiDailyPrompt(day, userId ?? "");
  const [energy, setEnergy] = useState<Record<string, number>>({});
  const [service, setService] = useState<boolean | null>(null);
  const [draft, setDraft] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const epoch = useRef(0);
  const savingRef = useRef(false);
  const { visible, reduceMotion } = useCalmMotion();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const answerKey = `vibiDailyAnswer:${userId}:${day}`;

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
    if (!userId) {
      setLoading(false);
      return;
    }
    setEnergy({});
    setService(null);
    if (["tip", "person"].includes(getVibiDailyPrompt(day, userId).kind)) {
      setLoading(false);
      return;
    }
    if (getVibiDailyPrompt(day, userId).kind !== "mood") {
      try {
        const answer = await AsyncStorage.getItem(answerKey);
        if (generation !== epoch.current) return;
        if (answer) {
          const saved = JSON.parse(answer);
          if (getVibiDailyPrompt(day, userId).kind === "energy") {
            const scores: Record<string, number> = {};
            ENERGY_SOURCES.forEach((source) => {
              const score = saved?.energy?.[source];
              if (Number.isInteger(score) && score >= 1 && score <= 10)
                scores[source] = score;
            });
            setEnergy(scores);
          } else if (typeof saved?.service === "boolean") {
            setService(saved.service);
          }
        }
      } catch {
        if (generation === epoch.current) {
          setLoadFailed(true);
          setError("No pudimos cargar tu respuesta. Intentá de nuevo.");
        }
      } finally {
        if (generation === epoch.current) setLoading(false);
      }
      return;
    }
    try {
      const { data, error: loadError } = await supabase
        .from("private_user_state")
        .select("mood_day,moods")
        .eq("user_id", userId)
        .maybeSingle();
      if (generation !== epoch.current) return;
      if (loadError) throw loadError;
      const today = data?.mood_day === day;
      const selected =
        today && Array.isArray(data.moods)
          ? data.moods.map((mood: string) =>
              mood === "Sanando" ? "Óptimo" : mood
            )
          : [];
      setDraft(selected);
    } catch {
      if (generation === epoch.current) {
        setLoadFailed(true);
        setError("No pudimos cargar tu estado. Intentá de nuevo.");
      }
    } finally {
      if (generation === epoch.current) setLoading(false);
    }
  }, [day, userId, answerKey]);
  useEffect(() => {
    void load();
    return () => {
      epoch.current++;
    };
  }, [load]);
  useEffect(() => {
    if (!visible) {
      setOpen(false);
      return;
    }
    if (!enabled || !userId) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void claimVibiDailyGreetingForDay(userId, day).then((claimed) => {
        if (claimed && !cancelled) setOpen(true);
      });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [visible, enabled, userId, day]);

  const dismiss = () => {
    if (savingRef.current) return;
    setOpen(false);
  };
  const save = async () => {
    if (prompt.kind === "tip" || prompt.kind === "person") {
      dismiss();
      return;
    }
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
      if (prompt.kind !== "mood") {
        await AsyncStorage.setItem(
          answerKey,
          JSON.stringify(prompt.kind === "energy" ? { energy } : { service })
        );
      } else {
        const { error: saveError } = await supabase
          .from("private_user_state")
          .upsert(
            { user_id: userId, mood_day: day, moods: draft },
            { onConflict: "user_id" }
          );
        if (saveError) throw saveError;
      }
      if (generation !== epoch.current) return;
      setOpen(false);
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
  const incomplete =
    prompt.kind === "energy"
      ? ENERGY_SOURCES.some((source) => !energy[source])
      : prompt.kind === "service" && service === null;
  const saveDisabled = loading || saving || (!loadFailed && incomplete);
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
          paddingBottom: Math.max(insets.bottom, ds.spacing[4]),
        },
      ]}
    >
      <View style={s.handle} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        <View style={s.header}>
          <View style={s.author}>
            <Vibi state="idle" size={56} visible={open && visible && enabled} />
            <Text style={s.authorText}>Vibi</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Cerrar sin guardar"
            disabled={saving}
            onPress={dismiss}
            style={s.close}
          >
            <Ionicons
              name="close"
              size={ds.iconSize.lg}
              color={vibesTheme.colors.secondaryText}
            />
          </TouchableOpacity>
        </View>
        <Text accessibilityRole="header" style={[s.title, prompt.kind === "energy" && { ...ds.textStyles.display }]}>
          {prompt.title}
        </Text>
        {prompt.kind === "mood" ? (
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
                    size={ds.iconSize.md}
                    color={
                      selected
                        ? vibesTheme.colors.primaryText
                        : vibesTheme.colors.accentBlue
                    }
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        ) : prompt.kind === "energy" ? (
          <View style={{ gap: ds.spacing[2] }}>
            <Text style={s.privacyText}>
              Del 1 (muy bajo) al 10 (muy alto).
            </Text>
            <View style={s.energySources}>
            {ENERGY_SOURCES.map((source) => (
              <EnergySlider
                key={source}
                label={source}
                value={energy[source]}
                disabled={loading || saving}
                onChange={(score) => setEnergy((current) => ({ ...current, [source]: score }))}
              />
            ))}
            </View>
          </View>
        ) : prompt.kind === "service" ? (
          <View style={s.energySource}>
            <Text style={s.subtitle}>
              Dar servicio cambia tu vida. Puede ser un pequeño gesto de ayuda.
            </Text>
            <View style={s.options}>
              {[true, false].map((value) => (
                <TouchableOpacity
                  key={String(value)}
                  accessibilityRole="radio"
                  accessibilityState={{
                    selected: service === value,
                    disabled: loading || saving,
                  }}
                  disabled={loading || saving}
                  onPress={() => setService(value)}
                  style={[s.option, service === value && s.selected]}
                >
                  <Text style={s.scoreText}>{value ? "Sí" : "Todavía no"}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : prompt.kind === "person" ? (
          <View style={s.energySource}>
            <Text style={s.subtitle}>
              Vibi puede recomendarte personas para conectar.
            </Text>
            <View style={s.options}>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={!vibiEnabled}
                accessibilityState={{ disabled: !vibiEnabled }}
                style={[s.save, !vibiEnabled && buttonDisabled]}
                onPress={() => {
                  dismiss();
                  navigation.navigate("Vibi", {
                    personRequest: `${userId}:${Date.now()}`,
                  });
                }}
              >
                <Text style={s.saveText}>Sí, recomendame una persona</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                style={s.option}
                onPress={dismiss}
              >
                <Text style={s.scoreText}>No</Text>
              </TouchableOpacity>
            </View>
            {!vibiEnabled ? (
              <Text style={s.privacyText}>
                Las recomendaciones de Vibi todavía no están disponibles.
              </Text>
            ) : null}
          </View>
        ) : (
          <VibiDailyTip
            key={`${userId}:${day}`}
            userId={userId}
            day={day}
            onClose={dismiss}
          />
        )}
        {loading ? (
          <VibesLoader accessibilityLabel="Cargando tu estado" />
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        ) : null}
      </ScrollView>
      {prompt.kind !== "tip" && prompt.kind !== "person" ? (
        <View style={s.footer}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled: saveDisabled, busy: saving }}
            disabled={saveDisabled}
            onPress={() => void (loadFailed ? load() : save())}
            style={[s.save, saveDisabled && buttonDisabled]}
          >
            <Text style={s.saveText}>
              {saving ? "Guardando…" : loadFailed ? "Reintentar" : "Guardar"}
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
      ) : null}
    </AnimatedSheetModal>
  );
}
const s = StyleSheet.create({
  sheet: {
    backgroundColor: vibesTheme.colors.background,
    borderTopLeftRadius: ds.radii.xl,
    borderTopRightRadius: ds.radii.xl,
    maxWidth: 540,
    alignSelf: "center",
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: ds.radii.pill,
    backgroundColor: ds.withAlpha(ds.colors.base.coral, ds.opacity.strong),
    alignSelf: "center",
    marginTop: ds.spacing[3],
    marginBottom: ds.spacing[1],
  },
  content: { paddingHorizontal: ds.spacing[6], paddingBottom: ds.spacing[3] },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ds.spacing[3],
  },
  author: { flexDirection: "row", alignItems: "center", gap: ds.spacing[2] },
  authorText: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.heading,
  },
  energySources: { gap: ds.spacing[5] },
  energySource: { gap: ds.spacing[2] },
  scoreText: { color: vibesTheme.colors.primaryText, ...ds.textStyles.body },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: ds.radii.pill,
    backgroundColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.scrim),
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
    ...ds.textStyles.caption,
    letterSpacing: 2,
    color: vibesTheme.colors.secondaryText,
    marginBottom: ds.spacing[3],
  },
  title: {
    marginBottom: ds.spacing[4],
    ...ds.textStyles.title,
    color: vibesTheme.colors.primaryText,
  },
  subtitle: {
    ...ds.textStyles.body,
    color: vibesTheme.colors.secondaryText,
    marginTop: ds.spacing[2],
    marginBottom: ds.spacing[5],
  },
  options: { flexDirection: "row", flexWrap: "wrap", gap: ds.spacing[2] },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ds.spacing[2],
    minHeight: 48,
    paddingVertical: ds.spacing[3],
    paddingHorizontal: ds.spacing[3],
    borderRadius: ds.radii.lg,
    backgroundColor: vibesTheme.colors.background,
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.scrim),
  },
  selected: {
    backgroundColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.strong),
    borderColor: vibesTheme.colors.accentMustard,
  },
  optionText: {
    ...ds.textStyles.labelMedium,
    color: vibesTheme.colors.secondaryText,
    flexShrink: 1,
  },
  selectedText: { color: vibesTheme.colors.primaryText },
  privacy: {
    flexDirection: "row",
    gap: ds.spacing[2],
    alignItems: "center",
    marginTop: ds.spacing[4],
  },
  privacyText: {
    ...ds.textStyles.caption,
    color: vibesTheme.colors.secondaryText,
    flexShrink: 1,
  },
  error: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.bodySmall,
    marginTop: ds.spacing[3],
  },
  footer: { paddingHorizontal: ds.spacing[6], paddingTop: ds.spacing[3] },
  save: {
    ...buttonStyle("accent", "lg"),
  },
  saveText: {
    ...buttonLabel("lg", "accent"),
  },
  skip: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    padding: ds.spacing[3],
  },
  skipText: { color: vibesTheme.colors.secondaryText, ...ds.textStyles.body },
});
