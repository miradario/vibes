import { supabase } from "./supabase";

const PROFILE_PICTURES_BUCKET = "profile pictures";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 30;
const SIGNED_URL_CACHE_REFRESH_BUFFER_MS = 60 * 60 * 1000;

type SignedUrlCacheEntry = {
  expiresAt: number;
  promise?: Promise<string | null>;
  url?: string | null;
};

const signedUrlCache = new Map<string, SignedUrlCacheEntry>();

const extractBucketPathFromUrl = (value: string) => {
  const marker = `/object/public/${encodeURIComponent(PROFILE_PICTURES_BUCKET)}/`;
  const signedMarker = `/object/sign/${encodeURIComponent(PROFILE_PICTURES_BUCKET)}/`;

  if (value.includes(marker)) {
    return decodeURIComponent(value.split(marker)[1] ?? "").split("?")[0] ?? null;
  }

  if (value.includes(signedMarker)) {
    return decodeURIComponent(value.split(signedMarker)[1] ?? "").split("?")[0] ?? null;
  }

  return null;
};

export const getProfilePicturePath = (value?: string | null) => {
  if (!value || !value.trim()) return null;
  const trimmed = value.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return extractBucketPathFromUrl(trimmed);
  }

  return trimmed;
};

export const createSignedProfilePhotoUrl = async (value?: string | null) => {
  const path = getProfilePicturePath(value);
  // If no path could be extracted, it's an external URL (Cloudinary, etc.) — return as-is
  if (!path) return value ?? null;

  const now = Date.now();
  const cached = signedUrlCache.get(path);
  if (
    cached?.url &&
    cached.expiresAt - SIGNED_URL_CACHE_REFRESH_BUFFER_MS > now
  ) {
    return cached.url;
  }
  if (cached?.promise) {
    return cached.promise;
  }

  const promise = supabase.storage
    .from(PROFILE_PICTURES_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    .then(({ data, error }) => {
      if (error) {
        console.warn("createSignedProfilePhotoUrl:error", { path, error });
        signedUrlCache.delete(path);
        return null;
      }

      signedUrlCache.set(path, {
        url: data.signedUrl,
        expiresAt: now + SIGNED_URL_TTL_SECONDS * 1000,
      });
      return data.signedUrl;
    });

  signedUrlCache.set(path, {
    promise,
    expiresAt: now + SIGNED_URL_TTL_SECONDS * 1000,
  });

  return promise;
};
