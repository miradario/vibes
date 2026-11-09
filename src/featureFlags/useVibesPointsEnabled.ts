import { useSyncExternalStore } from "react";
import { vibesPointsFlagStore } from "./store";

export function useVibesPointsEnabled() {
  return useSyncExternalStore(
    vibesPointsFlagStore.subscribe,
    vibesPointsFlagStore.getSnapshot,
    () => false
  );
}
