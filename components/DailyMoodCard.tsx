import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../src/lib/supabase";
import { localDayKey, MOODS } from "../src/lib/profileQuestions";
import SelectablePill from "./onboarding/SelectablePill";

export default function DailyMoodCard({ userId }: { userId?: string }) {
  const [day, setDay] = useState(localDayKey);
  const [moods, setMoods] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const epoch = useRef(0);
  const refreshDay = useCallback(() => setDay(localDayKey()), []);
  useFocusEffect(refreshDay);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshDay();
    });
    const timer = setInterval(refreshDay, 30000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [refreshDay]);
  const load = useCallback(async () => {
    const generation = ++epoch.current;
    setMoods([]);
    setLoading(true);
    setError("");
    if (!userId) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("private_user_state")
      .select("mood_day,moods")
      .eq("user_id", userId)
      .maybeSingle();
    if (generation !== epoch.current) return;
    if (error) setError("No pudimos cargar tu estado. Reintentar");
    else setMoods(data?.mood_day === day ? data.moods : []);
    setLoading(false);
  }, [day, userId]);
  useEffect(() => {
    void load();
    return () => {
      epoch.current++;
    };
  }, [load]);
  const toggle = async (mood: string) => {
    if (!userId || loading || saving || error) return;
    if (localDayKey() !== day) {
      refreshDay();
      return;
    }
    const previous = moods;
    const next = moods.includes(mood)
      ? moods.filter((v) => v !== mood)
      : [...moods, mood];
    const generation = epoch.current;
    setMoods(next);
    setSaving(true);
    const { error: saveError } = await supabase
      .from("private_user_state")
      .upsert(
        { user_id: userId, mood_day: day, moods: next },
        { onConflict: "user_id" }
      );
    if (generation === epoch.current && saveError) {
      setMoods(previous);
      setError("No pudimos guardar tu estado. Reintentar");
    }
    setSaving(false);
  };
  return (
    <View
      style={{
        padding: 18,
        borderRadius: 24,
        backgroundColor: "#FFF",
        marginVertical: 16,
      }}
    >
      <Text style={{ fontSize: 22, color: "#2B2B2B", marginBottom: 8 }}>
        ¿Cómo te sentís hoy?
      </Text>
      <Text style={{ color: "#6E6E6E", marginBottom: 14 }}>
        Solo vos podés verlo. Elegí todas las que quieras.
      </Text>
      {error ? (
        <TouchableOpacity onPress={() => void load()}>
          <Text accessibilityRole="alert">{error}</Text>
        </TouchableOpacity>
      ) : loading ? (
        <Text>Cargando…</Text>
      ) : (
        <View
          pointerEvents={saving ? "none" : "auto"}
          style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
        >
          {MOODS.map((mood) => (
            <SelectablePill
              key={mood}
              label={mood}
              selected={moods.includes(mood)}
              onPress={() => void toggle(mood)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
