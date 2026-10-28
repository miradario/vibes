import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  const countedThisFocus = useRef(new Set<string>());

  useEffect(() => {
    if (!userId) return;
    const sync = () => setState(cache.get(userId) ?? null);
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
      countedThisFocus.current = new Set();
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  const visibleConnections = state ? filterNewConnections(connections, state, countedThisFocus.current) : [];
  const visibleRequests = state ? filterRequestsAfterDismiss(requests, state) : [];
  const visibleIds = visibleConnections.map((item) => item.id).join(",");

  useEffect(() => {
    if (!userId || !state || !focused || !visibleIds) return;
    const fresh = visibleIds.split(",").filter((id) => !countedThisFocus.current.has(id));
    if (!fresh.length) return;
    fresh.forEach((id) => countedThisFocus.current.add(id));
    save(userId, recordConnectionViews(cache.get(userId) ?? state, fresh));
  }, [userId, state, focused, visibleIds]);

  const dismiss = useCallback(() => {
    if (!userId) return;
    save(userId, dismissConnectionStrip(cache.get(userId) ?? emptyConnectionStripState(), Date.now()));
  }, [userId]);

  return { ready: !!state, connections: visibleConnections, requests: visibleRequests, dismiss };
}
