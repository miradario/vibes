import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export type ProfileRow = Record<string, any>;

export const profileKeys = {
  all: ["profile"] as const,
  byUser: (userId?: string) =>
    [...profileKeys.all, userId ?? "anonymous"] as const,
};

const fetchProfile = async (userId: string): Promise<ProfileRow | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
};

export const useProfileQuery = (userId?: string) => {
  return useQuery<ProfileRow | null>({
    queryKey: profileKeys.byUser(userId),
    queryFn: () => fetchProfile(userId as string),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
};
