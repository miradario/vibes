import type { components, paths } from "../../openapi/schema";

export type Candidate = components["schemas"]["Candidate"];
export type GetCandidatesParams =
  paths["/candidates"]["get"]["parameters"]["query"];
export type GetCandidatesResponse =
  paths["/candidates"]["get"]["responses"][200]["content"]["application/json"];
