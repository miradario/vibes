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
const steps = load("src/lib/healthChallenge.ts", { "./challengeProgress": progress });
const health = steps;

const now = new Date(2026, 9, 28, 18, 0, 0);
const startedDaysAgo = (days) => new Date(2026, 9, 28 - days, 9, 0, 0).toISOString();
const candidate = (overrides = {}) => ({
  challengeId: "c1", title: "1000 pasos por día", metricType: "steps", dailyGoal: 1000,
  startsAt: startedDaysAgo(2), durationDays: 21, checkedInToday: false, ...overrides,
});

test("metric parsing keeps existing challenges as regular ones", () => {
  assert.deepEqual({ ...steps.parseChallengeMetric({}) }, { metricType: "none", dailyGoal: null });
  assert.deepEqual({ ...steps.parseChallengeMetric({ metric_type: "none", daily_goal: null }) }, { metricType: "none", dailyGoal: null });
  assert.deepEqual({ ...steps.parseChallengeMetric({ metric_type: "steps", daily_goal: 1000 }) }, { metricType: "steps", dailyGoal: 1000 });
  assert.deepEqual({ ...steps.parseChallengeMetric({ metric_type: "steps", daily_goal: 0 }) }, { metricType: "none", dailyGoal: null });
  assert.deepEqual({ ...steps.parseChallengeMetric({ metric_type: "sleep", daily_goal: 8 }) }, { metricType: "none", dailyGoal: null });
  assert.deepEqual({ ...steps.parseChallengeMetric({ metric_type: "water_ml", daily_goal: 2000 }) }, { metricType: "none", dailyGoal: null });
  for (const metric of ["mindful_minutes", "sleep_minutes", "exercise_minutes", "distance_meters"]) {
    assert.deepEqual({ ...steps.parseChallengeMetric({ metric_type: metric, daily_goal: 10 }) }, { metricType: metric, dailyGoal: 10 });
    assert.equal(steps.isHealthChallenge({ metricType: metric, dailyGoal: 10 }), true);
    assert.equal(steps.isStepChallenge({ metricType: metric, dailyGoal: 10 }), false);
  }
  assert.equal(steps.isStepChallenge({ metricType: "steps", dailyGoal: 1000 }), true);
  assert.equal(steps.isStepChallenge({ metricType: "none", dailyGoal: null }), false);
  assert.equal(steps.isStepChallenge(undefined), false);
});

test("progress label and goal", () => {
  assert.equal(steps.getMetricProgress("steps", 650, 1000).label, "650 / 1.000 pasos");
  assert.equal(steps.getMetricProgress("steps", 650, 1000).reached, false);
  assert.equal(steps.getMetricProgress("steps", 1000, 1000).reached, true);
  assert.equal(steps.getMetricProgress("steps", 12500, 1000).ratio, 1);
  assert.equal(steps.getMetricProgress("steps", null, 1000).value, 0);
  assert.equal(steps.formatStepCount(1234567), "1.234.567");
});

test("units and formats per metric", () => {
  assert.equal(health.formatMinutes(0), "0 min");
  assert.equal(health.formatMinutes(45), "45 min");
  assert.equal(health.formatMinutes(60), "1 h");
  assert.equal(health.formatMinutes(390), "6 h 30 min");
  assert.equal(health.formatKilometers(2000), "2 km");
  assert.equal(health.formatKilometers(1450), "1,4 km");
  assert.equal(health.formatKilometers(1999), "1,9 km"); // nunca anticipa la meta
  assert.equal(health.formatKilometers(450), "0,4 km");
  assert.equal(health.formatMetricGoal("steps", 1000), "1.000 pasos");
  assert.equal(health.formatMetricGoal("mindful_minutes", 10), "10 min de meditación");
  assert.equal(health.formatMetricGoal("sleep_minutes", 420), "7 h de sueño");
  assert.equal(health.formatMetricGoal("exercise_minutes", 30), "30 min de movimiento");
  assert.equal(health.formatMetricGoal("distance_meters", 2000), "moverte 2 km");
  assert.equal(health.getMetricProgress("sleep_minutes", 390, 420).label, "6 h 30 min / 7 h");
  assert.equal(health.getMetricProgress("sleep_minutes", 390, 420).remaining, 30);
  assert.equal(health.getMetricProgress("distance_meters", 1450, 2000).label, "1,4 km / 2 km");
  assert.equal(health.getMetricProgress("mindful_minutes", 10, 10).reached, true);
});

test("day window: sleep goes to the wake-up day, the rest from local midnight", () => {
  const morning = new Date(2026, 10, 10, 8, 30);
  const sleep = health.getMetricWindow("sleep_minutes", morning);
  assert.equal(sleep.start.getTime(), new Date(2026, 10, 9, 18, 0).getTime());
  assert.equal(sleep.end.getTime(), morning.getTime());
  const night = new Date(2026, 10, 10, 23, 0);
  // Después de las 18 h la noche nueva ya cuenta para mañana.
  assert.equal(health.getMetricWindow("sleep_minutes", night).end.getTime(), new Date(2026, 10, 10, 18, 0).getTime());
  for (const metric of ["steps", "mindful_minutes", "exercise_minutes", "distance_meters"]) {
    const w = health.getMetricWindow(metric, morning);
    assert.equal(w.start.getTime(), new Date(2026, 10, 10).getTime());
    assert.equal(w.end.getTime(), morning.getTime());
  }
});

test("interval minutes merge overlaps and clip to the window", () => {
  const at = (h, m = 0) => new Date(2026, 10, 10, h, m);
  const start = at(0);
  const end = at(12);
  assert.equal(health.sumIntervalMinutes([], start, end), 0);
  assert.equal(health.sumIntervalMinutes([{ start: at(7), end: at(7, 10) }], start, end), 10);
  // Reloj y celular registran la misma sesión: no se cuenta dos veces.
  assert.equal(health.sumIntervalMinutes([{ start: at(7), end: at(7, 10) }, { start: at(7, 5), end: at(7, 15) }], start, end), 15);
  // Sesiones separadas se suman.
  assert.equal(health.sumIntervalMinutes([{ start: at(7), end: at(7, 10) }, { start: at(9), end: at(9, 5) }], start, end), 15);
  // Se recorta al rango del día.
  assert.equal(health.sumIntervalMinutes([{ start: new Date(2026, 10, 9, 23, 50), end: at(0, 10) }], start, end), 10);
  // Intervalos inválidos se ignoran; acepta strings ISO.
  assert.equal(health.sumIntervalMinutes([{ start: at(8), end: at(7) }, { start: at(8).toISOString(), end: at(8, 20).toISOString() }], start, end), 20);
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
  // With a metric, other metrics' challenges are never marked with that value.
  const mixed = [candidate(), candidate({ challengeId: "m1", metricType: "mindful_minutes", dailyGoal: 10 })];
  assert.deepEqual(steps.selectAutoCheckins(mixed, 12, now, "mindful_minutes").map((item) => item.challengeId), ["m1"]);
  assert.deepEqual(steps.selectAutoCheckins(mixed, 5000, now, "steps").map((item) => item.challengeId), ["c1"]);
  assert.equal(steps.selectAutoCheckins(mixed, 9, now, "mindful_minutes").length, 0);
});

test("goal notification copy", () => {
  const copy = steps.healthGoalNotification({ title: "1000 pasos por día", metricType: "steps", dailyGoal: 1000 });
  assert.equal(copy.title, "¡Llegaste a tu meta de pasos!");
  assert.match(copy.body, /1\.000 pasos/);
  assert.equal(steps.healthGoalNotification({ title: "x", dailyGoal: 1000 }).title, "¡Llegaste a tu meta de pasos!");
  assert.equal(
    steps.healthGoalNotification({ title: "Meditar", metricType: "mindful_minutes", dailyGoal: 10 }).body,
    "Meditaste 10 min y marcamos el día en “Meditar”."
  );
  assert.match(steps.healthGoalNotification({ title: "Dormí 7 horas", metricType: "sleep_minutes", dailyGoal: 420 }).body, /^Dormiste 7 h /);
  assert.match(steps.healthGoalNotification({ title: "x", metricType: "exercise_minutes", dailyGoal: 30 }).title, /movimiento/);
  assert.match(steps.healthGoalNotification({ title: "x", metricType: "distance_meters", dailyGoal: 2000 }).body, /^Te moviste 2 km /);
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

test("metric migration widens the check without touching data", () => {
  const sql = fs.readFileSync("supabase/migrations/20261110162317_health_metric_challenges.sql", "utf8");
  for (const metric of ["none", "steps", "mindful_minutes", "sleep_minutes", "exercise_minutes", "distance_meters"]) {
    assert.match(sql, new RegExp(`'${metric}'`));
  }
  assert.doesNotMatch(sql, /water|hydration/i);
  assert.doesNotMatch(sql, /\b(update|insert|delete)\b/i);
  assert.match(sql, /daily_goal <= 1440/);
  // Every metric the app knows is allowed by the database.
  for (const metric of health.HEALTH_METRICS) assert.match(sql, new RegExp(`'${metric}'`));
});

test("Por Vibes health seed is marked as not applied and idempotent", () => {
  const seed = fs.readFileSync("supabase/seeds/por_vibes_health_metric_challenges.sql", "utf8");
  assert.match(seed, /NO APLICADO/);
  assert.match(seed, /78305396-4e1c-44ef-9221-be17a9d4345d/);
  assert.match(seed, /and metric_type = 'none'/);
  for (const [title, metric, goal] of [["Dormí 7 horas", "sleep_minutes", 420], ["30 minutos de movimiento", "exercise_minutes", 30], ["Moverte 2 km por día", "distance_meters", 2000]]) {
    assert.match(seed, new RegExp(`title = '${title}'`));
    assert.match(seed, new RegExp(`'${metric}', ${goal}`));
  }
});

test("native config declares read-only access for every metric", () => {
  const manifest = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
  const appJson = fs.readFileSync("app.json", "utf8");
  for (const perm of ["READ_STEPS", "READ_MINDFULNESS", "READ_SLEEP", "READ_EXERCISE", "READ_DISTANCE", "READ_HEALTH_DATA_IN_BACKGROUND"]) {
    assert.match(manifest, new RegExp(`android\\.permission\\.health\\.${perm}"`));
    assert.match(appJson, new RegExp(`android\\.permission\\.health\\.${perm}"`));
  }
  assert.doesNotMatch(manifest + appJson, /health\.WRITE_/);
  const plist = fs.readFileSync("ios/Vibes/Info.plist", "utf8");
  assert.match(plist, /mindfulness, sueño, minutos de ejercicio y distancia/);
  assert.doesNotMatch(plist, /NSHealthUpdateUsageDescription/);
});

test("health check-in notifications open the challenge", () => {
  const nav = load("src/notifications/reminderNavigation.ts");
  const destination = nav.getReminderDestination({ type: "challenge_health_checkin", eventId: "c1" });
  assert.equal(destination.name, "ChallengeDetailScreen");
  assert.equal(destination.params.challengeId, "c1");
});

test("health card has an existing Ionicons glyph for every metric", () => {
  const card = fs.readFileSync("components/HealthChallengeCard.tsx", "utf8");
  const glyphs = require("@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json");
  for (const metric of health.HEALTH_METRICS) {
    const match = card.match(new RegExp(`${metric}: "([a-z-]+)"`));
    assert.ok(match, `missing icon for ${metric}`);
    assert.ok(glyphs[match[1]], `unknown Ionicons glyph ${match[1]}`);
  }
  assert.doesNotMatch(card, /#[0-9a-fA-F]{3,8}\b|rgba?\(/);
});

test("Vibes meditations feed mindfulness challenges", () => {
  const auto = fs.readFileSync("src/health/healthAutoCheckin.ts", "utf8");
  assert.match(auto, /from\("meditation_presence"\)/);
  assert.match(auto, /metric !== "mindful_minutes"/);
  const points = fs.readFileSync("src/queries/vibesPoints.queries.ts", "utf8");
  assert.match(points, /runHealthAutoCheckins\(\{ notify: false \}\)/);
  // The background task keeps its original name so existing registrations stay valid.
  assert.match(fs.readFileSync("src/health/healthBackgroundTask.ts", "utf8"), /"vibes-step-challenge-checkin"/);
});
