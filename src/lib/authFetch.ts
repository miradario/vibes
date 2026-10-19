/** Cancel stalled auth transport, rather than leaving the SDK session lock waiting forever. */
export function createAuthFetch(transport: typeof fetch, timeoutMs = 8000): typeof fetch {
  return async (input, init) => {
    const url = typeof input === "string" ? input : "url" in input ? input.url : input.toString();
    if (!new URL(url).pathname.startsWith("/auth/v1/")) return transport(input, init);

    const controller = new AbortController();
    const signal = init?.signal ?? (typeof input === "object" && "signal" in input ? input.signal : undefined);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancel = () => {};
    const cancelled = new Promise<Response>((_, reject) => {
      cancel = () => {
        controller.abort();
        const error = new Error("Authentication request aborted or timed out");
        error.name = "AbortError";
        reject(error);
      };
      signal?.addEventListener("abort", cancel, { once: true });
      timer = setTimeout(cancel, timeoutMs);
    });
    try {
      if (signal?.aborted) cancel();
      return await Promise.race([
        cancelled,
        signal?.aborted ? cancelled : transport(input, { ...init, signal: controller.signal }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
    }
  };
}
