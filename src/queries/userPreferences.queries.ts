import { useQuery } from "@tanstack/react-query";
import { mapUserPreferencesRow } from "../api/mappers/userPreferences.mapper";
import { supabase } from "../lib/supabase";

export type UserPreferences = Record<string, any>;

export const userPreferencesKeys = {
  all: ["user_preferences"] as const,
  byUser: (userId?: string) =>
    [...userPreferencesKeys.all, userId ?? "anonymous"] as const,
};

export const useUserPreferencesQuery = (userId?: string) => {
  return useQuery<UserPreferences | null>({
    queryKey: userPreferencesKeys.byUser(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId as string)
        .maybeSingle();
      if (error) throw error;
      return mapUserPreferencesRow(data ?? null);
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
};
