import { useSyncExternalStore } from "react";
import { clasesFlagStore } from "./store";

// Remote Config `clases` (false by default). In development only, EXPO_PUBLIC_FORCE_CLASES
// (or the older EXPO_PUBLIC_LOCAL_CLASSES) forces it on; release builds ignore both.
export function useClasesEnabled() {
  const enabled = useSyncExternalStore(
    clasesFlagStore.subscribe,
    clasesFlagStore.getSnapshot,
    () => false
  );
  return (
    (__DEV__ &&
      (process.env.EXPO_PUBLIC_FORCE_CLASES === "true" ||
        process.env.EXPO_PUBLIC_LOCAL_CLASSES === "true")) ||
    enabled
  );
}
