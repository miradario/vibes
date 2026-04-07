import { useEffect, useRef } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuthSession } from "../auth/auth.queries";
import { createSignedProfilePhotoUrl } from "../lib/profilePhotoStorage";
import { mapSupabaseSelect } from "../api/mappers/case.mapper";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MatchRow = {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: string;
  isActive: boolean;
};

export type MatchWithProfile = MatchRow & {
  otherUserId: string;
  otherUserName: string;
  otherUserPhoto: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
};

export type DirectMessage = {
  id: string;
  matchId: string;
  senderId: string;
  text: string;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const matchKeys = {
  all: ["matches"] as const,
  list: (userId?: string) => [...matchKeys.all, userId ?? "anon"] as const,
};

export const dmKeys = {
  all: ["direct-messages"] as const,
  byMatch: (matchId?: string) => [...dmKeys.all, matchId ?? "none"] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fetch profile name + primary photo for a list of user IDs */
async function fetchProfileSummaries(
  userIds: string[],
): Promise<Map<string, { name: string; photo: string | null }>> {
  const map = new Map<string, { name: string; photo: string | null }>();
  if (userIds.length === 0) return map;

  const [profilesRes, photosRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds),
    supabase
      .from("profile_photos")
      .select("profile_id, url, order")
      .in("profile_id", userIds)
      .order("order", { ascending: true }),
  ]);

  const profiles = mapSupabaseSelect(profilesRes.data ?? []) as Record<string, any>[];
  const photos = mapSupabaseSelect(photosRes.data ?? []) as Record<string, any>[];

  // Build a map of profileId -> first photo URL (signed)
  const firstPhotoByUser = new Map<string, string>();
  for (const photo of photos) {
    const pid = String(photo.profileId ?? "");
    if (!pid || firstPhotoByUser.has(pid)) continue;
    const signed = await createSignedProfilePhotoUrl(photo.url);
    if (signed) firstPhotoByUser.set(pid, signed);
  }

  for (const profile of profiles) {
    const id = String(profile.id ?? "");
    if (!id) continue;
    map.set(id, {
      name: typeof profile.displayName === "string" ? profile.displayName : "Vibes",
      photo: firstPhotoByUser.get(id) ?? null,
    });
  }

  return map;
}

// ---------------------------------------------------------------------------
// useMatchesQuery – all matches for current user
// ---------------------------------------------------------------------------

async function fetchMatches(userId: string): Promise<MatchWithProfile[]> {
  console.log("[matches] fetchMatches for userId:", userId);

  const { data: rows, error } = await supabase
    .from("matches")
    .select("*")
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  console.log("[matches] query result:", { rows: rows?.length, error, rawRows: rows });

  if (error) throw error;

  const matches = (mapSupabaseSelect(rows ?? []) as Record<string, any>[]).map(
    (r): MatchRow => ({
      id: String(r.id),
      user1Id: String(r.user1Id),
      user2Id: String(r.user2Id),
      createdAt: String(r.createdAt),
      isActive: Boolean(r.isActive),
    }),
  );

  // Gather other user IDs
  const otherIds = matches.map((m) =>
    m.user1Id === userId ? m.user2Id : m.user1Id,
  );
  const profileMap = await fetchProfileSummaries(otherIds);

  // Fetch last message for each match
  const matchIds = matches.map((m) => m.id);
  let lastMsgMap = new Map<string, { body: string; createdAt: string }>();

  if (matchIds.length > 0) {
    // Get the most recent message per match using a single query
    const { data: msgRows } = await supabase
      .from("messages")
      .select("match_id, text, created_at")
      .in("match_id", matchIds)
      .order("created_at", { ascending: false });

    const msgs = mapSupabaseSelect(msgRows ?? []) as Record<string, any>[];
    for (const msg of msgs) {
      const mid = String(msg.matchId ?? "");
      if (!mid || lastMsgMap.has(mid)) continue; // first = most recent
      lastMsgMap.set(mid, { body: String(msg.text), createdAt: String(msg.createdAt) });
    }
  }

  return matches.map((m): MatchWithProfile => {
    const otherId = m.user1Id === userId ? m.user2Id : m.user1Id;
    const profile = profileMap.get(otherId);
    const lastMsg = lastMsgMap.get(m.id);
    return {
      ...m,
      otherUserId: otherId,
      otherUserName: profile?.name ?? "Vibes",
      otherUserPhoto: profile?.photo ?? null,
      lastMessage: lastMsg?.body ?? null,
      lastMessageAt: lastMsg?.createdAt ?? null,
    };
  });
}

export const useMatchesQuery = () => {
  const { data: session } = useAuthSession();
  const userId = session?.user?.id;

  return useQuery<MatchWithProfile[]>({
    queryKey: matchKeys.list(userId),
    queryFn: () => fetchMatches(userId!),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
};

// ---------------------------------------------------------------------------
// useCreateMatchMutation – insert a new match (called on mutual like)
// ---------------------------------------------------------------------------

export const useCreateMatchMutation = () => {
  const queryClient = useQueryClient();
  const { data: session } = useAuthSession();

  return useMutation<
    { id: string },
    Error,
    { user1Id: string; user2Id: string }
  >({
    mutationFn: async ({ user1Id, user2Id }) => {
      // The backend /swipe endpoint likely already created the match.
      // First check if it exists.
      const existing = await findMatch(user1Id, user2Id);
      if (existing) return existing;

      // Fallback: create if backend didn't
      const { data, error } = await supabase
        .from("matches")
        .insert({ user1_id: user1Id, user2_id: user2Id })
        .select("id")
        .single();

      if (error) {
        // Might be duplicate — try to find it again
        const retry = await findMatch(user1Id, user2Id);
        if (retry) return retry;
        throw error;
      }
      return { id: data.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchKeys.all });
    },
  });
};

// ---------------------------------------------------------------------------
// useUnmatchMutation – delete a match
// ---------------------------------------------------------------------------

export const useUnmatchMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (matchId) => {
      const { error } = await supabase
        .from("matches")
        .delete()
        .eq("id", matchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchKeys.all });
    },
  });
};

// ---------------------------------------------------------------------------
// useDirectMessagesQuery – messages for a match, with Realtime
// ---------------------------------------------------------------------------

async function fetchDirectMessages(matchId: string): Promise<DirectMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (mapSupabaseSelect(data ?? []) as Record<string, any>[]).map(
    (r): DirectMessage => ({
      id: String(r.id),
      matchId: String(r.matchId),
      senderId: String(r.senderId),
      text: String(r.text),
      createdAt: String(r.createdAt),
    }),
  );
}

export const useDirectMessagesQuery = (matchId?: string) => {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const queryKey = dmKeys.byMatch(matchId);

  const query = useQuery<DirectMessage[]>({
    queryKey,
    queryFn: () => fetchDirectMessages(matchId!),
    enabled: Boolean(matchId),
    staleTime: 10_000,
    refetchInterval: matchId ? 2000 : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`dm:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            const mapped = mapSupabaseSelect([payload.new]);
            const raw = (Array.isArray(mapped)
              ? mapped[0]
              : mapped) as Record<string, any>;
            const msg: DirectMessage = {
              id: String(raw.id),
              matchId: String(raw.matchId),
              senderId: String(raw.senderId),
              text: String(raw.text),
              createdAt: String(raw.createdAt),
            };

            queryClient.setQueryData<DirectMessage[]>(queryKey, (prev) => {
              if (!prev) return [msg];
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }

          queryClient.invalidateQueries({ queryKey });
          queryClient.invalidateQueries({ queryKey: matchKeys.all });
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [matchId, queryClient]);

  return query;
};

// ---------------------------------------------------------------------------
// useSendDirectMessageMutation
// ---------------------------------------------------------------------------

export const useSendDirectMessageMutation = () => {
  const queryClient = useQueryClient();
  const { data: session } = useAuthSession();

  return useMutation<
    DirectMessage,
    Error,
    { matchId: string; body: string }
  >({
    mutationFn: async ({ matchId, body }) => {
      const senderId = session?.user?.id;
      if (!senderId) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("messages")
        .insert({ match_id: matchId, sender_id: senderId, text: body })
        .select("*")
        .single();

      if (error) throw error;
      const raw = (mapSupabaseSelect([data]) as Record<string, any>[])[0];
      return {
        id: String(raw.id),
        matchId: String(raw.matchId),
        senderId: String(raw.senderId),
        text: String(raw.text),
        createdAt: String(raw.createdAt),
      };
    },
    onSuccess: (msg) => {
      queryClient.setQueryData<DirectMessage[]>(
        dmKeys.byMatch(msg.matchId),
        (prev) => {
          if (!prev) return [msg];
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        },
      );
      queryClient.invalidateQueries({ queryKey: matchKeys.all });
    },
  });
};

// ---------------------------------------------------------------------------
// useDeleteDirectMessageMutation
// ---------------------------------------------------------------------------

export const useDeleteDirectMessageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { messageId: string; matchId: string }>({
    mutationFn: async ({ messageId }) => {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: (_, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: dmKeys.byMatch(matchId) });
      queryClient.invalidateQueries({ queryKey: matchKeys.all });
    },
  });
};

// ---------------------------------------------------------------------------
// useFindMatchQuery – find match between current user and another user
// ---------------------------------------------------------------------------

async function findMatch(
  userId: string,
  otherUserId: string,
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("matches")
    .select("id")
    .or(
      `and(user1_id.eq.${userId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${userId})`,
    )
    .maybeSingle();

  if (error) throw error;
  return data ? { id: data.id } : null;
}

export const useFindMatchQuery = (otherUserId?: string) => {
  const { data: session } = useAuthSession();
  const userId = session?.user?.id;

  return useQuery<{ id: string } | null>({
    queryKey: ["match-find", userId, otherUserId],
    queryFn: () => findMatch(userId!, otherUserId!),
    enabled: Boolean(userId) && Boolean(otherUserId),
    staleTime: 60_000,
  });
};
