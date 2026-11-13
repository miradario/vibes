// Day zero stores shared content once; it is not a check-in day.
export const ALL_CHALLENGE_DAYS = 0;
export const getChallengeContentLabel = (day: number) =>
  day === ALL_CHALLENGE_DAYS ? "Todos los días" : `Día ${day}`;

export const DAY_MEDIA_BUCKET = "challenge-day-media";
export const RESOURCE_PATH_SEGMENT = "resources";
export const MAX_DAY_ATTACHMENTS = 20;
export const PHOTO_LIMIT = 10 * 1024 * 1024;
export const AUDIO_LIMIT = 25 * 1024 * 1024;
export type DayAttachment = {
  id: string;
  type: "photo" | "audio" | "link";
  name: string;
  path?: string;
  mime?: string;
  size?: number;
  url?: string;
};
export type DraftAttachment = DayAttachment & {
  localUri?: string;
  error?: string;
};
export type ChallengeDay = {
  challenge_id: string;
  day: number;
  title: string;
  description: string;
  attachments: DayAttachment[];
  revision: number;
};
export const hasChallengeDayContent = (content: ChallengeDay) =>
  content.title.trim() !== getChallengeContentLabel(content.day) ||
  Boolean(content.description.trim()) ||
  content.attachments.length > 0;

export function getChallengeContentForDay(
  contents: ChallengeDay[],
  day: number
) {
  return [ALL_CHALLENGE_DAYS, ...(day === ALL_CHALLENGE_DAYS ? [] : [day])]
    .map((value) => contents.find((item) => item.day === value))
    .filter((item): item is ChallengeDay =>
      Boolean(item && hasChallengeDayContent(item))
    );
}

export type DayDraft = Omit<ChallengeDay, "attachments"> & {
  attachments: DraftAttachment[];
};
export type ChallengeResources = {
  challenge_id: string;
  attachments: DayAttachment[];
  revision: number;
};
export type ResourceDraft = {
  challenge_id: string;
  attachments: DraftAttachment[];
  revision: number;
};

const VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;
export function parseDayLink(input: string): {
  url: string;
  youtubeId: string | null;
  host: string;
} {
  let url: URL;
  try {
    url = new URL(
      /^https?:\/\//i.test(input.trim())
        ? input.trim()
        : `https://${input.trim()}`
    );
  } catch {
    throw new Error("Ingresá un enlace válido.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    !url.hostname.includes(".") ||
    input.length > 2048
  ) {
    throw new Error("Usá un enlace http o https válido.");
  }
  const host = url.hostname.toLowerCase();
  const youtube = [
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
    "www.youtu.be",
  ].includes(host);
  let youtubeId: string | null = null;
  if (youtube) {
    const parts = url.pathname.split("/").filter(Boolean);
    youtubeId = host.endsWith("youtu.be")
      ? parts.length === 1
        ? parts[0]
        : null
      : url.pathname === "/watch"
      ? url.searchParams.get("v")
      : ["shorts", "embed", "live"].includes(parts[0]) && parts.length === 2
      ? parts[1]
      : null;
    if (!youtubeId || !VIDEO_ID.test(youtubeId))
      throw new Error(
        "El enlace de YouTube no contiene un ID de video válido."
      );
    url = new URL(`https://www.youtube.com/watch?v=${youtubeId}`);
  }
  return { url: url.toString(), youtubeId, host };
}
const FORMATS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
};
export function validateDayFile(
  type: "photo" | "audio",
  mime: string,
  size: number
) {
  const normalized = mime.split(";")[0].toLowerCase();
  if (
    !FORMATS[normalized] ||
    !normalized.startsWith(type === "photo" ? "image/" : "audio/")
  )
    throw new Error(
      type === "photo"
        ? "Usá JPG, PNG, WebP o HEIC."
        : "Usá MP3, M4A, AAC, WAV, OGG o WebM."
    );
  const limit = type === "photo" ? PHOTO_LIMIT : AUDIO_LIMIT;
  if (!Number.isFinite(size) || size <= 0 || size > limit)
    throw new Error(
      `El archivo debe pesar entre 1 byte y ${limit / 1024 / 1024} MB.`
    );
  return { mime: normalized, extension: FORMATS[normalized] };
}
export function inferDayMime(name: string, mime?: string | null) {
  if (mime && mime !== "application/octet-stream")
    return mime.split(";")[0].toLowerCase();
  const ext = name.split("?")[0].split(".").pop()?.toLowerCase();
  return (
    Object.keys(FORMATS).find((key) => FORMATS[key] === ext) ??
    (ext === "jpeg" ? "image/jpeg" : "application/octet-stream")
  );
}
export function validateAttachments(
  items: DraftAttachment[],
  limitMessage = "Podés agregar hasta 20 contenidos por día."
) {
  if (items.length > MAX_DAY_ATTACHMENTS) throw new Error(limitMessage);
  if (new Set(items.map((a) => a.id)).size !== items.length)
    throw new Error("Hay contenidos duplicados.");
  for (const item of items) {
    if (item.type === "link") parseDayLink(item.url ?? "");
    else {
      validateDayFile(item.type, item.mime ?? "", item.size ?? 0);
      if (!item.path && !item.localUri)
        throw new Error("Volvé a seleccionar el archivo que falta.");
    }
  }
}
export function validateDayDraft(draft: DayDraft) {
  if (!draft.title.trim() || draft.title.length > 160)
    throw new Error("El título es obligatorio y admite hasta 160 caracteres.");
  if (draft.description.length > 10000)
    throw new Error("La consigna admite hasta 10.000 caracteres.");
  validateAttachments(draft.attachments);
}
export function validateResourceDraft(items: DraftAttachment[]) {
  validateAttachments(items, "Podés agregar hasta 20 contenidos.");
}
export function resourceMediaPath(
  challengeId: string,
  userId: string,
  attachmentId: string,
  extension: string
) {
  return `${challengeId}/${RESOURCE_PATH_SEGMENT}/${userId}/${attachmentId}.${extension}`;
}
export function isResourceMediaPath(path: string) {
  return new RegExp(
    `^[0-9a-f-]{36}/${RESOURCE_PATH_SEGMENT}/[0-9a-f-]{36}/[0-9a-f-]{36}\.[a-z0-9]+$`,
    "i"
  ).test(path);
}
export function fileExtensionFromPath(path: string) {
  const name = path.split("/").pop() ?? "";
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1) : "bin";
}
/**
 * Rebuilds a copied attachment list, keeping already-copied links and
 * substituting successfully copied media in the original order.
 */
export function buildRestartAttachments(
  source: DayAttachment[],
  targetLinkIds: Set<string>,
  copiedMedia: DayAttachment[]
): DayAttachment[] {
  let mediaIndex = 0;
  return source.flatMap((item) => {
    if (item.type === "link") return targetLinkIds.has(item.id) ? [item] : [];
    const next = copiedMedia[mediaIndex];
    if (next && item.path && next.name === item.name) {
      mediaIndex += 1;
      return [next];
    }
    return [];
  });
}
export function moveDayAttachment<T>(
  items: T[],
  index: number,
  direction: -1 | 1
): T[] {
  const next = index + direction;
  if (index < 0 || index >= items.length || next < 0 || next >= items.length)
    return items;
  const result = [...items];
  [result[index], result[next]] = [result[next], result[index]];
  return result;
}
export function persistedAttachments(
  items: DraftAttachment[]
): DayAttachment[] {
  return items.map(({ id, type, name, path, mime, size, url }) =>
    type === "link"
      ? { id, type, name, url: parseDayLink(url ?? "").url }
      : { id, type, name, path, mime, size }
  );
}
