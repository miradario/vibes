export type DiscoveryRefreshState = { phase: "loading" | "ready" | "error"; attempt: number; error?: unknown };

/** Only the latest entry/retry may publish a result. Cached data stays hidden meanwhile. */
export function createDiscoveryRefresh(load: () => Promise<unknown>, report: (state: DiscoveryRefreshState) => void, timeoutMs = 25000) {
  let generation = 0;
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    generation++;
    clearTimeout(timer);
  };
  const refresh = async () => {
    cancel();
    const request = generation;
    const currentAttempt = ++attempt;
    report({ phase: "loading", attempt: currentAttempt });
    let requestTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        load(),
        new Promise((_, reject) => {
          requestTimer = setTimeout(() => reject(new Error("La carga está demorando. Intentá nuevamente.")), timeoutMs);
          timer = requestTimer;
        }),
      ]);
      if (request === generation) report({ phase: "ready", attempt: currentAttempt });
    } catch (error) {
      if (request === generation) report({ phase: "error", attempt: currentAttempt, error });
    } finally {
      clearTimeout(requestTimer);
    }
  };
  return { refresh, cancel };
}
