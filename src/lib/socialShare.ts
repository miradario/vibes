import { Platform, Share } from "react-native";
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

// Shared from the "challenge completed" modal: a celebratory line plus the
// public link of the challenge (or the Vibes landing when it has no id).
export const shareChallengeCompletion = async (
  challenge: Pick<EventFeedItem, "id" | "type">,
  message: string,
  imageUri: string,
) => {
  if (Platform.OS === "ios") {
    return Share.share({
      message: buildShareMessage(message, buildPublicContentUrl(challenge) ?? VIBES_PUBLIC_ORIGIN),
      url: imageUri,
    });
  }
  const Sharing = await import("expo-sharing");
  if (!(await Sharing.isAvailableAsync())) throw new Error("Image sharing unavailable");
  return Sharing.shareAsync(imageUri, { mimeType: "image/png", UTI: "public.png", dialogTitle: message });
};

export const shareEventInvite = async (event: EventFeedItem) => shareContent(event);

/** Classes use their existing official URL until a public Vibes class page is available. */
export const shareClassInvite = async (title: string, officialUrl: string | null) =>
  Share.share({ message: buildShareMessage(title, officialUrl) });
