import { useEffect, useState } from "react";
import { AccessibilityInfo, AppState } from "react-native";
export function useVibiRuntime() {
  const [active, setActive] = useState(AppState.currentState === "active");
  // Freeze until the asynchronous preference resolves; don't briefly animate
  // for someone who requested reduced motion.
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReducedMotion(value);
      })
      .catch(() => {});
    const motion = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReducedMotion
    );
    const app = AppState.addEventListener("change", (value) =>
      setActive(value === "active")
    );
    return () => {
      mounted = false;
      motion.remove();
      app.remove();
    };
  }, []);
  return { active, reducedMotion };
}
