import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../src/lib/supabase";
import { vibesTheme } from "../src/theme/vibesTheme";
import { Text } from "./Typography";

type Guide = { detail: string; actions: string[] };
const validGuide = (value: unknown): value is Guide => {
  const guide = value as Guide | null;
  return (
    !!guide &&
    typeof guide.detail === "string" &&
    !!guide.detail.trim() &&
    Array.isArray(guide.actions) &&
    guide.actions.length === 3 &&
    guide.actions.every(
      (action) => typeof action === "string" && !!action.trim()
    )
  );
};

export default function VibiDailyTip({
  userId,
  day,
  onClose,
}: {
  userId: string;
  day: string;
  onClose: () => void;
}) {
  const cacheKey = `vibiDailyTip:${userId}:${day}`;
  const [accepted, setAccepted] = useState(false);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const inFlight = useRef(false);
  useEffect(() => {
    const current = ++generation.current;
    setAccepted(false);
    setGuide(null);
    setError("");
    setBusy(false);
    inFlight.current = false;
    void AsyncStorage.getItem(cacheKey)
      .then((cached) => {
        if (current !== generation.current || !cached) return;
        try {
          const parsed: unknown = JSON.parse(cached);
          if (validGuide(parsed)) setGuide(parsed);
        } catch {
          /* Ignore invalid cache and allow a fresh request. */
        }
      })
      .catch(() => {});
    return () => {
      generation.current++;
    };
  }, [cacheKey]);
  const generate = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const current = generation.current;
    setBusy(true);
    setError("");
    try {
      const { data, error: requestError } = await supabase.functions.invoke(
        "daily-guide",
        {
          body: { locale: "es" },
          timeout: 60000,
        }
      );
      if (requestError || !validGuide(data))
        throw new Error("guide_unavailable");
      if (current !== generation.current) return;
      setGuide(data);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data)).catch(
        () => {}
      );
    } catch {
      if (current === generation.current)
        setError("No pude generar tu consejo. Podés intentar de nuevo.");
    } finally {
      if (current === generation.current) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  };
  return (
    <View style={s.card}>
      {!accepted ? (
        <View style={s.choices}>
          <TouchableOpacity
            accessibilityRole="button"
            style={[s.button, s.choice]}
            onPress={() => {
              setAccepted(true);
              if (!guide) void generate();
            }}
          >
            <Text style={s.buttonText}>Sí</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            style={[s.button, s.choice, s.secondary]}
            onPress={onClose}
          >
            <Text style={s.buttonText}>No</Text>
          </TouchableOpacity>
        </View>
      ) : guide ? (
        <>
          <Text style={s.title}>Cómo tener un gran día · IA</Text>
          <Text style={s.copy}>{guide.detail}</Text>
          {guide.actions.map((action, index) => (
            <Text key={index} style={s.copy}>
              {index + 1}. {action}
            </Text>
          ))}
        </>
      ) : (
        <>
          <Text style={s.copy}>
            Vibi te comparte un consejo generado por IA para hoy.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={busy}
            accessibilityState={{ disabled: busy, busy }}
            onPress={() => void generate()}
            style={[s.button, busy && { opacity: 0.5 }]}
          >
            <Text style={s.buttonText}>
              {busy
                ? "Vibi está pensando…"
                : error
                ? "Reintentar consejo"
                : "Dame un consejo"}
            </Text>
          </TouchableOpacity>
        </>
      )}
      {accepted ? (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onClose}
          style={s.button}
        >
          <Text style={s.buttonText}>Listo</Text>
        </TouchableOpacity>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={s.copy}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
const s = StyleSheet.create({
  card: {
    marginTop: 24,
    padding: 16,
    gap: 12,
    borderRadius: 18,
    backgroundColor: "rgba(244, 163, 64, 0.16)",
  },
  choices: { flexDirection: "row", gap: 12 },
  choice: { flex: 1 },
  secondary: {
    backgroundColor: vibesTheme.colors.background,
    borderWidth: 1,
    borderColor: vibesTheme.colors.secondaryText,
  },
  title: {
    color: vibesTheme.colors.primaryText,
    fontSize: 16,
    fontFamily: vibesTheme.fonts.medium,
  },
  copy: {
    color: vibesTheme.colors.secondaryText,
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    minHeight: 48,
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.accentMustard,
  },
  buttonText: {
    color: vibesTheme.colors.primaryText,
    fontSize: 15,
    fontFamily: vibesTheme.fonts.medium,
  },
});
