import { useSyncExternalStore } from "react";
import { clasesFlagStore } from "./store";

export function useClasesEnabled() {
  return useSyncExternalStore(
    clasesFlagStore.subscribe,
    clasesFlagStore.getSnapshot,
    () => false
  );
}
