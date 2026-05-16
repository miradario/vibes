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

const DEFAULT_GENDER_ID = 3;
const DEFAULT_INTENT_ID = 3;
const SWIPE_TIMEOUT_MS = 12_000;

const withTimeout = async <T,>(promise: PromiseLike<T>, message: string) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), SWIPE_TIMEOUT_MS);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const ensureProfileExists = async (userId: string, fallbackName?: string | null) => {
  const displayName =
    typeof fallbackName === "string" && fallbackName.trim().length > 0
      ? fallbackName.trim()
      : "Vibes";

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        display_name: displayName,
        gender_id: DEFAULT_GENDER_ID,
        intent_id: DEFAULT_INTENT_ID,
      },
      { onConflict: "id" },
    );

  if (error) throw new Error(`Perfil: ${error.message}`);
};

export const useSwipeMutation = () => {
  const queryClient = useQueryClient();
  const { data: session } = useAuthSession();

  return useMutation<SwipeResult, Error, SwipeInput, SwipeContext>({
    mutationFn: async (payload) => {
      const userId = session?.user?.id;
      if (!userId) throw new Error("Not authenticated");
      if (payload.targetUserId === userId) {
        throw new Error("No podés conectar con tu propio perfil.");
      }

      const persistedDirection =
        payload.direction === "pass" ? "nope" : payload.direction;

      await ensureProfileExists(userId, session.user.email?.split("@")[0]);

      // 1. Persist swipe. Insert first, then update if the pair already exists.
      let { data: swipe, error: swipeErr } = await withTimeout(
        supabase
          .from("swipes")
          .insert({
            swiper_id: userId,
            target_id: payload.targetUserId,
            direction: persistedDirection,
          })
          .select("id, direction")
          .single(),
        "No se pudo conectar. Revisá tu conexión e intentá de nuevo.",
      );

      if (swipeErr?.code === "23505") {
        const updateResponse = await withTimeout(
          supabase
            .from("swipes")
            .update({ direction: persistedDirection })
            .eq("swiper_id", userId)
            .eq("target_id", payload.targetUserId)
            .select("id, direction")
            .single(),
          "No se pudo actualizar la conexión. Intentá de nuevo.",
        );
        swipe = updateResponse.data;
        swipeErr = updateResponse.error;
      }

      if (swipeErr) {
        throw new Error(swipeErr.message);
      }
      if (!swipe) {
        throw new Error("No se pudo guardar la conexión.");
      }

      const swipeId = swipe.id;

      // 2. If "like", check if the other person also liked us
      if (persistedDirection === "like") {
        const normalizedPair = normalizeMatchPair(userId, payload.targetUserId);
        const { data: mutual, error: mutualErr } = await withTimeout(
          supabase
            .from("swipes")
            .select("id")
            .eq("swiper_id", payload.targetUserId)
            .eq("target_id", userId)
            .eq("direction", "like")
            .maybeSingle(),
          "No se pudo confirmar la conexión. Intentá de nuevo.",
        );

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

          const { data: existingMatch, error: existErr } = await withTimeout(
            findExistingMatch(),
            "No se pudo verificar el match. Intentá de nuevo.",
          );

          if (existErr) {
            throw new Error(existErr.message);
          }

          if (existingMatch) {
            return { match: true, swipeId };
          }

          const { error: createMatchErr } = await withTimeout(
            supabase
              .from("matches")
              .insert({
                user1_id: normalizedPair.user1Id,
                user2_id: normalizedPair.user2Id,
              })
              .select("id")
              .single(),
            "No se pudo crear el match. Intentá de nuevo.",
          );

          if (createMatchErr) {
            const { data: recoveredMatch, error: recoverErr } = await withTimeout(
              findExistingMatch(),
              "No se pudo verificar el match. Intentá de nuevo.",
            );

            if (recoverErr) {
              throw new Error(recoverErr.message);
            }

            if (recoveredMatch) {
              return { match: true, swipeId };
            }

            throw new Error(createMatchErr.message);
          }

          return { match: true, swipeId };
        }
      }

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
