import { createSwipe } from "../api/modules/swipes/swipes.api";
import type { SwipeRequest, SwipeResponse } from "../api/modules/swipes/swipes.types";

export const swipe = async (payload: SwipeRequest): Promise<SwipeResponse> => {
  return createSwipe(payload);
};

export const swipeLike = async (
  candidateId: string
): Promise<SwipeResponse> => swipe({ candidateId, direction: "like" });

export const swipeNope = async (
  candidateId: string
): Promise<SwipeResponse> => swipe({ candidateId, direction: "nope" });

export const swipeSuper = async (
  candidateId: string
): Promise<SwipeResponse> => swipe({ candidateId, direction: "super" });
