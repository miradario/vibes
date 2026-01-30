import { http } from "../../http/axios";
import type { GetCandidatesParams, GetCandidatesResponse } from "./candidates.types";

export const getCandidates = async (params?: GetCandidatesParams): Promise<GetCandidatesResponse> => {
  const { data } = await http.get<GetCandidatesResponse>("/get-candidates", {
    params,
  });
  return data;
};
