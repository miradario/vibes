import type { QueryClient } from "@tanstack/react-query";
import type { AuthSession } from "./auth.types";

/** A new identity must never inherit another account's cached chat or feed data. */
export function updateSessionCache(client: QueryClient, session: AuthSession) {
  const key = ["auth", "session"];
  const previous = client.getQueryData<AuthSession>(key);
  if (previous?.user.id && previous.user.id !== session?.user.id) {
    const privateQueries = { predicate: (query: { queryKey: readonly unknown[] }) => query.queryKey[0] !== "auth" };
    // Cancel synchronously before removal so late query responses cannot restore old data.
    void client.cancelQueries(privateQueries);
    client.removeQueries(privateQueries);
    client.getMutationCache().clear();
  }
  client.setQueryData(key, session ?? null);
}
