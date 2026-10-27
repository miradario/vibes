const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/eventSchedule.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: api, Date });
const iso = (s) => new Date(s).toISOString();
// ADEPTOS-like schedule (Buenos Aires, UTC-3), viewed on 27/10.
const now = Date.parse('2026-10-27T10:00:00-03:00');
const schedule = [
  { startsAt: iso('2026-10-07T22:00:00-03:00'), endsAt: iso('2026-11-07T23:00:00-03:00') },
  { startsAt: iso('2026-10-30T20:30:00-03:00'), endsAt: iso('2026-10-30T21:30:00-03:00') },
  { startsAt: iso('2026-10-30T22:00:00-03:00'), endsAt: iso('2026-10-30T23:00:00-03:00') },
  { startsAt: iso('2026-11-07T20:30:00-03:00'), endsAt: iso('2026-11-07T21:30:00-03:00') },
];

test('past first start shows the next session to begin', () => {
  const plain = schedule.map(({ startsAt }) => ({ startsAt }));
  assert.equal(api.displayEventSession(plain, null, now).startsAt, iso('2026-10-30T20:30:00-03:00'));
});
test('a session still in progress counts as next (end not reached)', () => {
  assert.equal(api.displayEventSession(schedule, null, now).startsAt, schedule[0].startsAt);
});
test('all sessions past falls back to the last one', () => {
  const later = Date.parse('2026-12-01T00:00:00-03:00');
  assert.equal(api.displayEventSession(schedule, null, later).startsAt, schedule[3].startsAt);
  assert.equal(api.remainingUpcomingSessions(schedule, null, later), 0);
});
test('fallback to starts_at when there is no schedule', () => {
  assert.equal(api.displayEventSession([], schedule[1].startsAt, now).startsAt, schedule[1].startsAt);
});

test('blocks a new session starting in the past', () => {
  const [issue] = api.validateScheduleDrafts([{ date: '2026-10-07', time: '22:00' }], [], now);
  assert.equal(issue.error, 'La fecha de inicio ya pasó');
});
test('future session passes', () => {
  const [issue] = api.validateScheduleDrafts([{ date: '2099-10-30', time: '20:30' }], [], now);
  assert.equal(issue.error, undefined);
  assert.equal(issue.warning, undefined);
});
test('editing keeps already-saved past sessions but blocks a changed one', () => {
  const saved = [new Date(2026, 9, 7, 22, 0).toISOString()];
  const [kept, changed] = api.validateScheduleDrafts([{ date: '2026-10-07', time: '22:00' }, { date: '2026-10-08', time: '22:00' }], saved, now);
  assert.equal(kept.error, undefined);
  assert.equal(changed.error, 'La fecha de inicio ya pasó');
});
test('warns (does not block) when the end is more than a day after the start', () => {
  const [issue] = api.validateScheduleDrafts([{ date: '2099-10-07', time: '22:00', endDate: '2099-11-07', endTime: '23:00' }], [], now);
  assert.equal(issue.error, undefined);
  assert.match(issue.warning, /más de un día/);
  const [short] = api.validateScheduleDrafts([{ date: '2099-10-07', time: '22:00', endDate: '2099-10-08', endTime: '01:00' }], [], now);
  assert.equal(short.warning, undefined);
});
