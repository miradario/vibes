// Vibi-guided onboarding (FTUX) state machine. Run with `npm run vibi:check`.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const m = {};
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync("src/ftux/ftuxMachine.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  { exports: m, Date, JSON, Number, Math, Array, Object }
);

const now = new Date("2026-10-19T12:00:00Z");
const days = (n) => new Date(now.getTime() - n * 86400000).toISOString();
const fresh = () => m.createInitialState("u1", true, now);
const run = (state, ...events) => events.reduce((s, e) => m.reduce(s, e, now), state);

test("only new accounts without local usage are eligible", () => {
  assert.equal(m.isNewUser({ createdAt: days(1), now, hasPriorUsage: false }), true);
  assert.equal(m.isNewUser({ createdAt: days(8), now, hasPriorUsage: false }), false);
  assert.equal(m.isNewUser({ createdAt: days(1), now, hasPriorUsage: true }), false);
  assert.equal(m.isNewUser({ createdAt: undefined, now, hasPriorUsage: false }), false);
  assert.equal(m.isNewUser({ createdAt: "nope", now, hasPriorUsage: false }), false);
  assert.equal(m.createInitialState("u1", false, now).status, "ineligible");
});

test("ineligible users never move", () => {
  const old = m.createInitialState("u1", false, now);
  assert.equal(run(old, { type: "START_TOUR" }, { type: "ACTION", action: "viewedProfile" }), old);
  assert.equal(m.suppressesDailyMood(old, "2026-10-19", false), false);
  assert.equal(m.ownsHomePrompts(old), false);
});

test("full tour: welcome → 4 steps → closing → done", () => {
  let s = run(fresh(), { type: "WELCOME_SHOWN", day: "2026-10-19" }, { type: "START_TOUR" });
  assert.equal(s.status, "active");
  assert.equal(s.step, "discover");
  assert.equal(m.stepNumber(s.step), 1);
  s = run(s, { type: "NEXT", profileComplete: false });
  assert.equal(s.step, "challenges");
  assert.equal(m.stepNumber(s.step), 2);
  s = run(s, { type: "NEXT", profileComplete: false });
  assert.equal(s.step, "events");
  s = run(s, { type: "NEXT", profileComplete: false });
  assert.equal(s.step, "profile");
  assert.equal(m.stepNumber(s.step), 4);
  s = run(s, { type: "PROFILE_LATER" });
  assert.equal(s.step, "closing");
  s = run(s, { type: "FINISH" });
  assert.equal(s.status, "done");
  assert.ok(s.finishedAt);
  assert.equal(m.isChecklistVisible(s, false), true);
});

test("complete profile skips step 4", () => {
  const s = run(fresh(), { type: "START_TOUR" }, { type: "NEXT", profileComplete: true },
    { type: "NEXT", profileComplete: true }, { type: "NEXT", profileComplete: true });
  assert.equal(s.step, "closing");
});

test("'otra cosa' branch picks challenges or events; 'Ahora no' pauses", () => {
  const alt = run(fresh(), { type: "CHOOSE_OTHER" });
  assert.equal(alt.step, "alt");
  assert.equal(alt.entry, "other");
  assert.equal(run(alt, { type: "PICK", step: "challenges" }).step, "challenges");
  assert.equal(run(alt, { type: "PICK", step: "events" }).step, "events");
  const later = run(alt, { type: "LATER" });
  assert.equal(later.status, "paused");
  assert.equal(m.isChecklistVisible(later, false), true);
});

test("'Ahora no, gracias' dismisses but stays resumable from the checklist", () => {
  assert.equal(m.ownsHomePrompts(fresh()), true, "pending welcome owns Home");
  const s = run(fresh(), { type: "WELCOME_SHOWN", day: "2026-10-19" }, { type: "LATER" });
  assert.equal(s.status, "paused");
  assert.equal(s.entry, "later");
  assert.equal(m.ownsHomePrompts(s), false, "paused tour gives Home back");
  assert.equal(m.isChecklistVisible(s, false), true);
  const resumed = run(s, { type: "RESUME", step: "events" });
  assert.equal(resumed.status, "active");
  assert.equal(resumed.step, "events");
});

test("exploring pauses; a resumed tour ends without repeating the closing", () => {
  let s = run(fresh(), { type: "START_TOUR" }, { type: "EXPLORE" });
  assert.equal(s.status, "paused");
  assert.equal(s.step, "discover");
  s = run(s, { type: "RESUME", step: "challenges" }, { type: "NEXT", profileComplete: true },
    { type: "NEXT", profileComplete: true }, { type: "FINISH" });
  assert.equal(s.status, "done");
  s = run(s, { type: "RESUME", step: "events" }, { type: "NEXT", profileComplete: true });
  assert.equal(s.status, "done", "second time goes straight to done");
});

test("a half-finished tour is not relaunched on the next app start", () => {
  const active = run(fresh(), { type: "START_TOUR" }, { type: "NEXT", profileComplete: false });
  const loaded = m.normalizeOnLoad(active, now);
  assert.equal(loaded.status, "paused");
  assert.equal(loaded.step, "challenges");
  const closing = run(fresh(), { type: "START_TOUR" }, { type: "NEXT", profileComplete: true },
    { type: "NEXT", profileComplete: true }, { type: "NEXT", profileComplete: true });
  assert.equal(m.normalizeOnLoad(closing, now).status, "done");
});

test("the welcome replaces the mood check-in only on its first day", () => {
  assert.equal(m.suppressesDailyMood(undefined, "2026-10-19", true), true, "wait while loading");
  assert.equal(m.suppressesDailyMood(fresh(), "2026-10-19", false), true, "pending welcome");
  const later = run(fresh(), { type: "WELCOME_SHOWN", day: "2026-10-19" }, { type: "LATER" });
  assert.equal(m.suppressesDailyMood(later, "2026-10-19", false), true);
  assert.equal(m.suppressesDailyMood(later, "2026-10-20", false), false);
});

test("checklist ticks with real actions and hides when complete or hidden", () => {
  let s = run(fresh(), { type: "LATER" }, { type: "ACTION", action: "viewedProfile" },
    { type: "ACTION", action: "joinedChallenge" }, { type: "ACTION", action: "openedEvent" });
  assert.equal(m.checklistProgress(s, false).count, 3);
  assert.equal(m.isChecklistVisible(s, false), true);
  assert.equal(m.isChecklistVisible(s, true), false, "profile complete → 4/4");
  s = run(fresh(), { type: "LATER" }, { type: "HIDE_CHECKLIST" });
  assert.equal(m.isChecklistVisible(s, false), false);
  assert.equal(m.ownsHomePrompts(s), false);
});

test("persisted state is validated per user and version", () => {
  const s = fresh();
  assert.equal(JSON.stringify(m.parseState(JSON.stringify(s), "u1")), JSON.stringify(s));
  assert.equal(m.parseState(JSON.stringify(s), "u2"), null);
  assert.equal(m.parseState(JSON.stringify({ ...s, version: 99 }), "u1"), null);
  assert.equal(m.parseState("{oops", "u1"), null);
});

test("the welcome waits for push notifications and deep links", () => {
  const base = { now: 100000, bootAt: 0, onHome: true, homeFocusSince: 90000, lastAwayAt: null,
    externalEntryAt: null, pendingExternal: false, deferredLinkSettled: true };
  assert.equal(m.canShowWelcome(base), true);
  assert.equal(m.canShowWelcome({ ...base, onHome: false }), false);
  assert.equal(m.canShowWelcome({ ...base, homeFocusSince: 99500 }), false, "settle on Home first");
  assert.equal(m.canShowWelcome({ ...base, pendingExternal: true }), false, "queued push/deep link");
  assert.equal(m.canShowWelcome({ ...base, now: 5000, homeFocusSince: 1000, deferredLinkSettled: false }), false);
  // Opened from a push: wait until the user went to that screen and came back.
  const fromPush = { ...base, externalEntryAt: 89000 };
  assert.equal(m.canShowWelcome(fromPush), false);
  assert.equal(m.canShowWelcome({ ...fromPush, lastAwayAt: 92000, homeFocusSince: 95000 }), true);
  assert.equal(m.canShowWelcome({ ...fromPush, now: 89000 + m.EXTERNAL_ENTRY_GRACE_MS + 1 }), true);
});
