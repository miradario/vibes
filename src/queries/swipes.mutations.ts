import { useMutation, useQueryClient } from "@tanstack/react-query";
import { candidatesKeys } from "./candidates.queries";
import { matchKeys } from "./matches.queries";
import { supabase } from "../lib/supabase";
import { useAuthSession } from "../auth/auth.queries";
import type { GetCandidatesResponse } from "../api/modules/candidates/candidates.types";

type SwipeInput = {
  targetUserId: string;
  direction: "like" | "pass" | "nope";
};

type SwipeResult = {
  match: boolean;
  swipeId: string;
};

type SwipeContext = {
  previous: Array<[readonly unknown[], GetCandidatesResponse | undefined]>;
};

export const useSwipeMutation = () => {
  const queryClient = useQueryClient();
  const { data: session } = useAuthSession();

  return useMutation<SwipeResult, Error, SwipeInput, SwipeContext>({
    mutationFn: async (payload) => {
      const userId = session?.user?.id;
      if (!userId) throw new Error("Not authenticated");
      const persistedDirection =
        payload.direction === "pass" ? "nope" : payload.direction;

      console.log("[swipe] userId:", userId, "target:", payload.targetUserId, "dir:", persistedDirection);

      // 1. Upsert swipe so actions like dismiss/connect are idempotent.
      const { data: swipe, error: swipeErr } = await supabase
        .from("swipes")
        .upsert(
          {
            swiper_id: userId,
            target_id: payload.targetUserId,
            direction: persistedDirection,
          },
          { onConflict: "swiper_id,target_id" },
        )
        .select("id, direction")
        .single();

      if (swipeErr) {
        console.log("[swipe] upsert error:", swipeErr.message);
        throw new Error(swipeErr.message);
      } else {
        console.log("[swipe] persisted direction:", swipe.direction);
      }

      const swipeId = swipe.id;

      console.log("[swipe] swipeId:", swipeId);

      // 2. If "like", check if the other person also liked us
      if (persistedDirection === "like") {
        const { data: mutual, error: mutualErr } = await supabase
          .from("swipes")
          .select("id")
          .eq("swiper_id", payload.targetUserId)
          .eq("target_id", userId)
          .eq("direction", "like")
          .maybeSingle();

        console.log("[swipe] mutual check:", mutual?.id ?? "none", "error:", mutualErr?.message);

        if (mutual) {
          const findExistingMatch = async () => {
            const { data, error } = await supabase
              .from("matches")
              .select("id")
              .or(
                `and(user1_id.eq.${userId},user2_id.eq.${payload.targetUserId}),and(user1_id.eq.${payload.targetUserId},user2_id.eq.${userId})`,
              )
              .maybeSingle();

            if (error) {
              console.error("[swipe] findExistingMatch error:", error);
              throw new Error(error.message);
            }

            return data ?? null;
          };

          // Mutual like! Create match if it doesn't exist
          const existingMatch = await findExistingMatch().catch((error) => {
            console.error("[swipe] existing match lookup failed:", error);
            throw error;
          });
          const existErr = null;

          console.log("[swipe] existing match:", existingMatch?.id ?? "none", "error:", existErr?.message);

          if (!existingMatch) {
            // Try with is_active first, fallback without it
            let matchErr: any = null;
            let newMatch: any = null;

            const res1 = await supabase
              .from("matches")
              .insert({
                user1_id: userId,
                user2_id: payload.targetUserId,
                is_active: true,
              })
              .select("id")
              .single();

            if (res1.error) {
              // Column might not exist, try without is_active
              console.log("[swipe] match insert with is_active failed:", res1.error.message);
              const res2 = await supabase
                .from("matches")
                .insert({
                  user1_id: userId,
                  user2_id: payload.targetUserId,
                })
                .select("id")
                .single();
              matchErr = res2.error;
              newMatch = res2.data;
            } else {
              matchErr = res1.error;
              newMatch = res1.data;
            }

            console.log("[swipe] created match:", newMatch?.id, "error:", matchErr?.message);
            if (matchErr) {
              const retryMatch = await findExistingMatch();
              if (!retryMatch) {
                console.error("[swipe] match insert failed without persisted row:", matchErr);
                throw new Error(matchErr.message || "No se pudo crear el match.");
              }
            }
          }

          console.log("[swipe] → MATCH! returning true");
          return { match: true, swipeId };
        }
      }

      console.log("[swipe] → no match, returning false");
      return { match: false, swipeId };
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: candidatesKeys.all });

      const previous = queryClient.getQueriesData<GetCandidatesResponse>({
        queryKey: candidatesKeys.all,
      });

      previous.forEach(([key, data]) => {
        if (!data) return;
        queryClient.setQueryData<GetCandidatesResponse>(
          key,
          data.filter((candidate) => candidate.id !== payload.targetUserId),
        );
      });

      return { previous };
    },
    onError: (_error, _payload, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: candidatesKeys.all });
      queryClient.invalidateQueries({ queryKey: matchKeys.all });
    },
  });
};
