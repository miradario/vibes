import { hasProfilePhotos, comparePhotoPriority } from "../lib/profilePhotos";
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
import { withBootTimeout } from "../lib/startupBoot";

type ProfileRow = Record<string, any>;
type PhotoRow = Record<string, any>;
type UserPreferenceRow = Record<string, any>;

export const candidatesKeys = {
  all: ["candidates"] as const,
  list: (userId?: string, params?: GetCandidatesParams) =>
    [...candidatesKeys.all, userId ?? "anonymous", params ?? {}] as const,
};

type DiscoveryRpcRow = {
  id: string;
  profile: ProfileRow | null;
  preferences: UserPreferenceRow | null;
  age: number | null;
  zodiac: string | null;
  distance_km: number | null;
};

export type CandidateAgeRange = { min: number | null; max: number | null };

const DISCOVERY_PAGE_SIZE = 200;

const fetchCandidates = (...args: Parameters<typeof fetchCandidatesInternal>) =>
  withBootTimeout(fetchCandidatesInternal(...args), 20000, "No se pudieron cargar los perfiles. Volvé a intentar");

/**
 * Candidates come from the get_discovery_candidates RPC: the server applies
 * eligibility (active, not deleted, not blocked, not recently swiped) and
 * returns the derived distance/age instead of other users' coordinates or
 * birth dates. When an age range is given it is applied server-side, so
 * profiles that hide their age still respect the viewer's age filter.
 */
const fetchCandidatesInternal = async (
  currentUserId?: string,
  _params?: GetCandidatesParams,
  includePreviouslySwiped = false,
  targetProfileIds?: string[],
  photoPreview = false,
  ageRange?: CandidateAgeRange
): Promise<GetCandidatesResponse> => {
  if (!currentUserId) return [] as unknown as GetCandidatesResponse;
  if (targetProfileIds && targetProfileIds.length === 0) {
    return [] as unknown as GetCandidatesResponse;
  }

  const ownPhotosResponse = await supabase
    .from("profile_photos")
    .select("url")
    .eq("profile_id", currentUserId);
  if (ownPhotosResponse.error) throw ownPhotosResponse.error;
  const canViewPhotos = photoPreview || hasProfilePhotos({ photos: ownPhotosResponse.data });

  const rows: DiscoveryRpcRow[] = [];
  let after: string | null = null;
  while (true) {
    const { data, error } = await supabase.rpc("get_discovery_candidates", {
      p_target_ids: targetProfileIds?.length ? targetProfileIds : null,
      p_include_previously_swiped: includePreviouslySwiped,
      p_limit: DISCOVERY_PAGE_SIZE,
      p_after_id: after,
      p_age_min: ageRange?.min ?? null,
      p_age_max: ageRange?.max ?? null,
    });
    if (error) throw error;
    const page = (data ?? []) as DiscoveryRpcRow[];
    rows.push(...page);
    if (page.length < DISCOVERY_PAGE_SIZE) break;
    after = String(page[page.length - 1].id);
  }

  const profiles = rows.map((row) => {
    const profile = (mapSupabaseSelect([row.profile ?? { id: row.id }]) as ProfileRow[])[0] ?? {};
    return { ...profile, id: String(row.id) } as ProfileRow;
  });
  const profileIds = profiles.map((profile) => String(profile.id));
  const rpcById = new Map(rows.map((row) => [String(row.id), row]));

  let photosByProfileId = new Map<string, PhotoRow[]>();
  const preferencesByUserId = new Map<string, UserPreferenceRow>();
  for (const row of rows) {
    if (row.preferences) {
      const mapped = (mapSupabaseSelect([row.preferences]) as UserPreferenceRow[])[0];
      if (mapped) preferencesByUserId.set(String(row.id), mapped);
    }
  }

  if (profileIds.length > 0) {
    const photoRows: PhotoRow[] = [];
    for (let i = 0; i < profileIds.length; i += 50) {
      const ids = profileIds.slice(i, i + 50);
      const photos = await supabase
        .from("profile_photos")
        .select("*")
        .in("profile_id", ids)
        .order("is_primary", { ascending: false })
        .order("order", { ascending: true });
      if (photos.error) throw photos.error;
      photoRows.push(...(photos.data ?? []));
    }

    const photos = (mapSupabaseSelect(photoRows) as PhotoRow[]) ?? [];
    photosByProfileId = photos.reduce<Map<string, PhotoRow[]>>((acc, photo) => {
      const profileId = String(photo.profileId ?? "");
      if (!profileId) return acc;
      const existing = acc.get(profileId) ?? [];
      existing.push(photo);
      acc.set(profileId, existing);
      return acc;
    }, new Map<string, PhotoRow[]>());
  }

  const candidates = await Promise.all(
    profiles.map(async (profile) => {
      const id = String(profile.id);
      const tablePhotos = photosByProfileId.get(id) ?? [];
      const hasPhoto = hasProfilePhotos({ photos: tablePhotos }) || hasProfilePhotos(profile);

      // Sign URLs from profile_photos table
      const signedTablePhotos = (
        await Promise.all(
          (canViewPhotos ? tablePhotos : []).map(async (photo, index) => {
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
      if (canViewPhotos && mergedPhotos.length === 0 && Array.isArray(profile.photos)) {
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

      const rpcRow = rpcById.get(id);
      const ageHidden = Boolean(preferencesByUserId.get(id)?.hideAge);
      return {
        ...profile,
        ...preferencesByUserId.get(id),
        id,
        age: typeof rpcRow?.age === "number" ? rpcRow.age : undefined,
        ageHidden,
        ageFilteredServerSide: Boolean(ageRange && (ageRange.min !== null || ageRange.max !== null)),
        zodiac: rpcRow?.zodiac ?? undefined,
        distanceKm: typeof rpcRow?.distance_km === "number" ? rpcRow.distance_km : undefined,
        displayName:
          typeof profile.displayName === "string"
            ? profile.displayName
            : undefined,
        isActive: Boolean(profile.isActive),
        photos: mergedPhotos,
        hasProfilePhoto: hasPhoto,
      } as unknown as Candidate;
    })
  );

  return candidates.sort((left, right) => {
    const photoOrder = comparePhotoPriority(left, right);
    if (photoOrder) return photoOrder;
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

/** Fetch a single visible profile after Vibi revalidates the recommendation. */
export const fetchCandidateById = async (userId: string, profileId: string) => {
  const candidates = await fetchCandidates(userId, { limit: 1 }, false, [profileId]);
  return candidates.find((candidate) => candidate.id === profileId && candidate.isActive) ?? null;
};

export const useSwipeHistoryCandidatesQuery = (enabled = true, photoPreview = false) => {
  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  return useQuery<SwipeHistoryCandidate[]>({
    queryKey: ["candidates", "swipe-history", "all-v3", userId ?? "anonymous", photoPreview],
    enabled: Boolean(userId) && enabled,
    queryFn: () => withBootTimeout((async () => {
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
        [...latest.keys()],
        photoPreview
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
    })(), 18000, "No pudimos cargar las solicitudes. Volvé a intentar."),
    retry: 1,
    retryDelay: 1000,
    staleTime: 30_000,
  });
};

export const useIncomingLikeCandidatesQuery = (enabled = true, photoPreview = false) => {
  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  return useQuery<Candidate[]>({
    queryKey: ["candidates", "incoming-likes", "all-v1", userId ?? "anonymous", photoPreview],
    enabled: Boolean(userId) && enabled,
    queryFn: () => withBootTimeout((async () => {
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
      return fetchCandidates(userId, { limit: 500 }, true, likerIds, photoPreview);
    })(), 18000, "No pudimos cargar las solicitudes. Volvé a intentar."),
    retry: 1,
    retryDelay: 1000,
    staleTime: 30_000,
  });
};

export const useCandidatesQuery = (
  params?: GetCandidatesParams,
  photoPreview = false,
  enabled = true,
  ageRange?: CandidateAgeRange
) => {
  const { data: session } = useAuthSession();
  const currentUserId = session?.user?.id;
  const normalizedAgeRange =
    ageRange && (ageRange.min !== null || ageRange.max !== null) ? ageRange : undefined;

  return useQuery<GetCandidatesResponse>({
    queryKey: [
      ...candidatesKeys.list(currentUserId, params),
      photoPreview ? "home-preview" : "discovery",
      normalizedAgeRange?.min ?? null,
      normalizedAgeRange?.max ?? null,
    ],
    enabled: Boolean(currentUserId) && enabled,
    queryFn: () =>
      fetchCandidates(currentUserId, params, false, undefined, photoPreview, normalizedAgeRange),
    retry: 1,
    retryDelay: 1000,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: false,
  });
};
