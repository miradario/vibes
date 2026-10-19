import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";
import {
  createInitialState,
  isNewUser,
  normalizeOnLoad,
  parseState,
  priorUsageKeys,
  reduce,
  type FtuxAction,
  type FtuxEvent,
  type FtuxState,
} from "./ftuxMachine";

/**
 * FTUX state per user, persisted in AsyncStorage under `ftux:v1:<userId>`.
 * Local only (no Supabase): a reinstall or a second device re-evaluates
 * eligibility, and the account-age window keeps existing users out.
 */
export const ftuxStorageKey = (userId: string) => `ftux:v1:${userId}`;

const states = new Map<string, FtuxState>();
const loading = new Map<string, Promise<FtuxState>>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const persist = (state: FtuxState) => {
  void AsyncStorage.setItem(ftuxStorageKey(state.userId), JSON.stringify(state)).catch(
    (error) => console.warn("[ftux] failed to persist state", error)
  );
};

const set = (state: FtuxState, save = true) => {
  states.set(state.userId, state);
  if (save) persist(state);
  emit();
};

/** Stored state, with a half-finished tour turned into "paused" (`changed` = needs saving). */
const readStored = async (userId: string) => {
  const parsed = parseState(await AsyncStorage.getItem(ftuxStorageKey(userId)), userId);
  if (!parsed) return null;
  const state = normalizeOnLoad(parsed, new Date());
  return { state, changed: state !== parsed };
};

/** Loads (or decides once and stores) the FTUX state of a user. Never throws. */
export const ensureFtuxLoaded = (userId: string, accountCreatedAt?: string | null) => {
  const cached = states.get(userId);
  if (cached) return Promise.resolve(cached);
  const inFlight = loading.get(userId);
  if (inFlight) return inFlight;
  const promise = (async () => {
    try {
      const stored = await readStored(userId);
      if (stored) {
        set(stored.state, stored.changed);
        return stored.state;
      }
      const markers = await AsyncStorage.multiGet(priorUsageKeys(userId));
      const now = new Date();
      const eligible = isNewUser({
        createdAt: accountCreatedAt,
        now,
        hasPriorUsage: markers.some(([, value]) => value !== null),
      });
      const initial = createInitialState(userId, eligible, now);
      set(initial);
      return initial;
    } catch (error) {
      console.warn("[ftux] failed to load state; skipping the tour", error);
      const fallback = createInitialState(userId, false, new Date());
      set(fallback, false);
      return fallback;
    } finally {
      loading.delete(userId);
    }
  })();
  loading.set(userId, promise);
  return promise;
};

export const getFtuxState = (userId?: string | null) =>
  userId ? states.get(userId) : undefined;

/** Current state (undefined while loading or without a session). */
export const useFtuxState = (userId?: string | null, accountCreatedAt?: string | null) => {
  const state = useSyncExternalStore(
    subscribe,
    () => getFtuxState(userId),
    () => undefined
  );
  useEffect(() => {
    if (userId) void ensureFtuxLoaded(userId, accountCreatedAt);
  }, [userId, accountCreatedAt]);
  return state;
};

export const dispatchFtux = (userId: string | null | undefined, event: FtuxEvent) => {
  const current = getFtuxState(userId);
  if (!current) return;
  const next = reduce(current, event, new Date());
  if (next !== current) set(next);
};

/**
 * Ticks a checklist item after the real action. Cheap no-op for users without
 * a tour (existing users) and safe to call from anywhere.
 */
export const markFtuxAction = async (userId: string | null | undefined, action: FtuxAction) => {
  if (!userId) return;
  try {
    if (!getFtuxState(userId)) {
      // Only users that already have a tour state; never decide eligibility here.
      const stored = await readStored(userId);
      if (!stored) return;
      if (!getFtuxState(userId)) set(stored.state, stored.changed);
    }
    const current = getFtuxState(userId);
    if (!current || current.status === "ineligible" || current.actions[action]) return;
    dispatchFtux(userId, { type: "ACTION", action });
  } catch {
    // Never let the checklist affect the real action.
  }
};

/**
 * Dev helper: forgets this user's FTUX and makes the next Home show the
 * welcome again, even for old accounts. Wired to Configuración in __DEV__.
 */
export const resetFtuxForDev = async (userId: string) => {
  const fresh = createInitialState(userId, true, new Date(), { forced: true });
  await AsyncStorage.setItem(ftuxStorageKey(userId), JSON.stringify(fresh));
  set(fresh, false);
};

// Tab the coach card is pointing at, so the tab bar can draw the spotlight ring.
let highlightedTab: string | null = null;
const highlightListeners = new Set<() => void>();
export const setFtuxHighlightedTab = (routeName: string | null) => {
  if (highlightedTab === routeName) return;
  highlightedTab = routeName;
  highlightListeners.forEach((listener) => listener());
};
export const useFtuxHighlightedTab = () =>
  useSyncExternalStore(
    (listener) => {
      highlightListeners.add(listener);
      return () => {
        highlightListeners.delete(listener);
      };
    },
    () => highlightedTab,
    () => null
  );
