import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuthSession } from "../auth/auth.queries";
import {
  ChallengeDay,
  DayDraft,
  persistedAttachments,
  validateDayDraft,
} from "../lib/challengeDayContent";
const key = (challengeId: string, userId?: string) => [
  "challengeDays",
  userId,
  challengeId,
];
export function useChallengeDays(challengeId: string, enabled: boolean) {
  const { data: session } = useAuthSession();
  return useQuery({
    queryKey: key(challengeId, session?.user.id),
    enabled: enabled && Boolean(session),
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_days")
        .select("*")
        .eq("challenge_id", challengeId)
        .order("day");
      if (error) throw error;
      return data as ChallengeDay[];
    },
  });
}
export function useSaveChallengeDay() {
  const client = useQueryClient();
  const { data: session } = useAuthSession();
  return useMutation({
    mutationFn: async (draft: DayDraft) => {
      validateDayDraft(draft);
      if (draft.attachments.some((a) => a.type !== "link" && !a.path))
        throw new Error("Todavía hay archivos sin subir.");
      const { data, error } = await supabase.rpc("save_challenge_day", {
        target_challenge: draft.challenge_id,
        target_day: draft.day,
        new_title: draft.title.trim(),
        new_description: draft.description.trim(),
        new_attachments: persistedAttachments(draft.attachments),
        expected_revision: draft.revision,
      });
      if (error) {
        // A previous request may have committed before its response was lost.
        const latest = await supabase
          .from("challenge_days")
          .select("*")
          .eq("challenge_id", draft.challenge_id)
          .eq("day", draft.day)
          .maybeSingle();
        if (
          latest.data &&
          latest.data.revision === draft.revision + 1 &&
          latest.data.title === draft.title.trim() &&
          latest.data.description === draft.description.trim() &&
          JSON.stringify(persistedAttachments(latest.data.attachments)) ===
            JSON.stringify(persistedAttachments(draft.attachments))
        )
          return latest.data as ChallengeDay;
        throw new Error(error.message);
      }
      return data as ChallengeDay;
    },
    onSuccess: (day) => {
      client.setQueryData<ChallengeDay[]>(
        key(day.challenge_id, session?.user.id),
        (old) =>
          [...(old ?? []).filter((d) => d.day !== day.day), day].sort(
            (a, b) => a.day - b.day
          )
      );
      void client.invalidateQueries({
        queryKey: key(day.challenge_id, session?.user.id),
      });
    },
  });
}
