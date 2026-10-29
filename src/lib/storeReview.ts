import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, type AppStateStatus } from "react-native";
import * as StoreReview from "expo-store-review";

// Native in-store rating prompt (App Store / Google Play In-App Review).
// Shown only after a positive moment, to users who already came back to the
// app on a few different days, with a long cooldown and a lifetime cap.
// Everything here fails silently: it must never affect the UX.

/** Distinct local days with an app open before we may ask. */
export const MIN_DAYS_OF_USE = 3;
/** Minimum time between two prompts. */
export const PROMPT_COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000; // 60 days
/** Max prompts ever per install (Apple caps at 3 per 365 days anyway). */
export const MAX_LIFETIME_PROMPTS = 3;
/** Delay after the positive moment so it doesn't collide with animations. */
export const PROMPT_DELAY_MS = 3500;

const STORAGE_KEY = "vibes.storeReview.v1";
const MAX_TRACKED_DAYS = MIN_DAYS_OF_USE + 2;

type StoreReviewState = {
  usageDays: string[];
  promptCount: number;
  lastPromptAt: number | null;
};

const emptyState = (): StoreReviewState => ({ usageDays: [], promptCount: 0, lastPromptAt: null });

const readState = async (): Promise<StoreReviewState> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<StoreReviewState>;
    return {
      usageDays: Array.isArray(parsed.usageDays) ? parsed.usageDays.filter(d => typeof d === "string") : [],
      promptCount: typeof parsed.promptCount === "number" ? parsed.promptCount : 0,
      lastPromptAt: typeof parsed.lastPromptAt === "number" ? parsed.lastPromptAt : null,
    };
  } catch {
    return emptyState();
  }
};

const writeState = async (state: StoreReviewState) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Silent.
  }
};

const localDayKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const recordUsageDay = async () => {
  const state = await readState();
  const today = localDayKey();
  if (state.usageDays.includes(today)) return;
  state.usageDays = [...state.usageDays, today].slice(-MAX_TRACKED_DAYS);
  await writeState(state);
};

/** Tracks distinct days of use (cold start + returning to foreground). */
export const startStoreReviewUsageTracking = () => {
  void recordUsageDay();
  let previous: AppStateStatus = AppState.currentState;
  const subscription = AppState.addEventListener("change", next => {
    if (next === "active" && previous !== "active") void recordUsageDay();
    previous = next;
  });
  return () => subscription.remove();
};

export const isEligibleForReviewPrompt = (state: StoreReviewState, now = Date.now()) =>
  state.usageDays.length >= MIN_DAYS_OF_USE &&
  state.promptCount < MAX_LIFETIME_PROMPTS &&
  (state.lastPromptAt === null || now - state.lastPromptAt >= PROMPT_COOLDOWN_MS);

let pending = false;

/** Call right after a positive moment. Never throws, never blocks. */
export const maybeRequestStoreReview = async (): Promise<void> => {
  if (pending) return;
  pending = true;
  try {
    const state = await readState();
    if (!isEligibleForReviewPrompt(state)) return;
    if (!(await StoreReview.isAvailableAsync())) return;
    if (!(await StoreReview.hasAction())) return;
    await new Promise(resolve => setTimeout(resolve, PROMPT_DELAY_MS));
    if (AppState.currentState !== "active") return;
    await writeState({ ...state, promptCount: state.promptCount + 1, lastPromptAt: Date.now() });
    await StoreReview.requestReview();
  } catch {
    // Silent: the rating prompt must never affect the app.
  } finally {
    pending = false;
  }
};
