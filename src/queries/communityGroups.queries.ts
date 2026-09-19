import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuthSession } from "../auth/auth.queries";

export type CommunityGroup = {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
};
export type CommunityMessage = {
  id: string;
  group_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  senderName: string;
  message_kind: "message" | "system";
};

export function useCommunityGroupsQuery() {
  const { data: session } = useAuthSession();
  const client = useQueryClient();
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`community-groups:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "community_groups",
        },
        () => {
          void client.invalidateQueries({
            queryKey: ["communityGroups", userId],
          });
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, client]);
  return useQuery<CommunityGroup[]>({
    queryKey: ["communityGroups", userId],
    enabled: Boolean(userId),
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_groups")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateCommunityGroupMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      description: string;
      memberIds: string[];
    }) => {
      const { data, error } = await supabase.rpc("create_community_group", {
        group_name: input.name.trim(),
        group_description: input.description.trim(),
        member_ids: input.memberIds,
      });
      if (error) throw error;
      return String(data);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["communityGroups"] });
    },
  });
}

export function useCommunityMessagesQuery(groupId: string) {
  const client = useQueryClient();
  const { data: session } = useAuthSession();
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId || !groupId) return;
    const channel = supabase
      .channel(`community-chat:${groupId}:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "community_group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          void client.invalidateQueries({
            queryKey: ["communityMessages", userId, groupId],
          });
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [groupId, userId, client]);
  return useQuery<CommunityMessage[]>({
    queryKey: ["communityMessages", userId, groupId],
    enabled: Boolean(userId && groupId),
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_group_messages")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const ids = [...new Set((data ?? []).map((row) => row.sender_id))];
      const profiles = ids.length
        ? await supabase
            .from("profiles")
            .select("id, display_name")
            .in("id", ids)
        : { data: [] };
      const names = new Map(
        (profiles.data ?? []).map((row) => [row.id, row.display_name])
      );
      return (data ?? []).map((row) => ({
        ...row,
        senderName: names.get(row.sender_id) || "Miembro",
      }));
    },
  });
}

export function useSendCommunityMessageMutation(groupId: string) {
  const { data: session } = useAuthSession();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      if (!session?.user.id)
        throw new Error("Iniciá sesión para enviar mensajes");
      const { error } = await supabase.from("community_group_messages").insert({
        group_id: groupId,
        sender_id: session.user.id,
        body: body.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: ["communityMessages", session?.user.id, groupId],
      });
    },
  });
}
