import { useSyncExternalStore } from "react";
import { clasesFlagStore } from "./store";

export function useClasesEnabled() {
  const enabled = useSyncExternalStore(
    clasesFlagStore.subscribe,
    clasesFlagStore.getSnapshot,
    () => false
  );
  return (__DEV__ && process.env.EXPO_PUBLIC_LOCAL_CLASSES === "true") || enabled;
}
