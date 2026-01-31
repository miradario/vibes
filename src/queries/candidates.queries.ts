import { useQuery } from "@tanstack/react-query";
import { getCandidates } from "../api/modules/candidates/candidates.api";
import type { GetCandidatesParams, GetCandidatesResponse } from "../api/modules/candidates/candidates.types";

export const candidatesKeys = {
  all: ["candidates"] as const,
  list: (params?: GetCandidatesParams) =>
    [...candidatesKeys.all, params ?? {}] as const,
};

export const useCandidatesQuery = (params?: GetCandidatesParams) => {
  return useQuery<GetCandidatesResponse>({
    queryKey: candidatesKeys.list(params),
    queryFn: () => {
      const resolvedParams = params ?? {};
      const limit = resolvedParams.limit ?? 20;
      return getCandidates({ ...resolvedParams, limit });
    },
    staleTime: 30_000,
  });
};
