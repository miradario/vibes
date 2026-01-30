import { useQuery } from "@tanstack/react-query";
import { fetchCandidates } from "../services/candidates.service";
import type { GetCandidatesParams, GetCandidatesResponse } from "../api/modules/candidates/candidates.types";

export const candidatesKeys = {
  all: ["candidates"] as const,
  list: (params?: GetCandidatesParams) =>
    [...candidatesKeys.all, params ?? {}] as const,
};

export const useCandidatesQuery = (params?: GetCandidatesParams) => {
  return useQuery<GetCandidatesResponse>({
    queryKey: candidatesKeys.list(params),
    queryFn: () => fetchCandidates(params ?? {}),
    staleTime: 30_000,
  });
};
