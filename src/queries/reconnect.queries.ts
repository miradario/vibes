import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "../auth/auth.queries";
import { supabase } from "../lib/supabase";

export const useReconnectRequests = (enabled: boolean) => {
  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();
  const queryKey = ["connection-reconnects", userId];
  const requests = useQuery({
    queryKey,
    enabled: Boolean(userId) && enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("reengagement_connection_reminders")
        .select("user_id").eq("sender_id", userId!);
      if (error) throw error;
      return (data ?? []).map(row => String(row.user_id));
    },
  });
  const mutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!userId) throw new Error("Not authenticated");
      const { data, error } = await supabase.rpc("request_connection_reconnect", { target_user_id: targetUserId });
      if (error) throw error;
      return data as "queued" | "already_sent" | "try_later" | "unavailable";
    },
    onSuccess: (result, targetUserId) => {
      if (result === "queued" || result === "already_sent") {
        queryClient.setQueryData<string[]>(queryKey, previous => [...new Set([...(previous ?? []), targetUserId])]);
      }
      void queryClient.invalidateQueries({ queryKey });
    },
  });
  return { requests, mutation };
};
