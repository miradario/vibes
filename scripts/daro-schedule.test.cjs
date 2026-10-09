const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const path = require('node:path');
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('module', 'exports', 'require', code)(module, module.exports, (name) => name.startsWith('.') ? load(path.resolve(path.dirname(file), `${name}.ts`)) : require(name));
  cache.set(file, module.exports);
  return module.exports;
}
const schedule = load('src/lib/eventSchedule.ts');
const filters = load('src/lib/eventFilters.ts');
const suggestions = load('src/lib/homeSuggestions.ts');
test('accepts exact hours/minutes and rejects invalid local dates and hours', () => {
  assert.equal(schedule.parseSession({ date: '2026-10-09', time: '09:37' }).getMinutes(), 37);
  for (const time of ['24:00', '12:60', '7:0', 'abc', '']) assert.equal(schedule.parseSession({ date: '2026-10-09', time }), null);
  assert.equal(schedule.parseSession({ date: '2026-02-30', time: '10:00' }), null);
});
test('multi-day schedule round trips in chronological order, removing duplicate occurrences', () => {
  const drafts = [{ date: '2026-10-12', time: '18:45' }, { date: '2026-10-09', time: '09:37' }, { date: '2026-10-12', time: '18:45' }];
  const sessions = schedule.serializeSchedule(drafts);
  assert.equal(sessions.length, 2);
  assert.deepEqual(sessions.map(s => schedule.sessionDraft(s.startsAt)), [drafts[1], drafts[0]]);
  assert.equal(schedule.serializeSchedule([...drafts, { date: '', time: '' }]), null);
  assert.equal(schedule.normalizeSchedule(null, sessions[0].startsAt).length, 1);
});
test('events remain current until the end of their last occurrence day', () => {
  const sessions = schedule.serializeSchedule([{ date: '2026-10-09', time: '09:37' }, { date: '2026-10-12', time: '18:45' }]);
  assert.equal(schedule.eventHasExpired(sessions, sessions[0].startsAt, new Date(2026, 9, 10).getTime()), false);
  assert.equal(schedule.eventHasExpired(sessions, sessions[0].startsAt, new Date(2026, 9, 13).getTime()), true);
});
test('date filters find any occurrence and preserve the location constraint', () => {
  const item = { startsAt: '2026-10-09T12:00:00Z', schedule: [{ startsAt: '2026-10-12T21:45:00Z' }], location: 'Córdoba' };
  const day = new Date(2026, 9, 12);
  assert.equal(filters.matchesEventDateAndLocation(item, day, day, 'Cordoba'), true);
  assert.equal(filters.matchesEventDateAndLocation(item, day, day, 'Rosario'), false);
  assert.equal(filters.matchesEventDateAndLocation(item, new Date(2026, 9, 11), new Date(2026, 9, 11), ''), false);
});
test('unlimited capacity never displays participant count divided by zero', () => {
  assert.equal(schedule.formatAttendees(7, 0), '7 · sin límite');
  assert.equal(schedule.formatAttendees(7, 20), '7/20');
});
test('Home prioritizes age, proximity and shared tastes and does not mutate the candidate pool', () => {
  const own = { suggestionAge: 32, spiritual_path: ['Meditación'], open_to: ['Amistad'] };
  const range = { ageMin: null, ageMax: null };
  const pool = [
    { id: 'far', suggestionAge: 65, distanceKm: 300 },
    { id: 'near', suggestionAge: 32, distanceKm: 5 },
    { id: 'shared', suggestionAge: 33, distanceKm: 5, spiritualPath: ['meditacion'], openTo: ['amistad'] },
  ];
  assert.deepEqual(suggestions.rankHomeSuggestions(pool, own, range).map(p => p.id), ['shared', 'near', 'far']);
  assert.equal(pool[0].id, 'far');
});
test('Home honors selected age range and handles missing fields stably', () => {
  const own = {};
  const range = { ageMin: 40, ageMax: 50 };
  const pool = [{ id: 'young', suggestionAge: 20 }, { id: 'preferred', suggestionAge: 45 }, { id: 'unknown' }];
  assert.deepEqual(suggestions.rankHomeSuggestions(pool, own, range).map(p => p.id), ['preferred', 'young', 'unknown']);
  assert.deepEqual(suggestions.rankHomeSuggestions([{ id: 1 }, { id: 2 }], {}, { ageMin: null, ageMax: null }).map(p => p.id), [1, 2]);
});

const home = load('src/lib/homeOverview.ts');
test('Home agenda includes the next occurrence even after the first has passed', () => {
  const event = { id: 'multi', type: 'event', startsAt: '2026-10-09T12:00:00Z', schedule: [{ startsAt: '2026-10-09T12:00:00Z' }, { startsAt: '2026-10-12T21:45:00Z' }] };
  const now = Date.parse('2026-10-10T12:00:00Z');
  assert.equal(home.getUpcomingHomeEvents([event], now)[0].id, 'multi');
  assert.equal(schedule.nextEventSession(event.schedule, event.startsAt, now).startsAt, '2026-10-12T21:45:00.000Z');
  assert.equal(event.startsAt, '2026-10-09T12:00:00Z');
});
