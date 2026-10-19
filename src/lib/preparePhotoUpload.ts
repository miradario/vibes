import { Image } from "react-native";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

/** Bound new photo uploads without enlarging small images or changing the stored originals. */
export async function preparePhotoUpload(uri: string): Promise<string> {
  if (/^https?:\/\//i.test(uri)) return uri;
  const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
  const maxEdge = 1600;
  const actions = Math.max(width, height) > maxEdge
    ? [{ resize: width >= height ? { width: maxEdge } : { height: maxEdge } }]
    : [];
  const result = await manipulateAsync(uri, actions, { compress: 0.82, format: SaveFormat.JPEG });
  return result.uri;
}
