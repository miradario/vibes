import { useQuery } from "@tanstack/react-query";
import { mapSupabaseSelect } from "../api/mappers/case.mapper";
import type {
  Candidate,
  GetCandidatesParams,
  GetCandidatesResponse,
} from "../api/modules/candidates/candidates.types";
import { useAuthSession } from "../auth/auth.queries";
import { supabase } from "../lib/supabase";

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

  let query = supabase
    .from("profiles")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (currentUserId) {
    query = query.neq("id", currentUserId);
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

  return profiles.map((profile) => {
    const id = String(profile.id);
    const photos = photosByProfileId.get(id) ?? [];

    return {
      ...profile,
      displayName:
        typeof profile.displayName === "string" ? profile.displayName : undefined,
      isActive: Boolean(profile.isActive),
      photos: photos.map((photo, index) => ({
        id: String(photo.id ?? `${id}-photo-${index}`),
        url: typeof photo.url === "string" ? photo.url : "",
        order:
          typeof photo.order === "number" ? photo.order : Number(photo.order ?? index),
        isPrimary: Boolean(photo.isPrimary),
      })),
    } as Candidate;
  });
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
