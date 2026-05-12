import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { createSignedProfilePhotoUrl } from "../lib/profilePhotoStorage";

export type MeditationPresenceVisibility = "public" | "friends" | "private";
export type MeditationType = "silent" | "guided";

export type MeditatedTodayUser = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  streak: number;
  durationMinutes: number;
  meditationType: MeditationType;
};

export const meditationPresenceKeys = {
  all: ["meditationPresence"] as const,
  todayFriends: (userId?: string) =>
    [...meditationPresenceKeys.all, "todayFriends", userId ?? "anon"] as const,
};

const fetchConnectedUserIds = async (userId: string) => {
  const { data, error } = await supabase
    .from("matches")
    .select("user1_id, user2_id")
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

  if (error) throw error;

  return Array.from(
    new Set(
      (data ?? []).map((row: any) =>
        String(row.user1_id) === userId
          ? String(row.user2_id)
          : String(row.user1_id),
      ),
    ),
  );
};

const getTodayKey = () => new Date().toISOString().split("T")[0];

const buildStreakMap = (rows: Array<{ user_id: string; presence_date: string }>) => {
  const grouped = new Map<string, Set<string>>();

  for (const row of rows) {
    const key = String(row.user_id);
    const days = grouped.get(key) ?? new Set<string>();
    days.add(String(row.presence_date));
    grouped.set(key, days);
  }

  const result = new Map<string, number>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const [userId, days] of grouped.entries()) {
    const cursor = new Date(today);
    let streak = 0;
    while (days.has(cursor.toISOString().split("T")[0])) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    result.set(userId, streak);
  }

  return result;
};

const fetchMeditatedTodayFriends = async (
  userId: string,
): Promise<MeditatedTodayUser[]> => {
  const connectedUserIds = await fetchConnectedUserIds(userId);
  if (!connectedUserIds.length) return [];

  const today = getTodayKey();
  const { data: todayRows, error: todayError } = await supabase
    .from("meditation_presence")
    .select("user_id, duration_minutes, meditation_type, presence_date")
    .in("user_id", connectedUserIds)
    .eq("presence_date", today)
    .in("visibility", ["public", "friends"]);

  if (todayError) throw todayError;
  if (!todayRows?.length) return [];

  const visibleUserIds = Array.from(
    new Set(
      todayRows.map((row: any) => String(row.user_id)).filter(Boolean),
    ),
  );
  const since = new Date();
  since.setDate(since.getDate() - 20);
  const sinceKey = since.toISOString().split("T")[0];

  const [{ data: streakRows, error: streakError }, { data: profiles }, { data: photoRows }] =
    await Promise.all([
      supabase
        .from("meditation_presence")
        .select("user_id, presence_date")
        .in("user_id", visibleUserIds)
        .gte("presence_date", sinceKey),
      supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", visibleUserIds),
      supabase
        .from("profile_photos")
        .select("profile_id, url")
        .in("profile_id", visibleUserIds)
        .order("order", { ascending: true }),
    ]);

  if (streakError) throw streakError;

  const profileMap = new Map<string, string>();
  for (const profile of profiles ?? []) {
    profileMap.set(
      String((profile as any).id),
      typeof (profile as any).display_name === "string"
        ? String((profile as any).display_name)
        : "Vibes",
    );
  }

  const firstPhotoMap = new Map<string, string>();
  for (const photo of photoRows ?? []) {
    const profileId = String((photo as any).profile_id);
    if (!firstPhotoMap.has(profileId) && typeof (photo as any).url === "string") {
      firstPhotoMap.set(profileId, String((photo as any).url));
    }
  }

  const streakMap = buildStreakMap(
    (streakRows ?? []).map((row: any) => ({
      user_id: String(row.user_id),
      presence_date: String(row.presence_date),
    })),
  );

  return Promise.all(
    (todayRows ?? []).map(async (row: any) => {
      const nextUserId = String(row.user_id);
      const rawPhoto = firstPhotoMap.get(nextUserId);
      return {
        userId: nextUserId,
        displayName: profileMap.get(nextUserId) ?? "Vibes",
        avatarUrl: rawPhoto ? await createSignedProfilePhotoUrl(rawPhoto) : null,
        streak: streakMap.get(nextUserId) ?? 1,
        durationMinutes: Number(row.duration_minutes ?? 0) || 5,
        meditationType:
          row.meditation_type === "silent" ? "silent" : "guided",
      };
    }),
  );
};

export const useMeditatedTodayFriendsQuery = (userId?: string) => {
  return useQuery<MeditatedTodayUser[]>({
    queryKey: meditationPresenceKeys.todayFriends(userId),
    queryFn: () => fetchMeditatedTodayFriends(userId as string),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
};

export const useUpsertMeditationPresenceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    unknown,
    {
      userId: string;
      durationMinutes: number;
      meditationType: MeditationType;
      visibility: MeditationPresenceVisibility;
    }
  >({
    mutationFn: async ({
      userId,
      durationMinutes,
      meditationType,
      visibility,
    }) => {
      const { error } = await supabase.from("meditation_presence").upsert(
        {
          user_id: userId,
          presence_date: getTodayKey(),
          duration_minutes: durationMinutes,
          meditation_type: meditationType,
          visibility,
        },
        { onConflict: "user_id,presence_date" },
      );
      if (error) throw error;
    },
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: meditationPresenceKeys.todayFriends(userId),
      });
    },
  });
};
