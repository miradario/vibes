import { useSyncExternalStore } from "react";
import { sesionesFlagStore } from "./store";

// Remote Config `sesiones` (false by default). In development only, EXPO_PUBLIC_LOCAL_SESSIONS
// (or EXPO_PUBLIC_FORCE_SESIONES) forces it on; release builds ignore both.
export function useSesionesEnabled() {
  const enabled = useSyncExternalStore(
    sesionesFlagStore.subscribe,
    sesionesFlagStore.getSnapshot,
    () => false
  );
  return (
    (__DEV__ &&
      (process.env.EXPO_PUBLIC_LOCAL_SESSIONS === "true" ||
        process.env.EXPO_PUBLIC_FORCE_SESIONES === "true")) ||
    enabled
  );
}
