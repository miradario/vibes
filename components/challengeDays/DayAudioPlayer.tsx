import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Audio, AVPlaybackStatus } from "expo-av";
import { Text } from "../Typography";
import { DayButton } from "./DayButton";
import { dayStyles as s } from "./styles";
import { vibesTheme } from "../../src/theme/vibesTheme";
const time = (ms: number) =>
  `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(
    2,
    "0"
  )}`;
export default function DayAudioPlayer({
  uri,
  name,
}: {
  uri: string;
  name: string;
}) {
  const sound = useRef<Audio.Sound | null>(null);
  const alive = useRef(true);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      const current = sound.current;
      sound.current = null;
      void current?.unloadAsync().catch(() => undefined);
    };
  }, [uri]);
  const play = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
      if (!sound.current) {
        const current = new Audio.Sound();
        sound.current = current;
        current.setOnPlaybackStatusUpdate((value) => {
          if (alive.current) {
            setStatus(value);
            if (!value.isLoaded && value.error)
              setError(
                "No se pudo reproducir el audio. Reintentá o elegí otro formato."
              );
          }
        });
        await current.loadAsync({ uri });
        if (!alive.current) {
          await current.unloadAsync();
          return;
        }
      }
      const current = sound.current;
      const state = await current.getStatusAsync();
      if (state.isLoaded && state.isPlaying) await current.pauseAsync();
      else if (
        state.isLoaded &&
        state.durationMillis &&
        state.positionMillis >= state.durationMillis
      )
        await current.replayAsync();
      else await current.playAsync();
    } catch {
      await sound.current?.unloadAsync().catch(() => undefined);
      sound.current = null;
      if (alive.current)
        setError(
          "No se pudo reproducir el audio. Revisá la conexión y reintentá. Si persiste, el formato no es compatible con este dispositivo."
        );
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const seek = async (delta: number) => {
    if (!status?.isLoaded || !sound.current) return;
    try {
      await sound.current.setPositionAsync(
        Math.max(
          0,
          Math.min(
            status.durationMillis ?? Infinity,
            status.positionMillis + delta
          )
        )
      );
    } catch {
      setError("No se pudo cambiar la posición del audio. Reintentá.");
    }
  };
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.text}>{name}</Text>
      <View style={s.row}>
        <DayButton
          label={
            error
              ? "Reintentar audio"
              : status?.isLoaded && status.isPlaying
              ? "Pausar"
              : "Reproducir"
          }
          disabled={busy}
          onPress={() => void play()}
        />
        {busy && <ActivityIndicator color={vibesTheme.colors.primaryText} />}
        <DayButton
          label="−15 s"
          disabled={!status?.isLoaded || busy}
          onPress={() => void seek(-15000)}
        />
        <DayButton
          label="+15 s"
          disabled={!status?.isLoaded || busy}
          onPress={() => void seek(15000)}
        />
      </View>
      <Text style={s.hint}>
        {time(status?.isLoaded ? status.positionMillis : 0)} /{" "}
        {time(status?.isLoaded ? status.durationMillis ?? 0 : 0)}
      </Text>
      {error ? (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
