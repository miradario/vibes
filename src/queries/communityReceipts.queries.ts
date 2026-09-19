import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type ViewToken } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "../auth/auth.queries";
import { supabase } from "../lib/supabase";
export type MessageKind = "direct" | "group";
export type ReceiptStatus = "sending" | "sent" | "delivered" | "read";
type Unread = {
  kind: MessageKind | "event" | "challenge";
  conversation_id: string;
  unread_count: number;
};
export function useAppActive() {
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) =>
      setActive(state === "active")
    );
    return () => sub.remove();
  }, []);
  return active;
}
export function useCommunityUnreadQuery() {
  const { data: session } = useAuthSession();
  const active = useAppActive();
  return useQuery<Unread[]>({
    queryKey: ["communityUnread", session?.user.id],
    enabled: Boolean(session) && active,
    refetchInterval: active ? 5000 : false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("community_unread_counts");
      if (error) throw error;
      return data ?? [];
    },
  });
}
export function useCommunityDeliverySync() {
  const { data: session } = useAuthSession();
  const active = useAppActive();
  const client = useQueryClient();
  useQuery({
    queryKey: ["communityDelivery", session?.user.id],
    enabled: Boolean(session) && active,
    refetchInterval: active ? 3000 : false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("community_receive_messages");
      if (error) throw error;
      // Successful response contains the actual message content, not just a push notification.
      for (const kind of ["direct", "group"] as const) {
        const ids = (data ?? [])
          .filter((r: any) => r.kind === kind)
          .map((r: any) => r.message_id);
        if (ids.length) {
          const result = await supabase.rpc("community_ack_messages", {
            k: kind,
            ids,
            mark_read: false,
          });
          if (result.error) throw result.error;
        }
      }
      if (data?.length) {
        void client.invalidateQueries({ queryKey: ["communityUnread"] });
        void client.invalidateQueries({ queryKey: ["communityMessages"] });
        void client.invalidateQueries({ queryKey: ["matches"] });
      }
      return null;
    },
  });
}
export function useMessageReceipts(
  kind: MessageKind,
  conversationId: string | undefined,
  messages: Array<{ id: string; senderId: string }>,
  focused: boolean
) {
  const { data: session } = useAuthSession();
  const active = useAppActive();
  const client = useQueryClient();
  const ownIds = messages
    .filter((m) => m.senderId === session?.user.id && !m.id.startsWith("temp"))
    .map((m) => m.id)
    .filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  const statusQuery = useQuery<
    Array<{ message_id: string; status: ReceiptStatus }>
  >({
    queryKey: [
      "communityStatuses",
      session?.user.id,
      kind,
      conversationId,
      ownIds,
    ],
    enabled: Boolean(
      session && conversationId && ownIds.length && focused && active
    ),
    refetchInterval: focused && active ? 2000 : false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("community_message_statuses", {
        k: kind,
        ids: ownIds,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const seen = useRef(new Set<string>());
  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 10,
    minimumViewTime: 500,
  }).current;
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) =>
      setVisibleIds(
        viewableItems.filter((v) => v.isViewable).map((v) => String(v.item.id))
      ),
    []
  );
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    seen.current.clear();
    setVisibleIds([]);
  }, [kind, conversationId, session?.user.id]);
  useEffect(() => {
    if (!focused || !active || !session) return;
    const incoming = new Set(
      messages.filter((m) => m.senderId !== session.user.id).map((m) => m.id)
    );
    const ids = visibleIds.filter(
      (id) => incoming.has(id) && !seen.current.has(id)
    );
    if (!ids.length) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void supabase
      .rpc("community_ack_messages", { k: kind, ids, mark_read: true })
      .then(({ error }) => {
        if (cancelled) return;
        if (error) {
          timer = setTimeout(() => setRetry((v) => v + 1), 3000);
          return;
        }
        ids.forEach((id) => seen.current.add(id));
        void client.invalidateQueries({ queryKey: ["communityUnread"] });
      });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [
    visibleIds,
    kind,
    conversationId,
    focused,
    active,
    session?.user.id,
    messages,
    retry,
    client,
  ]);
  return {
    statuses: new Map(
      (statusQuery.data ?? []).map((r) => [r.message_id, r.status])
    ),
    onViewableItemsChanged,
    viewabilityConfig,
  };
}
