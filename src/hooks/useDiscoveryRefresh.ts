import { useLayoutEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { createDiscoveryRefresh, type DiscoveryRefreshState } from "../lib/discoveryRefresh";

type Refetch = (options?: { cancelRefetch?: boolean; throwOnError?: boolean }) => Promise<{ isError: boolean; error: unknown }>;
export function useDiscoveryRefresh(context: string, focused: boolean, enabled: boolean, refetch: Refetch) {
  const [state, setState] = useState<DiscoveryRefreshState & { context: string }>({ context: "", phase: "loading", attempt: 0 });
  const controller = useMemo(() => createDiscoveryRefresh(async () => {
    const result = await refetch({ cancelRefetch: true, throwOnError: true });
    if (result.isError) throw result.error;
  }, next => setState({ ...next, context })), [context, refetch]);
  useLayoutEffect(() => {
    if (!focused || !enabled) {
      controller.cancel();
      setState({ context: "", phase: "loading", attempt: 0 });
      return;
    }
    void controller.refresh();
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener("change", value => {
      if (value === "active" && previous !== "active") void controller.refresh();
      previous = value;
    });
    return () => { controller.cancel(); subscription.remove(); };
  }, [controller, focused, enabled]);
  return {
    ...state,
    phase: !focused || !enabled || state.context !== context ? "loading" as const : state.phase,
    retry: () => { if (enabled && focused) void controller.refresh(); },
  };
}
