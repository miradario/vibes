import { useCallback, useEffect } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export function useEmailOwnershipQuery(userId?: string) {
  const query = useQuery({
    queryKey: ["emailOwnership", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    },
  });
  useFocusEffect(useCallback(() => {
    if (userId) void query.refetch();
  }, [userId, query.refetch]));
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active" && userId) void query.refetch();
    });
    return () => subscription.remove();
  }, [userId, query.refetch]);
  return query;
}
