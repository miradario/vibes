// Versioned attachment envelope carried by the existing message body.
const PREFIX = "vibes-photo:v1:";
export type ChatPhotoKind = "direct" | "group" | "event" | "challenge";
const PATH =
  /^(direct|group|event|challenge)\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i;
export function photoMessage(path: string) {
  if (!PATH.test(path)) throw new Error("Foto inválida");
  return PREFIX + path;
}
export function photoPath(body: string) {
  const path = body.startsWith(PREFIX) ? body.slice(PREFIX.length) : "";
  return PATH.test(path) ? path : null;
}
export function messagePreview(body: string | null | undefined) {
  return body && photoPath(body) ? "📷 Foto" : body;
}
