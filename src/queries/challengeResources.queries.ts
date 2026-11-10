import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuthSession } from "../auth/auth.queries";
import {
  ChallengeResources,
  ResourceDraft,
  persistedAttachments,
  validateResourceDraft,
} from "../lib/challengeDayContent";

const key = (challengeId: string, userId?: string) => [
  "challengeResources",
  userId,
  challengeId,
];

export function useChallengeResources(challengeId: string, enabled: boolean) {
  const { data: session } = useAuthSession();
  return useQuery<ChallengeResources>({
    queryKey: key(challengeId, session?.user.id),
    enabled: enabled && Boolean(session && challengeId),
    refetchInterval: 30000,
    queryFn: async (): Promise<ChallengeResources> => {
      const { data, error } = await supabase
        .from("challenge_resources")
        .select("*")
        .eq("challenge_id", challengeId)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return {
          challenge_id: challengeId,
          attachments: [],
          revision: 0,
        } as ChallengeResources;
      }
      return data as ChallengeResources;
    },
  });
}

export function useSaveChallengeResources() {
  const client = useQueryClient();
  const { data: session } = useAuthSession();
  return useMutation({
    mutationFn: async (draft: ResourceDraft) => {
      validateResourceDraft(draft.attachments);
      if (draft.attachments.some((a) => a.type !== "link" && !a.path))
        throw new Error("Todavía hay archivos sin subir.");
      const attachments = persistedAttachments(draft.attachments);
      const { data, error } = await supabase.rpc("save_challenge_resources", {
        target_challenge: draft.challenge_id,
        new_attachments: attachments,
        expected_revision: draft.revision,
      });
      if (error) {
        const latest = await supabase
          .from("challenge_resources")
          .select("*")
          .eq("challenge_id", draft.challenge_id)
          .maybeSingle();
        if (
          latest.data &&
          latest.data.revision === draft.revision + 1 &&
          JSON.stringify(persistedAttachments(latest.data.attachments)) ===
            JSON.stringify(attachments)
        )
          return latest.data as ChallengeResources;
        throw new Error(error.message);
      }
      return data as ChallengeResources;
    },
    onSuccess: (resources) => {
      client.setQueryData<ChallengeResources>(
        key(resources.challenge_id, session?.user.id),
        resources
      );
      void client.invalidateQueries({
        queryKey: key(resources.challenge_id, session?.user.id),
      });
    },
  });
}
