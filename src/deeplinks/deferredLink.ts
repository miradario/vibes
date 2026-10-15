import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import * as Device from "expo-device";
import { Linking, Platform } from "react-native";
import { supabase } from "../lib/supabase";

// Set once on first launch, whatever the result, so the check never repeats.
const CHECKED_KEY = "deferred_link_checked";
const CLAIM_TIMEOUT_MS = 6000;

export type DeferredDestination =
  | { name: "ChallengeDetailScreen"; params: { challengeId: string } }
  | { name: "EventDetail"; params: { eventId: string } };

/** Maps a shared https URL to the same screens the linking config uses. */
export const deferredUrlToDestination = (url: string): DeferredDestination | null => {
  const match = url.match(
    /^(?:https:\/\/vibes\.gurudevelopers\.dev|com\.gurudevelopers\.vibes:\/)\/(challenge|event)\/([^/?#]+)/i
  );
  if (!match) return null;
  const id = decodeURIComponent(match[2]);
  return match[1].toLowerCase() === "challenge"
    ? { name: "ChallengeDetailScreen", params: { challengeId: id } }
    : { name: "EventDetail", params: { eventId: id } };
};

const readAndroidClickId = async (): Promise<string | null> => {
  try {
    const referrer = await Application.getInstallReferrerAsync();
    const params = new URLSearchParams(referrer ?? "");
    return params.get("click_id");
  } catch (error) {
    console.warn("[deferred-link] install referrer unavailable", error);
    return null;
  }
};

const deviceLocale = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale ?? null;
  } catch {
    return null;
  }
};

const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
  Promise.race<T | null>([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);

/**
 * Returns the deferred destination for a fresh install, or null.
 * Only runs once per install (AsyncStorage flag).
 */
export const checkDeferredLinkOnce = async (): Promise<DeferredDestination | null> => {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return null;
  try {
    if (await AsyncStorage.getItem(CHECKED_KEY)) return null;
    await AsyncStorage.setItem(CHECKED_KEY, new Date().toISOString());

    // Opened through a real link: normal deeplink handling wins.
    if (await Linking.getInitialURL()) return null;

    let body: Record<string, string | null>;
    if (Platform.OS === "android") {
      const clickId = await readAndroidClickId();
      if (!clickId) return null;
      body = { platform: "android", clickId, installId: Application.getAndroidId() };
    } else {
      body = {
        platform: "ios",
        locale: deviceLocale(),
        osVersion: Device.osVersion,
        deviceModel: Device.modelId ?? Device.modelName,
        installId: await Application.getIosIdForVendorAsync(),
      };
    }

    const result = await withTimeout(
      supabase.functions.invoke("claim-deferred-link", { body }),
      CLAIM_TIMEOUT_MS
    );
    const url = (result?.data as { url?: unknown } | null)?.url;
    return typeof url === "string" ? deferredUrlToDestination(url) : null;
  } catch (error) {
    console.warn("[deferred-link] check failed", error);
    return null;
  }
};
