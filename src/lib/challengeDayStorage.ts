import { Platform } from "react-native";
import { supabase } from "./supabase";
import { readUriAsArrayBuffer } from "./supabaseStorage";
import {
  DAY_MEDIA_BUCKET,
  DraftAttachment,
  validateDayFile,
} from "./challengeDayContent";
import { resolveDayFile } from "./dayDraftFiles";

export async function uploadDayAttachment(
  challengeId: string,
  day: number,
  item: DraftAttachment,
  onProgress: (percent: number) => void
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Iniciá sesión para guardar el día.");
  if (!item.localUri) throw new Error("Volvé a seleccionar el archivo.");
  const uri = await resolveDayFile(item.id, item.localUri);
  const bytes = await readUriAsArrayBuffer(uri);
  if (Platform.OS === "web" && uri.startsWith("blob:"))
    URL.revokeObjectURL(uri);
  const { mime, extension } = validateDayFile(
    item.type as "photo" | "audio",
    item.mime ?? "",
    bytes.byteLength
  );
  const path = `${challengeId}/${day}/${session.user.id}/${item.id}.${extension}`;
  // Stable path makes retries idempotent after a lost server response.
  const { data: existing } = await supabase.storage
    .from(DAY_MEDIA_BUCKET)
    .createSignedUrl(path, 60);
  if (existing?.signedUrl) {
    onProgress(100);
    return path;
  }
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/${DAY_MEDIA_BUCKET}/${path}`
    );
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader(
      "apikey",
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ""
    );
    xhr.setRequestHeader("Content-Type", mime);
    xhr.timeout = 120000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () =>
      reject(
        new Error(
          "Se interrumpió la subida. Tu borrador sigue guardado; podés reintentar."
        )
      );
    xhr.ontimeout = () =>
      reject(
        new Error(
          "La subida tardó demasiado. Reintentá cuando tengas conexión."
        )
      );
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else
        reject(
          new Error(
            xhr.status === 413
              ? "El archivo supera el tamaño permitido."
              : "No se pudo subir el archivo. Revisá tu conexión y tus permisos y reintentá."
          )
        );
    };
    xhr.send(bytes);
  });
  return path;
}
