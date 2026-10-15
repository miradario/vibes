import { Share } from "react-native";
import type { EventFeedItem } from "../queries/events.queries";

export const VIBES_PUBLIC_ORIGIN = "https://vibes.gurudevelopers.dev";

export const buildPublicContentUrl = (
  content: Pick<EventFeedItem, "id" | "type">,
) =>
  content.id
    ? `${VIBES_PUBLIC_ORIGIN}/${content.type}/${encodeURIComponent(content.id)}`
    : null;

export const shareChallengeInvite = async (challenge: EventFeedItem) => {
  const challengeUrl = buildPublicContentUrl(challenge);
  const message = [challenge.title, challengeUrl].filter(Boolean).join("\n");

  return Share.share({ message, url: challengeUrl ?? undefined });
};

export const shareChallengeProgress = async (
  challenge: EventFeedItem,
  input: { currentDay: number; totalDays: number; streak: number },
) => {
  const challengeUrl = buildPublicContentUrl(challenge);
  const message = [challenge.title, challengeUrl].filter(Boolean).join("\n");

  return Share.share({ message, url: challengeUrl ?? undefined });
};

export const shareEventInvite = async (event: EventFeedItem) => {
  const eventUrl = buildPublicContentUrl(event);
  const message = [event.title, eventUrl].filter(Boolean).join("\n");

  return Share.share({ message, url: eventUrl ?? undefined });
};
