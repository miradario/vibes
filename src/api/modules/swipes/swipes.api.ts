import { http } from "../../http/axios";
import type { SwipeRequest, SwipeResponse } from "./swipes.types";

export const createSwipe = async (payload: SwipeRequest): Promise<SwipeResponse> => {
  const { data } = await http.post<SwipeResponse>("/swipe", payload);
  return data;
};
