import { useRef } from "react";
import { Alert } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "../auth/auth.queries";
import { supabase } from "../lib/supabase";
import { useAppActive } from "./communityReceipts.queries";

const tables = {
  direct: "direct_message_hearts",
  group: "group_message_hearts",
  event: "event_message_hearts",
} as const;
type Heart = { message_id: string; user_id: string };
export function useMessageHearts(
  kind: keyof typeof tables,
  conversationId: string | undefined,
  messageIds: string[],
  focused: boolean
) {
  const { data: session } = useAuthSession();
  const userId = session?.user.id;
  const active = useAppActive();
  const client = useQueryClient();
  const pending = useRef(new Set<string>());
  const ids = [
    ...new Set(
      messageIds.filter((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id
        )
      )
    ),
  ].sort();
  const queryKey = ["messageHearts", userId, kind, conversationId, ids];
  const query = useQuery<Heart[]>({
    queryKey,
    enabled: Boolean(
      userId && conversationId && ids.length && focused && active
    ),
    refetchInterval: focused && active ? 2000 : false,
    queryFn: async () => {
      const rows: Heart[] = [];
      for (let start = 0; start < ids.length; start += 100) {
        let offset = 0;
        while (true) {
          const { data, error } = await supabase
            .from(tables[kind])
            .select("message_id,user_id")
            .in("message_id", ids.slice(start, start + 100))
            .order("message_id")
            .order("user_id")
            .range(offset, offset + 999);
          if (error) throw error;
          rows.push(...(data ?? []));
          if (!data || data.length < 1000) break;
          offset += 1000;
        }
      }
      return rows;
    },
  });
  const mutation = useMutation({
    mutationFn: async ({ id, remove }: { id: string; remove: boolean }) => {
      const result = remove
        ? await supabase
            .from(tables[kind])
            .delete()
            .eq("message_id", id)
            .eq("user_id", userId!)
        : await supabase
            .from(tables[kind])
            .upsert(
              { message_id: id, user_id: userId! },
              { onConflict: "message_id,user_id", ignoreDuplicates: true }
            );
      if (result.error) throw result.error;
    },
    onMutate: async ({ id, remove }) => {
      await client.cancelQueries({ queryKey });
      const previous = client.getQueryData<Heart[]>(queryKey) ?? [];
      const hadHeart = previous.some(
        (r) => r.message_id === id && r.user_id === userId
      );
      client.setQueryData<Heart[]>(queryKey, (rows = []) => {
        const rest = rows.filter(
          (r) => !(r.message_id === id && r.user_id === userId)
        );
        return remove ? rest : [...rest, { message_id: id, user_id: userId! }];
      });
      return { hadHeart, queryKey, userId };
    },
    onError: (_error, { id }, context) => {
      if (context)
        client.setQueryData<Heart[]>(context.queryKey, (rows = []) => {
          const rest = rows.filter(
            (r) => !(r.message_id === id && r.user_id === context.userId)
          );
          return context.hadHeart
            ? [...rest, { message_id: id, user_id: context.userId! }]
            : rest;
        });
      Alert.alert("No se pudo guardar el corazón", "Volvé a intentarlo.");
    },
    onSettled: (_data, _error, { id }, context) => {
      pending.current.delete(id);
      void client.invalidateQueries({
        queryKey: context?.queryKey ?? queryKey,
      });
    },
  });
  const react = (id: string, remove = false) => {
    if (!userId || !ids.includes(id) || pending.current.has(id)) return;
    pending.current.add(id);
    mutation.mutate({ id, remove });
  };
  const byMessage = new Map<string, { count: number; liked: boolean }>();
  for (const row of query.data ?? []) {
    const value = byMessage.get(row.message_id) ?? { count: 0, liked: false };
    value.count += 1;
    value.liked ||= row.user_id === userId;
    byMessage.set(row.message_id, value);
  }
  return { byMessage, react };
}
