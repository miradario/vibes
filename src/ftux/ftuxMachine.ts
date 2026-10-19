/**
 * Vibi-guided first-time experience (FTUX): pure state machine.
 *
 * No imports on purpose: `scripts/ftux.test.cjs` loads this file directly.
 * Persistence lives in `ftuxStore.ts`; UI in `components/ftux/`.
 * Flow and copy come from the FTUX research (docs/ftux.md).
 */

export const FTUX_VERSION = 1;
/** Accounts older than this never get the tour (existing users). */
export const NEW_USER_WINDOW_DAYS = 7;
/** Home must stay focused this long before the welcome opens. */
export const WELCOME_SETTLE_MS = 1500;
/** Give up waiting for the deferred deep link check after this long. */
export const DEFERRED_LINK_WAIT_MS = 10000;
/** An external entry that never left Home stops blocking after this long. */
export const EXTERNAL_ENTRY_GRACE_MS = 20000;

export type FtuxStatus = "pending" | "active" | "paused" | "done" | "ineligible";
export type FtuxTourStep = "discover" | "challenges" | "events" | "profile";
export type FtuxCoachStep = Exclude<FtuxTourStep, "profile">;
export type FtuxStep = "welcome" | "alt" | FtuxTourStep | "closing";
export type FtuxAction =
  | "viewedProfile"
  | "joinedChallenge"
  | "openedEvent"
  | "profileCompleted";

export type FtuxState = {
  version: number;
  userId: string;
  status: FtuxStatus;
  step: FtuxStep;
  /** Local day (YYYY-MM-DD) the welcome was first shown; replaces that day's mood check-in. */
  welcomeDay?: string;
  /** "tour" | "other" | "later": which welcome exit the person chose. */
  entry?: "tour" | "other" | "later";
  /** Set by the dev reset so old test accounts can see the tour. */
  forced?: boolean;
  seen: Partial<Record<FtuxStep, string>>;
  actions: Partial<Record<FtuxAction, string>>;
  checklistHidden?: boolean;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type FtuxEvent =
  | { type: "WELCOME_SHOWN"; day: string }
  | { type: "START_TOUR" }
  | { type: "CHOOSE_OTHER" }
  | { type: "PICK"; step: "challenges" | "events" }
  | { type: "LATER" }
  | { type: "NEXT"; profileComplete: boolean }
  | { type: "EXPLORE" }
  | { type: "PAUSE" }
  | { type: "PROFILE_START" }
  | { type: "PROFILE_LATER" }
  | { type: "FINISH" }
  | { type: "RESUME"; step: FtuxTourStep }
  | { type: "ACTION"; action: FtuxAction }
  | { type: "HIDE_CHECKLIST" };

export const TOUR_ORDER: FtuxTourStep[] = [
  "discover",
  "challenges",
  "events",
  "profile",
];

/** Checklist items, in tour order, with the real action that ticks each one. */
export const CHECKLIST_ITEMS: { step: FtuxTourStep; action: FtuxAction }[] = [
  { step: "discover", action: "viewedProfile" },
  { step: "challenges", action: "joinedChallenge" },
  { step: "events", action: "openedEvent" },
  { step: "profile", action: "profileCompleted" },
];

/** Tab route each step lives on (React Navigation names in App.tsx). */
export const STEP_ROUTE: Record<FtuxStep, string> = {
  welcome: "Home",
  alt: "Home",
  discover: "Discover",
  challenges: "Flow",
  events: "EventsTab",
  profile: "Aura",
  closing: "Home",
};

/** Local storage keys that prove this user already used the app on this device. */
export const priorUsageKeys = (userId: string) => [
  `discover_filters_guide:${userId}`,
  `discover_answer_filters:${userId}`,
  `complete_profile_prompt_dismissed_until:${userId}`,
];

export const isCoachStep = (step: FtuxStep): step is FtuxCoachStep =>
  step === "discover" || step === "challenges" || step === "events";

/** "Paso N de 4" number, or null for welcome/alt/closing. */
export const stepNumber = (step: FtuxStep): number | null => {
  const index = TOUR_ORDER.indexOf(step as FtuxTourStep);
  return index < 0 ? null : index + 1;
};

/**
 * New user = account created within the window AND no local trace of earlier
 * use. Invalid or missing dates are treated as existing users (safe default).
 */
export const isNewUser = ({
  createdAt,
  now,
  hasPriorUsage,
  windowDays = NEW_USER_WINDOW_DAYS,
}: {
  createdAt?: string | null;
  now: Date;
  hasPriorUsage: boolean;
  windowDays?: number;
}) => {
  if (hasPriorUsage || !createdAt) return false;
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return false;
  const age = now.getTime() - created;
  return age >= -60_000 && age <= windowDays * 24 * 60 * 60 * 1000;
};

export const createInitialState = (
  userId: string,
  eligible: boolean,
  now: Date,
  options: { forced?: boolean } = {}
): FtuxState => ({
  version: FTUX_VERSION,
  userId,
  status: eligible ? "pending" : "ineligible",
  step: "welcome",
  ...(options.forced ? { forced: true } : {}),
  seen: {},
  actions: {},
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
});

const STATUSES: FtuxStatus[] = ["pending", "active", "paused", "done", "ineligible"];
const STEPS: FtuxStep[] = ["welcome", "alt", ...TOUR_ORDER, "closing"];

/** Parses persisted JSON; returns null for anything unusable or another user/version. */
export const parseState = (raw: string | null, userId: string): FtuxState | null => {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    if (value.version !== FTUX_VERSION || value.userId !== userId) return null;
    if (!STATUSES.includes(value.status) || !STEPS.includes(value.step)) return null;
    return {
      ...value,
      seen: value.seen && typeof value.seen === "object" ? value.seen : {},
      actions: value.actions && typeof value.actions === "object" ? value.actions : {},
    } as FtuxState;
  } catch {
    return null;
  }
};

/**
 * On a new app start never relaunch a tour that was left half way: keep the
 * progress paused (it is not resumed from Home anymore).
 */
export const normalizeOnLoad = (state: FtuxState, now: Date): FtuxState => {
  if (state.status !== "active") return state;
  if (state.step === "closing") {
    return { ...state, status: "done", finishedAt: state.finishedAt ?? now.toISOString(), updatedAt: now.toISOString() };
  }
  return { ...state, status: "paused", updatedAt: now.toISOString() };
};

const nextAfter = (step: FtuxStep, profileComplete: boolean): FtuxStep => {
  const index = TOUR_ORDER.indexOf(step as FtuxTourStep);
  if (index < 0) return "closing";
  const next = TOUR_ORDER[index + 1];
  if (!next) return "closing";
  if (next === "profile" && profileComplete) return "closing";
  return next;
};

const goTo = (state: FtuxState, step: FtuxStep, iso: string): FtuxState => {
  // The closing message is shown once; later resumes end silently.
  if (step === "closing" && state.finishedAt) {
    return { ...state, status: "done", step, updatedAt: iso };
  }
  return {
    ...state,
    status: "active",
    step,
    seen: state.seen[step] ? state.seen : { ...state.seen, [step]: iso },
    updatedAt: iso,
  };
};

export const reduce = (state: FtuxState, event: FtuxEvent, now: Date): FtuxState => {
  const iso = now.toISOString();
  if (state.status === "ineligible") return state;
  switch (event.type) {
    case "WELCOME_SHOWN":
      if (state.status !== "pending" || state.welcomeDay) return state;
      return {
        ...state,
        welcomeDay: event.day,
        seen: { ...state.seen, welcome: iso },
        updatedAt: iso,
      };
    case "START_TOUR":
      if (state.status !== "pending") return state;
      return { ...goTo(state, "discover", iso), entry: "tour", startedAt: iso };
    case "CHOOSE_OTHER":
      if (state.status !== "pending") return state;
      return { ...goTo(state, "alt", iso), entry: "other", startedAt: iso };
    case "PICK":
      if (state.status !== "active" || state.step !== "alt") return state;
      return goTo(state, event.step, iso);
    case "LATER":
      if (state.status !== "pending" && !(state.status === "active" && state.step === "alt")) return state;
      return {
        ...state,
        status: "paused",
        entry: state.entry ?? "later",
        startedAt: state.startedAt ?? iso,
        updatedAt: iso,
      };
    case "NEXT":
      if (state.status !== "active" || !isCoachStep(state.step)) return state;
      return goTo(state, nextAfter(state.step, event.profileComplete), iso);
    case "EXPLORE":
    case "PAUSE":
      if (state.status !== "active") return state;
      if (state.step === "closing") return reduce(state, { type: "FINISH" }, now);
      return { ...state, status: "paused", updatedAt: iso };
    case "PROFILE_START":
    case "PROFILE_LATER":
      if (state.status !== "active" || state.step !== "profile") return state;
      return goTo(state, "closing", iso);
    case "FINISH":
      if (state.status !== "active" || state.step !== "closing") return state;
      return { ...state, status: "done", finishedAt: state.finishedAt ?? iso, updatedAt: iso };
    case "RESUME":
      if (state.status !== "paused" && state.status !== "done") return state;
      return { ...goTo(state, event.step, iso), startedAt: state.startedAt ?? iso };
    case "ACTION":
      if (state.actions[event.action]) return state;
      return { ...state, actions: { ...state.actions, [event.action]: iso }, updatedAt: iso };
    case "HIDE_CHECKLIST":
      if (state.checklistHidden) return state;
      return { ...state, checklistHidden: true, updatedAt: iso };
    default:
      return state;
  }
};

/** The welcome replaces the mood check-in while it is pending and on the day it appeared. */
export const suppressesDailyMood = (
  state: FtuxState | null | undefined,
  today: string,
  loading: boolean
) => {
  if (loading) return true;
  if (!state || state.status === "ineligible") return false;
  if (state.status === "pending" || state.status === "active") return true;
  return state.welcomeDay === today;
};

export const checklistProgress = (state: FtuxState, profileComplete: boolean) => {
  const done = CHECKLIST_ITEMS.map(({ action }) =>
    Boolean(state.actions[action]) || (action === "profileCompleted" && profileComplete)
  );
  return { done, count: done.filter(Boolean).length, total: CHECKLIST_ITEMS.length };
};

/** "Tus primeros pasos" lives on Home once the welcome was answered, until hidden or complete. */
export const isChecklistVisible = (state: FtuxState | null | undefined, profileComplete: boolean) => {
  if (!state || state.checklistHidden) return false;
  if (state.status !== "paused" && state.status !== "done") return false;
  const { count, total } = checklistProgress(state, profileComplete);
  return count < total;
};

/**
 * True while the welcome or the tour is on screen (CompleteProfilePrompt steps
 * aside). Home has no checklist card anymore, so a paused or finished tour
 * gives Home back.
 */
export const ownsHomePrompts = (state: FtuxState | null | undefined) =>
  Boolean(state && (state.status === "pending" || state.status === "active"));

export type WelcomeGateInput = {
  now: number;
  bootAt: number;
  onHome: boolean;
  homeFocusSince: number | null;
  lastAwayAt: number | null;
  externalEntryAt: number | null;
  pendingExternal: boolean;
  deferredLinkSettled: boolean;
};

/**
 * Never interrupt a push notification or deep link: wait until that
 * navigation is done and the person comes back to a calm Home.
 */
export const canShowWelcome = (input: WelcomeGateInput) => {
  const { now, onHome, homeFocusSince } = input;
  if (!onHome || homeFocusSince === null) return false;
  if (input.pendingExternal) return false;
  if (!input.deferredLinkSettled && now - input.bootAt < DEFERRED_LINK_WAIT_MS) return false;
  if (now - homeFocusSince < WELCOME_SETTLE_MS) return false;
  if (input.externalEntryAt !== null) {
    const leftAndCameBack =
      input.lastAwayAt !== null &&
      input.lastAwayAt >= input.externalEntryAt &&
      homeFocusSince >= input.lastAwayAt;
    if (!leftAndCameBack && now - input.externalEntryAt < EXTERNAL_ENTRY_GRACE_MS) return false;
  }
  return true;
};
