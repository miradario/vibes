import { zodiacFromBirthDate } from "../lib/zodiac";
import { isSwipeHidden } from "../lib/communityDiscovery";
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

const isMissingRelationError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  const code = typeof record.code === "string" ? record.code : "";
  const message = typeof record.message === "string" ? record.message : "";
  return code === "42P01" || message.toLowerCase().includes("user_blocks");
};

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
  targetLng: number
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
  includePreviouslySwiped = false,
  targetProfileIds?: string[]
): Promise<GetCandidatesResponse> => {
  const pageSize = Math.max(1, Math.min(params?.limit ?? 200, 500));
  let currentUserCoordinates: { latitude: number; longitude: number } | null =
    null;

  // Fetch IDs the current user has already swiped on
  let swipedIds: string[] = [];
  let blockedUserIds: string[] = [];
  if (currentUserId) {
    const [swipesResponse, profileResponse, blocksResponse] = await Promise.all(
      [
        supabase
          .from("swipes")
          .select("target_id, direction, created_at")
          .eq("swiper_id", currentUserId),
        supabase
          .from("profiles")
          .select("latitude, longitude")
          .eq("id", currentUserId)
          .is("deleted_at", null)
          .maybeSingle(),
        supabase
          .from("user_blocks")
          .select("blocker_id, blocked_user_id")
          .or(
            `blocker_id.eq.${currentUserId},blocked_user_id.eq.${currentUserId}`
          ),
      ]
    );

    const { data: swipeRows } = swipesResponse;
    const { data: currentUserProfile } = profileResponse;
    if (blocksResponse.error && !isMissingRelationError(blocksResponse.error)) {
      throw blocksResponse.error;
    }

    if (swipesResponse.error) throw swipesResponse.error;
    swipedIds = (swipeRows ?? [])
      .filter((row: any) => isSwipeHidden(row))
      .map((r: any) => String(r.target_id));
    blockedUserIds = blocksResponse.error
      ? []
      : ((blocksResponse.data ?? []) as Record<string, any>[]).map((row) =>
          String(row.blocker_id) === currentUserId
            ? String(row.blocked_user_id)
            : String(row.blocker_id)
        );

    const currentLatitude = toCoordinate((currentUserProfile as any)?.latitude);
    const currentLongitude = toCoordinate(
      (currentUserProfile as any)?.longitude
    );

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
    .is("deleted_at", null)
    .order("id", { ascending: true })
    .limit(pageSize);

  if (targetProfileIds?.length) {
    query = query.in("id", targetProfileIds);
  } else {
    query = query.eq("is_active", true);
  }

  if (currentUserId) {
    query = query.neq("id", currentUserId);
  }

  // Exclude already-swiped profiles
  if (!includePreviouslySwiped && swipedIds.length > 0) {
    query = query.not("id", "in", `(${swipedIds.join(",")})`);
  }

  if (blockedUserIds.length > 0) {
    query = query.not("id", "in", `(${blockedUserIds.join(",")})`);
  }

  // Read the full eligible pool before ranking, rather than the 200 newest accounts.
  const profileRows: ProfileRow[] = [];
  let after: string | undefined;
  while (true) {
    const { data, error } = await (after ? query.gt("id", after) : query);
    if (error) throw error;
    profileRows.push(...(data ?? []));
    if (!data?.length || data.length < pageSize) break;
    after = String(data[data.length - 1].id);
  }

  const profiles = (mapSupabaseSelect(profileRows ?? []) as ProfileRow[]) ?? [];
  const profileIds = profiles
    .map((profile) => String(profile.id ?? ""))
    .filter((id) => id.length > 0);

  let photosByProfileId = new Map<string, PhotoRow[]>();
  let preferencesByUserId = new Map<string, UserPreferenceRow>();

  if (profileIds.length > 0) {
    const photosResponse: { data: PhotoRow[]; error: any } = {
      data: [],
      error: null,
    };
    const preferencesResponse: { data: UserPreferenceRow[]; error: any } = {
      data: [],
      error: null,
    };
    for (let i = 0; i < profileIds.length; i += 50) {
      const ids = profileIds.slice(i, i + 50);
      const [photos, preferences] = await Promise.all([
        supabase
          .from("profile_photos")
          .select("*")
          .in("profile_id", ids)
          .order("is_primary", { ascending: false })
          .order("order", { ascending: true }),
        supabase.from("user_preferences").select("*").in("user_id", ids),
      ]);
      photosResponse.data.push(...(photos.data ?? []));
      photosResponse.error ||= photos.error;
      preferencesResponse.data.push(...(preferences.data ?? []));
      preferencesResponse.error ||= preferences.error;
    }

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

    const { data: preferenceRows, error: preferencesError } =
      preferencesResponse;
    if (preferencesError) {
      const message =
        typeof preferencesError.message === "string"
          ? preferencesError.message.toLowerCase()
          : "";
      if (
        !message.includes("could not find the table 'public.user_preferences'")
      ) {
        throw preferencesError;
      }
    } else {
      const mappedPreferences =
        (mapSupabaseSelect(preferenceRows ?? []) as UserPreferenceRow[]) ?? [];
      preferencesByUserId = mappedPreferences.reduce<
        Map<string, UserPreferenceRow>
      >((acc, preferenceRow) => {
        const userId = String(
          preferenceRow.userId ?? preferenceRow.user_id ?? ""
        );
        if (!userId) return acc;
        acc.set(userId, preferenceRow);
        return acc;
      }, new Map<string, UserPreferenceRow>());
    }
  }

  const candidates = await Promise.all(
    profiles.map(async (profile) => {
      const id = String(profile.id);
      const tablePhotos = photosByProfileId.get(id) ?? [];

      // Sign URLs from profile_photos table
      const signedTablePhotos = (
        await Promise.all(
          tablePhotos.map(async (photo, index) => {
            const rawUrl = typeof photo.url === "string" ? photo.url : "";
            const signedUrl = rawUrl
              ? await createSignedProfilePhotoUrl(rawUrl)
              : null;
            if (!signedUrl) return null;
            return {
              id: String(photo.id ?? `${id}-photo-${index}`),
              url: signedUrl,
              order:
                typeof photo.order === "number"
                  ? photo.order
                  : Number(photo.order ?? index),
              isPrimary: Boolean(photo.isPrimary),
            };
          })
        )
      ).filter(Boolean) as {
        id: string;
        url: string;
        order: number;
        isPrimary: boolean;
      }[];

      // Fallback: use photos array from profiles table if no profile_photos rows
      let mergedPhotos = signedTablePhotos;
      if (mergedPhotos.length === 0 && Array.isArray(profile.photos)) {
        const fromProfile = profile.photos
          .map((item: any, idx: number) => {
            const url =
              typeof item === "string"
                ? item.trim()
                : item &&
                  typeof item === "object" &&
                  typeof item.url === "string"
                ? item.url.trim()
                : "";
            if (!url) return null;
            return {
              id: `${id}-p-${idx}`,
              url,
              order: idx,
              isPrimary: idx === 0,
            };
          })
          .filter(Boolean) as {
          id: string;
          url: string;
          order: number;
          isPrimary: boolean;
        }[];

        mergedPhotos = (
          await Promise.all(
            fromProfile.map(async (p) => {
              const signed = await createSignedProfilePhotoUrl(p.url);
              if (!signed) return null;
              return { ...p, url: signed };
            })
          )
        ).filter(Boolean) as {
          id: string;
          url: string;
          order: number;
          isPrimary: boolean;
        }[];
      }

      return {
        ...profile,
        ...preferencesByUserId.get(id),
        id,
        zodiac: zodiacFromBirthDate(profile.birthDate ?? profile.birth_date),
        distanceKm:
          currentUserCoordinates &&
          Number.isFinite(toCoordinate(profile.latitude) ?? NaN) &&
          Number.isFinite(toCoordinate(profile.longitude) ?? NaN)
            ? calculateDistanceKm(
                currentUserCoordinates.latitude,
                currentUserCoordinates.longitude,
                Number(toCoordinate(profile.latitude)),
                Number(toCoordinate(profile.longitude))
              )
            : undefined,
        displayName:
          typeof profile.displayName === "string"
            ? profile.displayName
            : undefined,
        isActive: Boolean(profile.isActive),
        photos: mergedPhotos,
      } as unknown as Candidate;
    })
  );

  return candidates.sort((left, right) => {
    const leftDistance =
      typeof (left as any).distanceKm === "number"
        ? (left as any).distanceKm
        : Number.POSITIVE_INFINITY;
    const rightDistance =
      typeof (right as any).distanceKm === "number"
        ? (right as any).distanceKm
        : Number.POSITIVE_INFINITY;

    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }

    const leftCreatedAt = new Date(
      (left as any).createdAt ?? (left as any).created_at ?? 0
    ).getTime();
    const rightCreatedAt = new Date(
      (right as any).createdAt ?? (right as any).created_at ?? 0
    ).getTime();
    return rightCreatedAt - leftCreatedAt;
  });
};

export type SwipeHistoryCandidate = Candidate & {
  swipeDirection: "like" | "pass";
  swipedAt: string;
};

export const useSwipeHistoryCandidatesQuery = () => {
  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  return useQuery<SwipeHistoryCandidate[]>({
    queryKey: ["candidates", "swipe-history", "all-v3", userId ?? "anonymous"],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data: swipes, error } = await supabase
        .from("swipes")
        .select("target_id,direction,created_at")
        .eq("swiper_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const latest = new Map<
        string,
        { direction: "like" | "pass"; created_at: string }
      >();
      for (const row of swipes ?? []) {
        const id = String(row.target_id);
        const direction = row.direction === "nope" ? "pass" : row.direction;
        if (
          !latest.has(id) &&
          (direction === "like" || direction === "pass")
        ) {
          latest.set(id, { direction, created_at: row.created_at });
        }
      }
      if (latest.size === 0) return [];
      const candidates = await fetchCandidates(
        userId,
        { limit: 500 },
        true,
        [...latest.keys()]
      );
      return candidates
        .filter((candidate) => latest.has(String(candidate.id)))
        .map((candidate) => {
          const swipe = latest.get(String(candidate.id))!;
          return {
            ...candidate,
            swipeDirection: swipe.direction,
            swipedAt: swipe.created_at,
          };
        })
        .sort(
          (a, b) =>
            new Date(b.swipedAt).getTime() - new Date(a.swipedAt).getTime()
        );
    },
    staleTime: 30_000,
  });
};

export const useIncomingLikeCandidatesQuery = () => {
  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  return useQuery<Candidate[]>({
    queryKey: ["candidates", "incoming-likes", "all-v1", userId ?? "anonymous"],
    enabled: Boolean(userId),
    queryFn: async () => {
      const [{ data: swipes, error: swipeError }, { data: matches, error: matchError }] =
        await Promise.all([
          supabase
            .from("swipes")
            .select("swiper_id,created_at")
            .eq("target_id", userId!)
            .eq("direction", "like")
            .order("created_at", { ascending: false }),
          supabase
            .from("matches")
            .select("user1_id,user2_id")
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`),
        ]);
      if (swipeError) throw swipeError;
      if (matchError) throw matchError;

      const matchedIds = new Set(
        (matches ?? []).map((match) =>
          String(match.user1_id) === userId
            ? String(match.user2_id)
            : String(match.user1_id)
        )
      );
      const likerIds = Array.from(
        new Set(
          (swipes ?? [])
            .map((swipe) => String(swipe.swiper_id ?? ""))
            .filter((id) => id && !matchedIds.has(id))
        )
      );
      if (likerIds.length === 0) return [];
      return fetchCandidates(userId, { limit: 500 }, true, likerIds);
    },
    staleTime: 30_000,
  });
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
