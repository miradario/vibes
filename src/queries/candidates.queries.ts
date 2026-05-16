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
type UserPreferenceRow = Record<string, any>;

export const candidatesKeys = {
  all: ["candidates"] as const,
  list: (userId?: string, params?: GetCandidatesParams) =>
    [...candidatesKeys.all, userId ?? "anonymous", params ?? {}] as const,
};

const toCoordinate = (value: unknown) =>
  typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value)
      : null;

const toRadians = (value: number) => (value * Math.PI) / 180;

const calculateDistanceKm = (
  originLat: number,
  originLng: number,
  targetLat: number,
  targetLng: number,
) => {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(targetLat - originLat);
  const deltaLng = toRadians(targetLng - originLng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(originLat)) *
      Math.cos(toRadians(targetLat)) *
      Math.sin(deltaLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const fetchCandidates = async (
  currentUserId?: string,
  params?: GetCandidatesParams,
): Promise<GetCandidatesResponse> => {
  const limit = params?.limit ?? 20;
  let currentUserCoordinates:
    | { latitude: number; longitude: number }
    | null = null;

  // Fetch IDs the current user has already swiped on
  let swipedIds: string[] = [];
  if (currentUserId) {
    const [{ data: swipeRows }, { data: currentUserProfile }] = await Promise.all([
      supabase
        .from("swipes")
        .select("target_id")
        .eq("swiper_id", currentUserId),
      supabase
        .from("profiles")
        .select("latitude, longitude")
        .eq("id", currentUserId)
        .maybeSingle(),
    ]);

    swipedIds = (swipeRows ?? []).map((r: any) => String(r.target_id));

    const currentLatitude = toCoordinate((currentUserProfile as any)?.latitude);
    const currentLongitude = toCoordinate((currentUserProfile as any)?.longitude);

    if (
      currentLatitude !== null &&
      Number.isFinite(currentLatitude) &&
      currentLongitude !== null &&
      Number.isFinite(currentLongitude)
    ) {
      currentUserCoordinates = {
        latitude: currentLatitude,
        longitude: currentLongitude,
      };
    }
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
  let preferencesByUserId = new Map<string, UserPreferenceRow>();

  if (profileIds.length > 0) {
    const [photosResponse, preferencesResponse] = await Promise.all([
      supabase
        .from("profile_photos")
        .select("*")
        .in("profile_id", profileIds)
        .order("is_primary", { ascending: false })
        .order("order", { ascending: true }),
      supabase
        .from("user_preferences")
        .select("*")
        .in("user_id", profileIds),
    ]);

    const { data: photoRows, error: photosError } = photosResponse;

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

    const { data: preferenceRows, error: preferencesError } = preferencesResponse;
    if (preferencesError) {
      const message =
        typeof preferencesError.message === "string"
          ? preferencesError.message.toLowerCase()
          : "";
      if (!message.includes("could not find the table 'public.user_preferences'")) {
        throw preferencesError;
      }
    } else {
      const mappedPreferences =
        (mapSupabaseSelect(preferenceRows ?? []) as UserPreferenceRow[]) ?? [];
      preferencesByUserId = mappedPreferences.reduce<Map<string, UserPreferenceRow>>(
        (acc, preferenceRow) => {
          const userId = String(preferenceRow.userId ?? preferenceRow.user_id ?? "");
          if (!userId) return acc;
          acc.set(userId, preferenceRow);
          return acc;
        },
        new Map<string, UserPreferenceRow>(),
      );
    }
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
      ...preferencesByUserId.get(id),
      distanceKm:
        currentUserCoordinates &&
        Number.isFinite(toCoordinate(profile.latitude) ?? NaN) &&
        Number.isFinite(toCoordinate(profile.longitude) ?? NaN)
          ? calculateDistanceKm(
              currentUserCoordinates.latitude,
              currentUserCoordinates.longitude,
              Number(toCoordinate(profile.latitude)),
              Number(toCoordinate(profile.longitude)),
            )
          : undefined,
      displayName:
        typeof profile.displayName === "string" ? profile.displayName : undefined,
      isActive: Boolean(profile.isActive),
      photos: mergedPhotos,
    } as unknown as Candidate;
  }));
};

export const useCandidatesQuery = (params?: GetCandidatesParams) => {
  const { data: session } = useAuthSession();
  const currentUserId = session?.user?.id;

  return useQuery<GetCandidatesResponse>({
    queryKey: candidatesKeys.list(currentUserId, params),
    queryFn: () => fetchCandidates(currentUserId, params),
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });
};
