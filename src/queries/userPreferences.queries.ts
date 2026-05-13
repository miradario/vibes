import { useQuery } from "@tanstack/react-query";
import { getUserPreferences } from "../lib/userPreferencesStore";

export type UserPreferences = Record<string, any>;

export const userPreferencesKeys = {
  all: ["user_preferences"] as const,
  byUser: (userId?: string) =>
    [...userPreferencesKeys.all, userId ?? "anonymous"] as const,
};

export const useUserPreferencesQuery = (userId?: string) => {
  return useQuery<UserPreferences | null>(userPreferencesQueryOptions(userId));
};

export const userPreferencesQueryOptions = (userId?: string) => ({
  queryKey: userPreferencesKeys.byUser(userId),
  queryFn: async () => getUserPreferences(userId as string),
  enabled: Boolean(userId),
  staleTime: 60_000,
});
