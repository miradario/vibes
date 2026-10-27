import type { EventFeedItem } from "../queries/events.queries";

// Challenges curated by Vibes carry this tag. They are public and form the
// "Por Vibes" catalog: users restart them (solo or with friends) instead of
// joining the original. Only the database (service role / SQL) can set it.
export const CURATED_CHALLENGE_TAG = "por-vibes";

export const isCuratedChallenge = (item: Pick<EventFeedItem, "tags" | "visibility">) =>
  (item.visibility ?? "public") === "public" && Boolean(item.tags?.includes(CURATED_CHALLENGE_TAG));
