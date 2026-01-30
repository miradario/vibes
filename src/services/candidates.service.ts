import { getCandidates } from "../api/modules/candidates/candidates.api";
import type {
  GetCandidatesParams,
  GetCandidatesResponse,
} from "../api/modules/candidates/candidates.types";

export const fetchCandidates = async (
  params: GetCandidatesParams = {}
): Promise<GetCandidatesResponse> => {
  const limit = params.limit ?? 20;
  return getCandidates({ ...params, limit });
};
