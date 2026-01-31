import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSwipe } from "../api/modules/swipes/swipes.api";
import { candidatesKeys } from "./candidates.queries";
import { normalizeAxiosError, type ApiError } from "../api/http/errors";
import type { GetCandidatesResponse } from "../api/modules/candidates/candidates.types";
import type { SwipeRequest, SwipeResponse } from "../api/modules/swipes/swipes.types";

type SwipeContext = {
  previous: Array<[readonly unknown[], GetCandidatesResponse | undefined]>;
};

export const useSwipeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<SwipeResponse, ApiError, SwipeRequest, SwipeContext>({
    mutationFn: async (payload) => {
      try {
        return await createSwipe(payload);
      } catch (error) {
        throw normalizeAxiosError(error);
      }
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
    onError: (error, _payload, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: candidatesKeys.all });
    },
  });
};
