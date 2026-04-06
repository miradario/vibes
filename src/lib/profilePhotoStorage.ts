import { supabase } from "./supabase";

const PROFILE_PICTURES_BUCKET = "profile pictures";

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

  const { data, error } = await supabase.storage
    .from(PROFILE_PICTURES_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 30);

  if (error) {
    console.warn("createSignedProfilePhotoUrl:error", { path, error });
    return null;
  }

  return data.signedUrl;
};
