import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuthSession } from "../auth/auth.queries";
import { useRefetchOnFocus } from "../hooks/useRefetchOnFocus";
import { supabase } from "../lib/supabase";
export type VibesEntry = {
  id: string;
  kind: "meditation" | "share" | "attendance" | "challenge";
  title: string;
  points: number;
  occurred_at: string;
};
export function useVibesSummary() {
  const { data: session } = useAuthSession();
  const userId = session?.user.id;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  const query = useQuery({
    queryKey: ["vibesSummary", userId, start],
    enabled: Boolean(userId),
    staleTime: 10000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_vibes_summary", {
        month_start: start,
        month_end: end,
      });
      if (error) throw error;
      const row = data?.[0];
      return {
        total: Number(row?.total ?? 0),
        thisMonth: Number(row?.this_month ?? 0),
        contributions: Number(row?.contributions ?? 0),
      };
    },
  });
  useRefetchOnFocus(query.refetch, Boolean(userId));
  return query;
}
export function useVibesHistory() {
  const { data: session } = useAuthSession();
  const userId = session?.user.id;
  const query = useInfiniteQuery({
    queryKey: ["vibesHistory", userId],
    enabled: Boolean(userId),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase
        .from("vibes_ledger")
        .select("id,kind,title,points,occurred_at")
        .eq("user_id", userId!)
        .order("occurred_at", { ascending: false })
        .order("id", { ascending: false })
        .range(pageParam, pageParam + 24);
      if (error) throw error;
      return (data ?? []) as VibesEntry[];
    },
    getNextPageParam: (last, pages) =>
      last.length === 25 ? pages.length * 25 : undefined,
  });
  useRefetchOnFocus(query.refetch, Boolean(userId));
  return query;
}

export function useRegisterVibesMeditation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      duration: number;
      meditation_kind: "silent" | "guided";
    }) => {
      const { data, error } = await supabase.rpc(
        "register_vibes_meditation",
        input
      );
      if (error) throw error;
      return data as boolean;
    },
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ["vibesSummary"] }),
        client.invalidateQueries({ queryKey: ["vibesHistory"] }),
      ]),
  });
}
