import { useMutation, useQueryClient } from "@tanstack/react-query";
import { swipe } from "../services/swipes.service";
import { candidatesKeys } from "./candidates.queries";
import type { GetCandidatesResponse } from "../api/modules/candidates/candidates.types";
import type { SwipeRequest, SwipeResponse } from "../api/modules/swipes/swipes.types";

type SwipeContext = {
  previous: Array<[readonly unknown[], GetCandidatesResponse | undefined]>;
};

export const useSwipeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<SwipeResponse, unknown, SwipeRequest, SwipeContext>({
    mutationFn: swipe,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: candidatesKeys.all });

      const previous = queryClient.getQueriesData<GetCandidatesResponse>({
        queryKey: candidatesKeys.all,
      });

      previous.forEach(([key, data]) => {
        if (!data) return;
        queryClient.setQueryData<GetCandidatesResponse>(
          key,
          data.filter((candidate) => candidate.id !== payload.candidateId)
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
    },
  });
};
