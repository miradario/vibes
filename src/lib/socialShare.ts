import { Share } from "react-native";
import type { EventFeedItem } from "../queries/events.queries";

export const VIBES_PUBLIC_ORIGIN = "https://vibes.gurudevelopers.dev";

export const buildPublicContentUrl = (
  content: Pick<EventFeedItem, "id" | "type">,
) =>
  content.id
    ? `${VIBES_PUBLIC_ORIGIN}/${content.type}/${encodeURIComponent(content.id)}`
    : null;

// The link goes ONLY inside `message`. Passing it also as `url` made iOS show it
// twice (the share sheet appends `url` to the text in WhatsApp, Messages, etc.);
// Android ignores `url`, so its visible text stays exactly the same.
export const buildShareMessage = (title: string | null | undefined, url: string | null) =>
  [title, url].filter(Boolean).join("\n");

const shareContent = (content: EventFeedItem) =>
  Share.share({ message: buildShareMessage(content.title, buildPublicContentUrl(content)) });

export const shareChallengeInvite = async (challenge: EventFeedItem) => shareContent(challenge);

export const shareChallengeProgress = async (
  challenge: EventFeedItem,
  input: { currentDay: number; totalDays: number; streak: number },
) => {
  void input;
  return shareContent(challenge);
};

export const shareEventInvite = async (event: EventFeedItem) => shareContent(event);
