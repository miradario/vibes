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

const normalizeMatchPair = (leftUserId: string, rightUserId: string) =>
  leftUserId < rightUserId
    ? { user1Id: leftUserId, user2Id: rightUserId }
    : { user1Id: rightUserId, user2Id: leftUserId };

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
        const normalizedPair = normalizeMatchPair(userId, payload.targetUserId);
        const { data: mutual, error: mutualErr } = await supabase
          .from("swipes")
          .select("id")
          .eq("swiper_id", payload.targetUserId)
          .eq("target_id", userId)
          .eq("direction", "like")
          .maybeSingle();

        console.log("[swipe] mutual check:", mutual?.id ?? "none", "error:", mutualErr?.message);

        if (mutualErr) {
          throw new Error(mutualErr.message);
        }

        if (mutual) {
          // Mutual like! Only treat it as a match once the canonical row exists.
          const findExistingMatch = async () =>
            supabase
              .from("matches")
              .select("id")
              .eq("user1_id", normalizedPair.user1Id)
              .eq("user2_id", normalizedPair.user2Id)
              .maybeSingle();

          const { data: existingMatch, error: existErr } = await findExistingMatch();

          console.log("[swipe] existing match:", existingMatch?.id ?? "none", "error:", existErr?.message);

          if (existErr) {
            throw new Error(existErr.message);
          }

          if (existingMatch) {
            console.log("[swipe] → MATCH! existing canonical row found");
            return { match: true, swipeId };
          }

          const { data: createdMatch, error: createMatchErr } = await supabase
            .from("matches")
            .insert({
              user1_id: normalizedPair.user1Id,
              user2_id: normalizedPair.user2Id,
            })
            .select("id")
            .single();

          console.log("[swipe] created match:", createdMatch?.id ?? "none", "error:", createMatchErr?.message);

          if (createMatchErr) {
            const { data: recoveredMatch, error: recoverErr } = await findExistingMatch();

            console.log(
              "[swipe] recovered canonical match:",
              recoveredMatch?.id ?? "none",
              "error:",
              recoverErr?.message,
            );

            if (recoverErr) {
              throw new Error(recoverErr.message);
            }

            if (recoveredMatch) {
              if (createMatchErr.code === "23505") {
                console.log("[swipe] → MATCH! duplicate insert resolved via canonical lookup");
              } else {
                console.warn("[swipe] match insert recovered after error:", createMatchErr);
              }
              return { match: true, swipeId };
            }

            console.error("[swipe] match insert failed without persisted row:", createMatchErr);
            throw new Error(createMatchErr.message);
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
