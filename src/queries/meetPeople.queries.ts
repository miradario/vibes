import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "../auth/auth.queries";
import { useUserPreferencesQuery, userPreferencesKeys } from "./userPreferences.queries";
import { isMeetPeopleEnabled } from "../lib/meetPeople";
import { supabase } from "../lib/supabase";
import { mapUserPreferencesRow } from "../api/mappers/userPreferences.mapper";

export const useMeetPeople = () => {
  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  const query = useUserPreferencesQuery(userId);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!userId) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("user_preferences")
        .upsert({ user_id: userId, meet_people_enabled: enabled }, { onConflict: "user_id" }).select("*").single();
      if (error) throw error;
      return mapUserPreferencesRow(data);
    },
    onSuccess: data => {
      queryClient.setQueryData(userPreferencesKeys.byUser(userId), data);
      void queryClient.invalidateQueries({ queryKey: ["candidates"] });
      void queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });
  return { enabled: query.isSuccess && isMeetPeopleEnabled(query.data), ready: query.isSuccess, query, mutation };
};
