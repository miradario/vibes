import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { trackSignupEvent } from "./signupEvents";

// Sends one `app_backgrounded` per active -> background transition while a
// signup/onboarding screen is focused, with the step the user was on.
// Ignores "inactive" (iOS app switcher, system sheets like Google/Apple login).
export const useSignupBackgroundTracking = (step: string, stepIndex?: number, enabled = true) => {
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused || !enabled) return;
    let previous: AppStateStatus = AppState.currentState;
    let sent = false;
    const subscription = AppState.addEventListener("change", next => {
      if (next === "active") sent = false;
      else if (next === "background" && !sent && previous !== "background") {
        sent = true;
        trackSignupEvent("app_backgrounded", { step, stepIndex });
      }
      previous = next;
    });
    return () => subscription.remove();
  }, [focused, enabled, step, stepIndex]);
};
