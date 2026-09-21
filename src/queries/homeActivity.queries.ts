import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "../auth/auth.queries";
import { supabase } from "../lib/supabase";
import { useAppActive } from "./communityReceipts.queries";

export const connectionViewsKey = (userId?: string) => [
  "connectionViews",
  userId,
];
export function useConnectionViewsQuery() {
  const { data: session } = useAuthSession();
  const userId = session?.user.id;
  const active = useAppActive();
  return useQuery({
    queryKey: connectionViewsKey(userId),
    enabled: !!userId && active,
    refetchInterval: active ? 5000 : false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connection_views")
        .select("match_id")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).map((row) => String(row.match_id));
    },
  });
}

export function useConnectionOpened(
  matchId: string | undefined,
  focused: boolean
) {
  const { data: session } = useAuthSession();
  const userId = session?.user.id;
  const client = useQueryClient();
  const mutation = useMutation({
    mutationKey: ["openConnection", userId, matchId],
    retry: 2,
    mutationFn: async ({
      userId,
      matchId,
    }: {
      userId: string;
      matchId: string;
    }) => {
      const { error } = await supabase
        .from("connection_views")
        .upsert(
          { user_id: userId!, match_id: matchId! },
          { onConflict: "user_id,match_id", ignoreDuplicates: true }
        );
      if (error) throw error;
    },
    onSuccess: (_, { userId, matchId }) => {
      client.setQueryData<string[]>(connectionViewsKey(userId), (old) =>
        Array.from(new Set([...(old ?? []), matchId!]))
      );
      void client.invalidateQueries({ queryKey: connectionViewsKey(userId) });
    },
  });
  useEffect(() => {
    if (focused && userId && matchId) mutation.mutate({ userId, matchId });
  }, [focused, userId, matchId, mutation.mutate]);
}
