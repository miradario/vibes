import { useSyncExternalStore } from "react";
import { sesionesFlagStore } from "./store";

// Remote Config `sesiones` (false by default). EXPO_PUBLIC_FORCE_SESIONES only works in __DEV__.
export function useSesionesEnabled() {
  const enabled = useSyncExternalStore(
    sesionesFlagStore.subscribe,
    sesionesFlagStore.getSnapshot,
    () => false
  );
  return (__DEV__ && process.env.EXPO_PUBLIC_FORCE_SESIONES === "true") || enabled;
}
