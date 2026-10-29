import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../src/lib/supabase";
import { vibesTheme } from "../src/theme/vibesTheme";
import { Text } from "./Typography";
import Icon from "./Icon";
import * as ds from "../src/theme/tokens";

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

const HISTORY_KEY = (userId: string) => `vibiDailyTipHistory:${userId}`;
const HISTORY_SIZE = 14;
const readHistory = async (userId: string): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
};
const summarize = (guide: Guide) =>
  [guide.detail.slice(0, 200), ...guide.actions].join(" | ");

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
          body: { locale: "es", recent: await readHistory(userId) },
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
      const history = await readHistory(userId);
      await AsyncStorage.setItem(
        HISTORY_KEY(userId),
        JSON.stringify([summarize(data), ...history].slice(0, HISTORY_SIZE))
      ).catch(() => {});
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
    <View style={[s.card, !accepted && s.cardBare]}>
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
          style={[s.button, s.doneButton]}
        >
          <Icon name="heart-outline" size={ds.iconSize.lg} color={vibesTheme.colors.primaryText} />
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
    marginTop: ds.spacing[6],
    padding: ds.spacing[4],
    gap: ds.spacing[3],
    borderRadius: ds.radii.lg,
    backgroundColor: ds.colors.bg.selected,
  },
  // Sí/No step: the buttons sit directly on the sheet, without the tinted card.
  cardBare: {
    padding: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
  },
  choices: { flexDirection: "row", gap: ds.spacing[3] },
  choice: { flex: 1 },
  secondary: {
    backgroundColor: vibesTheme.colors.background,
    borderWidth: 1,
    borderColor: vibesTheme.colors.secondaryText,
  },
  title: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.heading,
  },
  copy: {
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.body,
  },
  button: {
    minHeight: 48,
    padding: ds.spacing[3],
    borderRadius: ds.radii.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.accentMustard,
  },
  doneButton: { flexDirection: "row", gap: ds.spacing[2] },
  buttonText: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.subtitle,
  },
});
