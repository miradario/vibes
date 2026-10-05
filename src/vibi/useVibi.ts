import { useSyncExternalStore } from "react";
import { vibiController } from "./controller";
export const useVibi = () =>
  useSyncExternalStore(
    vibiController.subscribe,
    vibiController.getSnapshot,
    vibiController.getSnapshot
  );
