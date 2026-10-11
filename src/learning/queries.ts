import { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "../auth/auth.queries";
import { LEARNING_ENABLED } from "../featureFlags/useLearningEnabled";
import { supabase } from "../lib/supabase";
import type { LearningData, RosterStudent } from "./types";
export async function learningRpc<T = unknown>(
  name: string,
  args?: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.rpc(`learning_${name}`, args);
  if (error) throw error;
  return data as T;
}
export async function loadLearning(): Promise<LearningData> {
  const access = await learningRpc<LearningData["access"]>("access");
  if (!access.enabled)
    return {
      access,
      profiles: [],
      activities: [],
      sessions: [],
      links: [],
      enrollments: [],
    };
  const requests = await Promise.all([
    supabase.from("learning_profiles").select("*").order("name").limit(500),
    supabase
      .from("learning_activities")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("learning_sessions")
      .select("*")
      .order("starts_at")
      .limit(5000),
    supabase.from("learning_teacher_places").select("*").limit(2000),
    supabase
      .from("learning_enrollments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  for (const r of requests) if (r.error) throw r.error;
  return {
    access,
    profiles: requests[0].data as any,
    activities: requests[1].data as any,
    sessions: requests[2].data as any,
    links: requests[3].data as any,
    enrollments: requests[4].data as any,
  };
}
export function useLearningData() {
  const { data: session } = useAuthSession();
  const q = useQuery({
    queryKey: ["learning", session?.user.id, "catalog"],
    queryFn: loadLearning,
    enabled: LEARNING_ENABLED && !!session?.user.id,
    staleTime: 15000,
    retry: 1,
  });
  useFocusEffect(
    useCallback(() => {
      if (LEARNING_ENABLED && session?.user.id) void q.refetch();
    }, [session?.user.id, q.refetch])
  );
  return { ...q, userId: session?.user.id };
}
export function useLearningMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      name,
      args,
    }: {
      name: string;
      args?: Record<string, unknown>;
    }) => learningRpc(name, args),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["learning"] });
    },
  });
}
export function useLearningRoster(id: string, allowed: boolean) {
  const { data: session } = useAuthSession();
  return useQuery({
    queryKey: ["learning", session?.user.id, "roster", id],
    queryFn: () => learningRpc<RosterStudent[]>("roster", { p_id: id }),
    enabled: LEARNING_ENABLED && allowed && !!session?.user.id,
    staleTime: 0,
    retry: 1,
  });
}
