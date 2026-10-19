import { useContext, useEffect } from "react";
import { AppState } from "react-native";
import { NavigationContext } from "@react-navigation/native";
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
  // Refetch when the screen gains focus, like useFocusEffect, but without
  // requiring a navigator: overlays mounted outside the NavigationContainer
  // (e.g. FtuxGuide) get null here and rely on the AppState refetch below.
  const navigation = useContext(NavigationContext);
  useEffect(() => {
    if (!navigation || !userId) return;
    if (navigation.isFocused()) void query.refetch();
    return navigation.addListener("focus", () => void query.refetch());
  }, [navigation, userId, query.refetch]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active" && userId) void query.refetch();
    });
    return () => subscription.remove();
  }, [userId, query.refetch]);
  return query;
}
