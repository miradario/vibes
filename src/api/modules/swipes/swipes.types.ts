import type { components, paths } from "../../openapi/schema";

export type SwipeRequest = components["schemas"]["SwipeRequest"];
export type SwipeResponse =
  paths["/swipes"]["post"]["responses"][200]["content"]["application/json"];
