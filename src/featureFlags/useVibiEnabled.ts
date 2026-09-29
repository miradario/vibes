import { useSyncExternalStore } from "react";
import { vibiFlagStore } from "./store";

export function useVibiEnabled() {
  return useSyncExternalStore(
    vibiFlagStore.subscribe,
    vibiFlagStore.getSnapshot,
    () => false
  );
}
