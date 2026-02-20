import { useQuery } from "@tanstack/react-query";
import { mapProfileWithPhotos } from "../api/mappers/profile.mapper";
import { supabase } from "../lib/supabase";

export type ProfileRow = Record<string, any>;

export const profileKeys = {
  all: ["profile"] as const,
  byUser: (userId?: string) =>
    [...profileKeys.all, userId ?? "anonymous"] as const,
};

const fetchProfile = async (userId: string): Promise<ProfileRow | null> => {
  const [profileResponse, photosResponse] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("profile_photos")
      .select("*")
      .eq("profile_id", userId)
      .order("order", { ascending: true }),
  ]);

  if (profileResponse.error) {
    throw profileResponse.error;
  }

  if (photosResponse.error) {
    throw photosResponse.error;
  }

  if (!profileResponse.data) {
    return null;
  }

  return mapProfileWithPhotos(profileResponse.data, photosResponse.data ?? []);
};

export const useProfileQuery = (userId?: string) => {
  return useQuery<ProfileRow | null>({
    queryKey: profileKeys.byUser(userId),
    queryFn: () => fetchProfile(userId as string),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
};
