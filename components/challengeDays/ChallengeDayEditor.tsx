import { normalizeDayRecording } from "../../src/lib/normalizeDayRecording";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Audio } from "expo-av";
import { randomUUID } from "expo-crypto";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedSheetModal from "../AnimatedSheetModal";
import ScreenContainer from "../ScreenContainer";
import { launchAppCamera } from "../AppCamera";
import { Text, TextInput } from "../Typography";
import { useSaveChallengeDay } from "../../src/queries/challengeDays.queries";
import {
  ChallengeDay,
  DayDraft,
  DraftAttachment,
  MAX_DAY_ATTACHMENTS,
  DAY_MEDIA_BUCKET,
  inferDayMime,
  validateDayDraft,
  validateDayFile,
  parseDayLink,
  moveDayAttachment,
} from "../../src/lib/challengeDayContent";
import {
  stageDayFile,
  resolveDayFile,
  removeDayFile,
} from "../../src/lib/dayDraftFiles";
import { readUriAsArrayBuffer } from "../../src/lib/supabaseStorage";
import { uploadDayAttachment } from "../../src/lib/challengeDayStorage";
import { supabase } from "../../src/lib/supabase";
import { DayButton } from "./DayButton";
import DayAudioPlayer from "./DayAudioPlayer";
import { dayStyles as s } from "./styles";
import { vibesTheme } from "../../src/theme/vibesTheme";
type EditorDraft = DayDraft & {
  removed?: DraftAttachment[];
  pendingLink?: string;
};
const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "No se pudo completar la operación. Reintentá.";
export default function ChallengeDayEditor({
  initial,
  userId,
  onClose,
}: {
  initial: ChallengeDay;
  userId: string;
  onClose: () => void;
}) {
  const key = `challenge-day-draft:${userId}:${initial.challenge_id}:${initial.day}`;
  const [draft, setDraft] = useState<EditorDraft>(initial);
  const current = useRef<EditorDraft>(initial);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(true);
  const writes = useRef(Promise.resolve());
  const [progress, setProgress] = useState<{
    id: string;
    percent: number;
  } | null>(null);
  const [linkInput, setLinkInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<Audio.Recording | null>(null);
  const [conflict, setConflict] = useState<ChallengeDay | null>(null);
  const saveMutation = useSaveChallengeDay();
  const insets = useSafeAreaInsets();
  const persist = (next: EditorDraft) => {
    current.current = next;
    setDraft(next);
    const value = JSON.stringify(next);
    const write = writes.current
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(key, value));
    writes.current = write;
    void write.catch(() => {
      if (mounted.current)
        setError(
          "No pudimos guardar el borrador local. Mantené esta pantalla abierta y reintentá guardar."
        );
    });
    return write;
  };
  useEffect(() => {
    mounted.current = true;
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const value = JSON.parse(stored) as EditorDraft;
          if (
            value.challenge_id !== initial.challenge_id ||
            value.day !== initial.day ||
            !Array.isArray(value.attachments)
          )
            throw new Error("El borrador local no es válido.");
          value.attachments = await Promise.all(
            value.attachments.map(async (item) => {
              if (item.localUri && !item.path) {
                try {
                  return {
                    ...item,
                    localUri: await resolveDayFile(item.id, item.localUri),
                  };
                } catch (e) {
                  return { ...item, error: message(e) };
                }
              }
              return item;
            })
          );
          if (mounted.current) {
            current.current = value;
            setDraft(value);
            setLinkInput(value.pendingLink ?? "");
            setRestored(true);
          }
        }
      } catch (e) {
        if (mounted.current) setError(message(e));
      } finally {
        if (mounted.current) setReady(true);
      }
    })();
    return () => {
      mounted.current = false;
      void recorder.current
        ?.stopAndUnloadAsync()
        .catch(() => undefined)
        .finally(() =>
          Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(
            () => undefined
          )
        );
    };
  }, [key]);
  const appendFile = async (
    type: "photo" | "audio",
    uri: string,
    name: string,
    mime?: string | null,
    size?: number
  ) => {
    if (current.current.attachments.length >= MAX_DAY_ATTACHMENTS)
      throw new Error("Podés agregar hasta 20 contenidos.");
    let actualUri = uri;
    let actualMime = inferDayMime(name, mime);
    if (size) validateDayFile(type, actualMime, size);
    if (type === "photo") {
      const converted = await ImageManipulator.manipulateAsync(uri, [], {
        compress: 0.85,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      actualUri = converted.uri;
      actualMime = "image/jpeg";
      name = name.replace(/\.[^.]+$/, "") + ".jpg";
    }
    const bytes = await readUriAsArrayBuffer(actualUri);
    const format = validateDayFile(type, actualMime, bytes.byteLength);
    const id = randomUUID();
    const localUri = await stageDayFile(id, actualUri, format.extension);
    await persist({
      ...current.current,
      attachments: [
        ...current.current.attachments,
        {
          id,
          type,
          name: name.slice(0, 240),
          mime: format.mime,
          size: bytes.byteLength,
          localUri,
        },
      ],
    });
  };
  const action = async (operation: () => Promise<void>) => {
    if (lock.current || recording || !ready) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await operation();
    } catch (e) {
      setError(message(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const gallery = () =>
    void action(async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit:
          MAX_DAY_ATTACHMENTS - current.current.attachments.length,
        quality: 0.9,
      });
      if (!result.canceled)
        for (const asset of result.assets)
          await appendFile(
            "photo",
            asset.uri,
            asset.fileName ?? "Foto.jpg",
            asset.mimeType ?? "image/jpeg",
            asset.fileSize
          );
    });
  const camera = () =>
    void action(async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted)
        throw new Error("Permití el acceso a la cámara para sacar una foto.");
      // The shared Android camera itself uses AnimatedSheetModal.
      const result = await launchAppCamera({
        mediaTypes: ["images"],
        quality: 0.9,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        await appendFile(
          "photo",
          asset.uri,
          "Foto.jpg",
          asset.mimeType ?? "image/jpeg",
          asset.fileSize
        );
      }
    });
  const audioFile = () =>
    void action(async () => {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["audio/*"],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (!result.canceled)
        for (const asset of result.assets)
          await appendFile(
            "audio",
            asset.uri,
            asset.name,
            asset.mimeType,
            asset.size
          );
    });
  const stopRecording = async () => {
    const currentRecording = recorder.current;
    if (!currentRecording || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await currentRecording.stopAndUnloadAsync();
      recorder.current = null;
      setRecording(false);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = currentRecording.getURI();
      if (!uri)
        throw new Error("No se generó el audio. Intentá grabarlo nuevamente.");
      const normalized = await normalizeDayRecording(uri);
      await appendFile(
        "audio",
        normalized.uri,
        normalized.name,
        normalized.mime
      );
      if (Platform.OS === "web") URL.revokeObjectURL(normalized.uri);
    } catch (e) {
      setError(message(e));
    } finally {
      recorder.current = null;
      setRecording(false);
      lock.current = false;
      setBusy(false);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(
        () => undefined
      );
    }
  };
  const startRecording = () =>
    void action(async () => {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted)
        throw new Error("Permití el acceso al micrófono para grabar audio.");
      // iOS resolves the permission promise before its dialog has fully closed.
      // Wait for the app to regain the audio session before preparing a recorder.
      if (Platform.OS !== "web") {
        const deadline = Date.now() + 4000;
        do {
          await new Promise((resolve) => setTimeout(resolve, 300));
          if (AppState.currentState === "active") break;
        } while (Date.now() < deadline);
        if (AppState.currentState !== "active")
          throw new Error("Volvé a la app y tocá Grabar audio para reintentar.");
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      try {
        const next = new Audio.Recording();
        recorder.current = next;
        await next.prepareToRecordAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        await next.startAsync();
        setSeconds(0);
        setRecording(true);
      } catch (e) {
        await recorder.current?.stopAndUnloadAsync().catch(() => undefined);
        recorder.current = null;
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        throw new Error("No pudimos iniciar la grabación. Volvé a tocar Grabar audio para reintentar.");
      }
    });
  const stopRef = useRef(stopRecording);
  stopRef.current = stopRecording;
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    const limit = setTimeout(() => void stopRef.current(), 5 * 60 * 1000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") void stopRef.current();
    });
    return () => {
      clearInterval(timer);
      clearTimeout(limit);
      sub.remove();
    };
  }, [recording]);
  const addLink = () => {
    try {
      if (current.current.attachments.length >= MAX_DAY_ATTACHMENTS)
        throw new Error("Podés agregar hasta 20 contenidos.");
      const parsed = parseDayLink(linkInput);
      void persist({
        ...current.current,
        pendingLink: "",
        attachments: [
          ...current.current.attachments,
          {
            id: randomUUID(),
            type: "link",
            name: parsed.host,
            url: parsed.url,
          },
        ],
      });
      setLinkInput("");
      setError("");
    } catch (e) {
      setError(message(e));
    }
  };
  const cleanup = async (value: EditorDraft, keepPaths: Set<string>) => {
    const all = [...value.attachments, ...(value.removed ?? [])];
    await Promise.allSettled(
      all.map((item) => removeDayFile(item.id, item.localUri))
    );
    const paths = all.flatMap((item) =>
      item.path && !keepPaths.has(item.path) ? [item.path] : []
    );
    if (paths.length)
      await supabase.storage.from(DAY_MEDIA_BUCKET).remove(paths);
  };
  const save = () =>
    void action(async () => {
      if (linkInput.trim())
        throw new Error(
          "Tocá “Agregar link” para incluir el enlace antes de guardar."
        );
      validateDayDraft(current.current);
      await persist(current.current);
      for (const item of current.current.attachments) {
        if (item.type === "link" || item.path) continue;
        setProgress({ id: item.id, percent: 0 });
        try {
          const path = await uploadDayAttachment(
            initial.challenge_id,
            initial.day,
            item,
            (percent) => setProgress({ id: item.id, percent })
          );
          await persist({
            ...current.current,
            attachments: current.current.attachments.map((a) =>
              a.id === item.id ? { ...a, path, error: undefined } : a
            ),
          });
        } catch (e) {
          await persist({
            ...current.current,
            attachments: current.current.attachments.map((a) =>
              a.id === item.id ? { ...a, error: message(e) } : a
            ),
          });
          setProgress(null);
          throw e;
        }
      }
      setProgress(null);
      let saved: ChallengeDay;
      try {
        saved = await saveMutation.mutateAsync(current.current);
      } catch (e) {
        if (message(e).includes("otro dispositivo")) {
          const latest = await supabase
            .from("challenge_days")
            .select("*")
            .eq("challenge_id", initial.challenge_id)
            .eq("day", initial.day)
            .single();
          if (latest.data) setConflict(latest.data as ChallengeDay);
        }
        throw e;
      }
      const completedDraft = current.current;
      // The server save is authoritative, even if local cleanup fails.
      await persist({ ...saved }).catch(() => undefined);
      await AsyncStorage.removeItem(key).catch(() => undefined);
      await cleanup(
        completedDraft,
        new Set(saved.attachments.flatMap((a) => (a.path ? [a.path] : [])))
      ).catch(() => undefined);
      onClose();
    });
  const close = async () => {
    if (busy || recording) return;
    try {
      await writes.current;
      onClose();
    } catch {
      setError(
        "No pudimos conservar el borrador. Reintentá guardar antes de salir."
      );
    }
  };
  const discard = () =>
    Alert.alert(
      "¿Descartar el borrador?",
      "El contenido publicado se mantiene.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Descartar",
          style: "destructive",
          onPress: () =>
            void action(async () => {
              await writes.current.catch(() => undefined);
              await AsyncStorage.removeItem(key);
              await cleanup(
                current.current,
                new Set(
                  initial.attachments.flatMap((a) => (a.path ? [a.path] : []))
                )
              );
              onClose();
            }),
        },
      ]
    );
  return (
    <AnimatedSheetModal
      visible
      fullScreen
      onClose={() => void close()}
      closeOnBackdropPress={false}
      sheetStyle={s.sheet}
    >
      <ScreenContainer
        edges={["left", "right"]}
        style={[
          s.sheet,
          { paddingTop: Math.max(insets.top, Platform.OS === "ios" ? 60 : 28) },
        ]}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              s.content,
              { paddingBottom: insets.bottom + 24 },
            ]}
          >
            <View style={s.between}>
              <Text style={s.title}>Personalizar día {initial.day}</Text>
              <DayButton
                label="Cerrar"
                disabled={busy || recording}
                onPress={() => void close()}
                style={s.secondary}
                textStyle={s.secondaryButtonText}
              />
            </View>
            <Text style={s.hint}>
              Estos cambios se comparten con todos los participantes.
            </Text>
            {restored ? (
              <Text style={s.hint}>Recuperamos tu borrador pendiente.</Text>
            ) : null}
            {!ready ? (
              <ActivityIndicator color={vibesTheme.colors.primaryText} />
            ) : (
              <>
                <Text style={s.text}>Título</Text>
                <TextInput
                  accessibilityLabel="Título del día"
                  value={draft.title}
                  maxLength={160}
                  editable={!busy && !recording}
                  style={s.input}
                  onChangeText={(title) =>
                    void persist({ ...current.current, title })
                  }
                />
                <Text style={s.text}>Descripción o consigna</Text>
                <TextInput
                  accessibilityLabel="Descripción o consigna"
                  value={draft.description}
                  maxLength={10000}
                  editable={!busy && !recording}
                  multiline
                  style={[
                    s.input,
                    { minHeight: 110, textAlignVertical: "top" },
                  ]}
                  onChangeText={(description) =>
                    void persist({ ...current.current, description })
                  }
                />
                <View style={s.mediaSection}>
                  <Text style={s.sectionTitle}>Sumar contenido</Text>
                  <Text style={s.hint}>
                    Hasta 20 contenidos. Fotos: 10 MB. Audios: 25 MB.
                    Grabación: hasta 5 minutos.
                  </Text>
                </View>
                <View style={s.mediaGrid}>
                  <DayButton
                    label="Cámara"
                    onPress={camera}
                    disabled={
                      busy || recording || draft.attachments.length >= 20
                    }
                    style={s.mediaButton}
                    textStyle={s.mediaButtonText}
                  />
                  <DayButton
                    label="Galería"
                    onPress={gallery}
                    disabled={
                      busy || recording || draft.attachments.length >= 20
                    }
                    style={s.mediaButton}
                    textStyle={s.mediaButtonText}
                  />
                  <DayButton
                    label="Subir audio"
                    onPress={audioFile}
                    disabled={
                      busy || recording || draft.attachments.length >= 20
                    }
                    style={s.mediaButton}
                    textStyle={s.mediaButtonText}
                  />
                  <DayButton
                    label={recording ? `Detener (${seconds}s)` : "Grabar audio"}
                    onPress={
                      recording ? () => void stopRecording() : startRecording
                    }
                    disabled={
                      busy || (!recording && draft.attachments.length >= 20)
                    }
                    style={[s.mediaButton, recording ? s.danger : undefined]}
                    textStyle={s.mediaButtonText}
                  />
                </View>
                {recording ? (
                  <Text accessibilityLiveRegion="polite" style={s.error}>
                    Grabando audio. Detené la grabación para conservarla.
                  </Text>
                ) : null}
                <View style={s.linkBox}>
                  <Text style={s.sectionTitle}>Link o YouTube</Text>
                  <TextInput
                    accessibilityLabel="Enlace del día"
                    placeholder="Pegá el enlace"
                    placeholderTextColor={vibesTheme.colors.secondaryText}
                    value={linkInput}
                    onChangeText={(value) => {
                      setLinkInput(value);
                      void persist({ ...current.current, pendingLink: value });
                    }}
                    autoCapitalize="none"
                    keyboardType="url"
                    editable={!busy && !recording}
                    style={s.linkInput}
                    maxLength={2048}
                  />
                  <DayButton
                    label="Agregar link"
                    onPress={addLink}
                    disabled={busy || recording || !linkInput.trim()}
                    style={s.linkButton}
                  />
                </View>
                {draft.attachments.map((item, index) => (
                  <View key={item.id} style={s.card}>
                    <Text style={s.text}>
                      {index + 1}. {item.name}
                    </Text>
                    {item.type === "photo" && item.localUri ? (
                      <Image source={{ uri: item.localUri }} style={s.image} />
                    ) : null}
                    {item.type === "audio" &&
                    item.localUri &&
                    !recording &&
                    !busy ? (
                      <DayAudioPlayer
                        key={item.localUri}
                        uri={item.localUri}
                        name={item.name}
                      />
                    ) : null}
                    {item.type === "link" ? (
                      <Text style={s.hint} numberOfLines={2}>
                        {item.url}
                      </Text>
                    ) : null}
                    {progress?.id === item.id ? (
                      <Text accessibilityLiveRegion="polite" style={s.text}>
                        Subiendo: {progress.percent}%
                      </Text>
                    ) : item.path ? (
                      <Text style={s.hint}>Archivo subido</Text>
                    ) : null}
                    {item.error ? (
                      <Text style={s.error}>{item.error}</Text>
                    ) : null}
                    <View style={s.row}>
                      <DayButton
                        label={`Subir contenido ${index + 1}`}
                        disabled={busy || recording || index === 0}
                        onPress={() =>
                          void persist({
                            ...current.current,
                            attachments: moveDayAttachment(
                              current.current.attachments,
                              index,
                              -1
                            ),
                          })
                        }
                        style={s.secondary}
                        textStyle={s.secondaryButtonText}
                      />
                      <DayButton
                        label={`Bajar contenido ${index + 1}`}
                        disabled={
                          busy ||
                          recording ||
                          index === draft.attachments.length - 1
                        }
                        onPress={() =>
                          void persist({
                            ...current.current,
                            attachments: moveDayAttachment(
                              current.current.attachments,
                              index,
                              1
                            ),
                          })
                        }
                        style={s.secondary}
                        textStyle={s.secondaryButtonText}
                      />
                      <DayButton
                        label={`Eliminar contenido ${index + 1}`}
                        disabled={busy || recording}
                        style={s.danger}
                        onPress={() =>
                          void persist({
                            ...current.current,
                            attachments: current.current.attachments.filter(
                              (a) => a.id !== item.id
                            ),
                            removed: [...(current.current.removed ?? []), item],
                          })
                        }
                      />
                    </View>
                  </View>
                ))}
                {conflict ? (
                  <View style={s.card}>
                    <Text style={s.title}>Versión publicada</Text>
                    <Text style={s.text}>{conflict.title}</Text>
                    <Text style={s.text}>{conflict.description}</Text>
                    <Text style={s.hint}>
                      {conflict.attachments.length} contenidos. Guardar tu
                      borrador reemplazará esta versión.
                    </Text>
                    <DayButton
                      label="Conservar mis cambios"
                      onPress={() => {
                        void persist({
                          ...current.current,
                          revision: conflict.revision,
                        });
                        setConflict(null);
                        setError("");
                      }}
                    />
                  </View>
                ) : null}
                {error ? (
                  <Text accessibilityRole="alert" style={s.error}>
                    {error}
                  </Text>
                ) : null}
                {busy ? (
                  <ActivityIndicator color={vibesTheme.colors.primaryText} />
                ) : null}
                <View style={s.footerActions}>
                  <DayButton
                    label={
                      busy
                        ? "Guardando…"
                        : error
                        ? "Reintentar guardar"
                        : "Guardar día"
                    }
                    onPress={save}
                    disabled={busy || recording || Boolean(conflict)}
                    style={s.primary}
                  />
                  <DayButton
                    label="Descartar borrador"
                    onPress={discard}
                    disabled={busy || recording}
                    style={s.secondary}
                    textStyle={s.secondaryButtonText}
                  />
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </ScreenContainer>
    </AnimatedSheetModal>
  );
}
