import { useEffect, useState } from "react";
import { AccessibilityInfo, AppState } from "react-native";
import { useIsFocused } from "@react-navigation/native";

export function useCalmMotion() {
  const focused = useIsFocused();
  const [active, setActive] = useState(AppState.currentState === "active");
  // Start static until the OS preference has been read.
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduceMotion(value);
      })
      .catch(() => {});
    const preference = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion
    );
    const appState = AppState.addEventListener("change", (state) =>
      setActive(state === "active")
    );
    return () => {
      mounted = false;
      preference.remove();
      appState.remove();
    };
  }, []);
  return { visible: focused && active, reduceMotion };
}
