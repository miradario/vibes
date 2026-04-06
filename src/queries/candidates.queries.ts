import { useQuery } from "@tanstack/react-query";
import { mapSupabaseSelect } from "../api/mappers/case.mapper";
import type {
  Candidate,
  GetCandidatesParams,
  GetCandidatesResponse,
} from "../api/modules/candidates/candidates.types";
import { useAuthSession } from "../auth/auth.queries";
import { supabase } from "../lib/supabase";
import { createSignedProfilePhotoUrl } from "../lib/profilePhotoStorage";

type ProfileRow = Record<string, any>;
type PhotoRow = Record<string, any>;

export const candidatesKeys = {
  all: ["candidates"] as const,
  list: (userId?: string, params?: GetCandidatesParams) =>
    [...candidatesKeys.all, userId ?? "anonymous", params ?? {}] as const,
};

const fetchCandidates = async (
  currentUserId?: string,
  params?: GetCandidatesParams,
): Promise<GetCandidatesResponse> => {
  const limit = params?.limit ?? 20;

  // Fetch IDs the current user has already swiped on
  let swipedIds: string[] = [];
  if (currentUserId) {
    const { data: swipeRows } = await supabase
      .from("swipes")
      .select("target_id")
      .eq("swiper_id", currentUserId);
    swipedIds = (swipeRows ?? []).map((r: any) => String(r.target_id));
  }

  let query = supabase
    .from("profiles")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (currentUserId) {
    query = query.neq("id", currentUserId);
  }

  // Exclude already-swiped profiles
  if (swipedIds.length > 0) {
    query = query.not("id", "in", `(${swipedIds.join(",")})`);
  }

  const { data: profileRows, error: profilesError } = await query;

  if (profilesError) {
    throw profilesError;
  }

  const profiles = (mapSupabaseSelect(profileRows ?? []) as ProfileRow[]) ?? [];
  const profileIds = profiles
    .map((profile) => String(profile.id ?? ""))
    .filter((id) => id.length > 0);

  let photosByProfileId = new Map<string, PhotoRow[]>();

  if (profileIds.length > 0) {
    const { data: photoRows, error: photosError } = await supabase
      .from("profile_photos")
      .select("*")
      .in("profile_id", profileIds)
      .order("order", { ascending: true });

    if (photosError) {
      throw photosError;
    }

    const photos = (mapSupabaseSelect(photoRows ?? []) as PhotoRow[]) ?? [];
    photosByProfileId = photos.reduce<Map<string, PhotoRow[]>>((acc, photo) => {
      const profileId = String(photo.profileId ?? "");
      if (!profileId) return acc;
      const existing = acc.get(profileId) ?? [];
      existing.push(photo);
      acc.set(profileId, existing);
      return acc;
    }, new Map<string, PhotoRow[]>());
  }

  return Promise.all(profiles.map(async (profile) => {
    const id = String(profile.id);
    const tablePhotos = photosByProfileId.get(id) ?? [];

    // Sign URLs from profile_photos table
    const signedTablePhotos = (await Promise.all(
      tablePhotos.map(async (photo, index) => {
        const rawUrl = typeof photo.url === "string" ? photo.url : "";
        const signedUrl = rawUrl ? await createSignedProfilePhotoUrl(rawUrl) : null;
        if (!signedUrl) return null;
        return {
          id: String(photo.id ?? `${id}-photo-${index}`),
          url: signedUrl,
          order:
            typeof photo.order === "number" ? photo.order : Number(photo.order ?? index),
          isPrimary: Boolean(photo.isPrimary),
        };
      }),
    )).filter(Boolean) as { id: string; url: string; order: number; isPrimary: boolean }[];

    // Fallback: use photos array from profiles table if no profile_photos rows
    let mergedPhotos = signedTablePhotos;
    if (mergedPhotos.length === 0 && Array.isArray(profile.photos)) {
      const fromProfile = profile.photos
        .map((item: any, idx: number) => {
          const url =
            typeof item === "string" ? item.trim() :
            (item && typeof item === "object" && typeof item.url === "string") ? item.url.trim() : "";
          if (!url) return null;
          return { id: `${id}-p-${idx}`, url, order: idx, isPrimary: idx === 0 };
        })
        .filter(Boolean) as { id: string; url: string; order: number; isPrimary: boolean }[];

      mergedPhotos = (await Promise.all(
        fromProfile.map(async (p) => {
          const signed = await createSignedProfilePhotoUrl(p.url);
          if (!signed) return null;
          return { ...p, url: signed };
        }),
      )).filter(Boolean) as { id: string; url: string; order: number; isPrimary: boolean }[];
    }

    return {
      ...profile,
      displayName:
        typeof profile.displayName === "string" ? profile.displayName : undefined,
      isActive: Boolean(profile.isActive),
      photos: mergedPhotos,
    } as Candidate;
  }));
};

export const useCandidatesQuery = (params?: GetCandidatesParams) => {
  const { data: session } = useAuthSession();
  const currentUserId = session?.user?.id;

  return useQuery<GetCandidatesResponse>({
    queryKey: candidatesKeys.list(currentUserId, params),
    queryFn: () => fetchCandidates(currentUserId, params),
    staleTime: 30_000,
  });
};
