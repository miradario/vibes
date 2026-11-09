const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const load = (file, imports = {}) => {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    { exports, require: (name) => imports[name], Date, Set, Number, String, Math }
  );
  return exports;
};

const progress = load("src/lib/challengeProgress.ts");
const steps = load("src/lib/stepChallenge.ts", { "./challengeProgress": progress });

const now = new Date(2026, 9, 28, 18, 0, 0);
const startedDaysAgo = (days) => new Date(2026, 9, 28 - days, 9, 0, 0).toISOString();
const candidate = (overrides = {}) => ({
  challengeId: "c1", title: "1000 pasos por día", dailyGoal: 1000,
  startsAt: startedDaysAgo(2), durationDays: 21, checkedInToday: false, ...overrides,
});

test("metric parsing keeps existing challenges as regular ones", () => {
  assert.deepEqual({ ...steps.parseChallengeMetric({}) }, { metricType: "none", dailyGoal: null });
  assert.deepEqual({ ...steps.parseChallengeMetric({ metric_type: "none", daily_goal: null }) }, { metricType: "none", dailyGoal: null });
  assert.deepEqual({ ...steps.parseChallengeMetric({ metric_type: "steps", daily_goal: 1000 }) }, { metricType: "steps", dailyGoal: 1000 });
  assert.deepEqual({ ...steps.parseChallengeMetric({ metric_type: "steps", daily_goal: 0 }) }, { metricType: "none", dailyGoal: null });
  assert.deepEqual({ ...steps.parseChallengeMetric({ metric_type: "sleep", daily_goal: 8 }) }, { metricType: "none", dailyGoal: null });
  assert.equal(steps.isStepChallenge({ metricType: "steps", dailyGoal: 1000 }), true);
  assert.equal(steps.isStepChallenge({ metricType: "none", dailyGoal: null }), false);
  assert.equal(steps.isStepChallenge(undefined), false);
});

test("progress label and goal", () => {
  assert.equal(steps.getStepProgress(650, 1000).label, "650 / 1.000 pasos");
  assert.equal(steps.getStepProgress(650, 1000).reached, false);
  assert.equal(steps.getStepProgress(1000, 1000).reached, true);
  assert.equal(steps.getStepProgress(12500, 1000).ratio, 1);
  assert.equal(steps.getStepProgress(null, 1000).steps, 0);
  assert.equal(steps.formatStepCount(1234567), "1.234.567");
});

test("auto check-in only when the goal is reached on an open, unmarked day", () => {
  assert.equal(steps.selectAutoCheckins([candidate()], 999, now).length, 0);
  assert.equal(steps.selectAutoCheckins([candidate()], 1000, now).length, 1);
  assert.equal(steps.selectAutoCheckins([candidate({ checkedInToday: true })], 5000, now).length, 0);
  assert.equal(steps.selectAutoCheckins([candidate()], null, now).length, 0);
  // Upcoming and finished challenges are never marked.
  assert.equal(steps.selectAutoCheckins([candidate({ startsAt: startedDaysAgo(-1) })], 5000, now).length, 0);
  assert.equal(steps.selectAutoCheckins([candidate({ startsAt: startedDaysAgo(30) })], 5000, now).length, 0);
  // Each challenge uses its own fixed goal.
  const due = steps.selectAutoCheckins([candidate(), candidate({ challengeId: "c2", dailyGoal: 8000 })], 3000, now);
  assert.deepEqual(due.map((item) => item.challengeId), ["c1"]);
});

test("goal notification copy", () => {
  const copy = steps.stepGoalNotification({ title: "1000 pasos por día", dailyGoal: 1000 });
  assert.equal(copy.title, "¡Llegaste a tu meta de pasos!");
  assert.match(copy.body, /1\.000 pasos/);
});

test("migration keeps defaults safe and reserves health check-ins for the RPC", () => {
  const sql = fs.readFileSync("supabase/migrations/20261028120000_health_step_challenges.sql", "utf8");
  assert.match(sql, /metric_type text not null default 'none'/);
  assert.match(sql, /source text not null default 'manual'/);
  assert.match(sql, /with check \(auth\.uid\(\) = user_id and source = 'manual'\)/);
  assert.match(sql, /grant execute on function public\.record_health_checkin\(uuid, date\) to authenticated/);
  const seed = fs.readFileSync("supabase/seeds/por_vibes_1000_pasos_por_dia.sql", "utf8");
  assert.doesNotMatch(seed.toLowerCase(), /journaling/);
});

test("health check-in notifications open the challenge", () => {
  const nav = load("src/notifications/reminderNavigation.ts");
  const destination = nav.getReminderDestination({ type: "challenge_health_checkin", eventId: "c1" });
  assert.equal(destination.name, "ChallengeDetailScreen");
  assert.equal(destination.params.challengeId, "c1");
});
