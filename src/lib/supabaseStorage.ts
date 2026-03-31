import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "./supabase";

const EXTENSION_TO_CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

const isArrayBuffer = (value: unknown): value is ArrayBuffer =>
  typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer;

const base64ToArrayBuffer = (base64: string) => {
  if (typeof atob !== "function") {
    throw new Error("Base64 decoder is not available in this runtime");
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
};

export const readUriAsArrayBuffer = async (uri: string) => {
  try {
    const response = await fetch(uri);
    const fetched = await response.arrayBuffer();
    if (isArrayBuffer(fetched) && fetched.byteLength > 0) {
      return fetched.slice(0);
    }
  } catch (error) {
    console.warn("readUriAsArrayBuffer: fetch fallback", { uri, error });
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const fromBase64 = base64ToArrayBuffer(base64);
  if (!isArrayBuffer(fromBase64) || fromBase64.byteLength === 0) {
    throw new Error("Failed to convert file URI to ArrayBuffer");
  }
  return fromBase64.slice(0);
};

const inferContentType = (uri: string) => {
  const uriWithoutQuery = uri.split("?")[0];
  const rawExt = uriWithoutQuery.split(".").pop() || "jpg";
  const ext = rawExt.toLowerCase();

  return {
    ext,
    contentType: EXTENSION_TO_CONTENT_TYPE[ext] || "image/jpeg",
  };
};

export const uploadImageToSupabase = async (params: {
  uri: string;
  bucket: string;
  pathPrefix: string;
}) => {
  const { uri, bucket, pathPrefix } = params;
  const { ext, contentType } = inferContentType(uri);
  const arrayBuffer = await readUriAsArrayBuffer(uri);
  const uploadBody = new Uint8Array(arrayBuffer).buffer;
  const filePath = `${pathPrefix}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, uploadBody, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
};
