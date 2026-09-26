import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { randomUUID } from "expo-crypto";
import AnimatedSheetModal from "./AnimatedSheetModal";
import Icon from "./Icon";
import { Text } from "./Typography";
import { supabase } from "../src/lib/supabase";
import { readUriAsArrayBuffer } from "../src/lib/supabaseStorage";
import { ChatPhotoKind, photoMessage } from "../src/lib/chatPhotos";
import { vibesTheme } from "../src/theme/vibesTheme";

export default function ChatPhotoButton({
  kind,
  chatId,
  userId,
  disabled,
  onSend,
}: {
  kind: ChatPhotoKind;
  chatId?: string;
  userId?: string;
  disabled?: boolean;
  onSend: (body: string) => Promise<unknown>;
}) {
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const pick = async () => {
    if (lock.current) return;
    lock.current = true;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (!result.canceled) setAsset(result.assets[0]);
    } catch {
      Alert.alert(
        "Fotos",
        "No se pudo abrir la galería. Revisá los permisos de la app."
      );
    } finally {
      lock.current = false;
    }
  };
  const send = async () => {
    if (!asset || !chatId || !userId || lock.current) return;
    lock.current = true;
    setBusy(true);
    let path: string | null = null;
    let sent = false;
    try {
      const mime = asset.mimeType ?? "image/jpeg";
      const ext = (
        {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
        } as Record<string, string>
      )[mime];
      if (!ext) throw new Error("Elegí una foto JPG, PNG o WebP.");
      if (asset.fileSize && asset.fileSize > 10485760)
        throw new Error("La foto debe pesar menos de 10 MB.");
      const bytes = await readUriAsArrayBuffer(asset.uri);
      if (bytes.byteLength > 10485760)
        throw new Error("La foto debe pesar menos de 10 MB.");
      const nextPath = `${kind}/${chatId}/${userId}/${randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("chat-photos")
        .upload(nextPath, bytes, { contentType: mime });
      if (error) throw error;
      path = nextPath;
      await onSend(photoMessage(path));
      sent = true;
      setAsset(null);
    } catch (error) {
      Alert.alert(
        "No se pudo enviar la foto",
        error instanceof Error ? error.message : "Intentá de nuevo."
      );
    } finally {
      if (path && !sent)
        await supabase.storage
          .from("chat-photos")
          .remove([path])
          .catch(() => undefined);
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Enviar foto"
        style={s.button}
        disabled={disabled || busy || !chatId || !userId}
        onPress={() => void pick()}
      >
        <Icon
          name="image-outline"
          size={24}
          color={vibesTheme.colors.primaryText}
        />
      </TouchableOpacity>
      <AnimatedSheetModal
        visible={Boolean(asset)}
        onClose={() => {
          if (!busy) setAsset(null);
        }}
        sheetStyle={s.sheet}
      >
        <Text style={s.title}>Enviar foto</Text>
        {asset && (
          <Image
            source={{ uri: asset.uri }}
            style={s.preview}
            resizeMode="contain"
          />
        )}
        <View style={s.actions}>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={busy}
            onPress={() => setAsset(null)}
            style={s.button}
          >
            <Text>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void send()}
            style={s.send}
          >
            {busy ? (
              <ActivityIndicator color={vibesTheme.colors.primaryText} />
            ) : (
              <Text style={s.sendText}>Enviar foto</Text>
            )}
          </TouchableOpacity>
        </View>
      </AnimatedSheetModal>
    </>
  );
}
const s = StyleSheet.create({
  button: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: { backgroundColor: vibesTheme.colors.background, padding: 24 },
  title: {
    color: vibesTheme.colors.primaryText,
    fontSize: 20,
    marginBottom: 16,
  },
  preview: { width: "100%", height: 300 },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  send: {
    backgroundColor: vibesTheme.colors.accentMustard,
    borderRadius: 24,
    padding: 16,
    minWidth: 120,
    alignItems: "center",
  },
  sendText: { color: vibesTheme.colors.primaryText },
});
