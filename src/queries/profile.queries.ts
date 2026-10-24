import { useQuery } from "@tanstack/react-query";
import { mapProfileWithPhotos } from "../api/mappers/profile.mapper";
import { createSignedProfilePhotoUrl } from "../lib/profilePhotoStorage";
import { supabase } from "../lib/supabase";

export type ProfileRow = Record<string, any>;

export const profileKeys = {
  all: ["profile"] as const,
  byUser: (userId?: string) =>
    [...profileKeys.all, userId ?? "anonymous"] as const,
};

const fetchProfile = async (userId: string): Promise<ProfileRow | null> => {
  const [profileResponse, photosResponse] = await Promise.all([
    // Own profile via RPC: returns every own column except the raw
    // coordinates (replaced by has_location).
    supabase.rpc("get_my_profile").maybeSingle(),
    supabase
      .from("profile_photos")
      .select("*")
      .eq("profile_id", userId)
      .order("is_primary", { ascending: false })
      .order("order", { ascending: true }),
  ]);

  if (profileResponse.error) {
    throw profileResponse.error;
  }

  if (photosResponse.error) {
    throw photosResponse.error;
  }

  const myProfileRow = profileResponse.data as
    | { profile: ProfileRow | null; has_location: boolean | null }
    | null;
  if (!myProfileRow?.profile || String(myProfileRow.profile.id) !== userId) {
    return null;
  }
  const ownProfile: ProfileRow = {
    ...myProfileRow.profile,
    has_location: Boolean(myProfileRow.has_location),
  };

  const signedProfileFallbackPhotos = Array.isArray((ownProfile as any).photos)
    ? await Promise.all(
        ((ownProfile as any).photos ?? []).map(async (photo: any) => {
          if (typeof photo === "string") {
            return await createSignedProfilePhotoUrl(photo);
          }

          if (photo && typeof photo === "object" && typeof photo.url === "string") {
            return {
              ...photo,
              url: await createSignedProfilePhotoUrl(photo.url),
            };
          }

          return photo;
        }),
      )
    : undefined;

  const signedPhotoRows = await Promise.all(
    (photosResponse.data ?? []).map(async (photoRow) => ({
      ...photoRow,
      url: await createSignedProfilePhotoUrl((photoRow as Record<string, any>).url),
    })),
  );

  return mapProfileWithPhotos(
    signedProfileFallbackPhotos
      ? { ...ownProfile, photos: signedProfileFallbackPhotos }
      : ownProfile,
    signedPhotoRows,
  );
};

export const useProfileQuery = (userId?: string) => {
  return useQuery<ProfileRow | null>(profileQueryOptions(userId));
};

export const profileQueryOptions = (userId?: string) => ({
  queryKey: profileKeys.byUser(userId),
  queryFn: () => fetchProfile(userId as string),
  enabled: Boolean(userId),
  staleTime: 5 * 60_000,
  refetchOnMount: "always" as const,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
});

/**
 * Whether the signed-in user has photos that were marked as not valid from the
 * backoffice (they are hidden by RLS, so the profile looks photo-less). Used
 * only to pick the copy of the "add a photo" notice; any error (e.g. the RPC
 * not deployed yet) falls back to the generic copy.
 */
export const useOwnInvalidPhotoQuery = (userId?: string, enabled = true) =>
  useQuery<boolean>({
    queryKey: ["own-invalid-photo", userId],
    enabled: Boolean(userId) && enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_profile_photo_status");
      if (error) return false;
      const row = (Array.isArray(data) ? data[0] : data) as { invalid_count?: number } | null;
      return Number(row?.invalid_count ?? 0) > 0;
    },
  });
