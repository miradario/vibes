import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuthSession } from "../auth/auth.queries";
import {
  dismissConnectionStrip,
  emptyConnectionStripState,
  filterNewConnections,
  filterRequestsAfterDismiss,
  parseConnectionStripState,
  recordConnectionViews,
  type ConnectionStripState,
} from "../lib/connectionStripVisibility";

const storageKey = (userId: string) => `connectionStrip:v1:${userId}`;
// Shared across Home and Mensajes so both strips agree.
const cache = new Map<string, ConnectionStripState>();
const listeners = new Set<() => void>();
// A "session" = one app open: cold start, or coming back to the foreground from background.
// Each connection adds at most one view per session, however many screens show it.
let countedThisSession = new Set<string>();
let sessionId = 0;
let lastAppState = AppState.currentState;
AppState.addEventListener("change", (next) => {
  if (lastAppState === "background" && next === "active") {
    countedThisSession = new Set();
    sessionId += 1;
    listeners.forEach((listener) => listener());
  }
  lastAppState = next;
});

const save = (userId: string, state: ConnectionStripState) => {
  cache.set(userId, state);
  listeners.forEach((listener) => listener());
  void AsyncStorage.setItem(storageKey(userId), JSON.stringify(state)).catch((error) =>
    console.warn("[connectionStrip] failed to persist", error)
  );
};

export function useConnectionStripVisibility<C extends { id: string; createdAt?: string }, R extends { createdAt?: string }>(
  connections: C[],
  requests: R[]
) {
  const { data: session } = useAuthSession();
  const userId = session?.user.id;
  const [state, setState] = useState<ConnectionStripState | null>(() => (userId ? cache.get(userId) ?? null : null));
  const [focused, setFocused] = useState(false);
  const [, bump] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const sync = () => {
      setState(cache.get(userId) ?? null);
      bump((n) => n + 1);
    };
    listeners.add(sync);
    if (cache.has(userId)) sync();
    else
      void AsyncStorage.getItem(storageKey(userId))
        .catch(() => null)
        .then((raw) => {
          if (!cache.has(userId)) cache.set(userId, parseConnectionStripState(raw));
          listeners.forEach((listener) => listener());
        });
    return () => {
      listeners.delete(sync);
    };
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  const visibleConnections = state ? filterNewConnections(connections, state, countedThisSession) : [];
  const visibleRequests = state ? filterRequestsAfterDismiss(requests, state) : [];
  const visibleIds = visibleConnections.map((item) => item.id).join(",");

  useEffect(() => {
    if (!userId || !state || !focused || !visibleIds) return;
    const fresh = visibleIds.split(",").filter((id) => !countedThisSession.has(id));
    if (!fresh.length) return;
    fresh.forEach((id) => countedThisSession.add(id));
    save(userId, recordConnectionViews(cache.get(userId) ?? state, fresh));
  }, [userId, state, focused, visibleIds, sessionId]);

  const dismiss = useCallback(() => {
    if (!userId) return;
    save(userId, dismissConnectionStrip(cache.get(userId) ?? emptyConnectionStripState(), Date.now()));
  }, [userId]);

  return { ready: !!state, connections: visibleConnections, requests: visibleRequests, dismiss };
}
