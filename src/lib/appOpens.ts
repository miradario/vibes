import { AppState, Platform, type AppStateStatus } from "react-native";
import * as Application from "expo-application";
import { isSupabaseConfigured, supabase } from "./supabase";

// Records an "app open" in public.app_opens (used for retention metrics in the
// backoffice) on cold start and when the app returns to the foreground.
// Only with a session, throttled in memory, and never throws.
const THROTTLE_MS = 30 * 60 * 1000;
let lastRecordedAt = 0;
let inFlight = false;

const recordAppOpen = async () => {
  if (!isSupabaseConfigured || inFlight || Date.now() - lastRecordedAt < THROTTLE_MS) return;
  inFlight = true;
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return;
    const { error } = await supabase.from("app_opens").insert({
      user_id: userId,
      platform: Platform.OS,
      app_version: Application.nativeApplicationVersion ?? null,
    });
    if (!error) lastRecordedAt = Date.now();
  } catch {
    // Silent: analytics must never affect the app.
  } finally {
    inFlight = false;
  }
};

export const startAppOpenTracking = () => {
  void recordAppOpen();
  let previous: AppStateStatus = AppState.currentState;
  const subscription = AppState.addEventListener("change", next => {
    if (next === "active" && previous !== "active") void recordAppOpen();
    previous = next;
  });
  return () => subscription.remove();
};
