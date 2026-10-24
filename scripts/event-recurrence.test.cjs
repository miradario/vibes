const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
process.env.TZ = 'America/Argentina/Buenos_Aires';
const api = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/eventSchedule.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: api.exports, Date });
const { buildRecurringSchedule: build, normalizeSchedule: normalize, getEventRecurrence: ruleOf, eventHasExpired: expired, nextEventSession: next, sessionDraft: draftOf, formatEventRecurrence: label } = api.exports;
const days = schedule => Array.from(schedule, entry => draftOf(entry.startsAt).date);
const weekly = { frequency: 'weekly', weekdays: [2, 4], count: 4 };
test('weekly events use selected weekdays and keep local time and duration', () => {
  const schedule = build({ date: '2026-10-27', time: '19:00', endDate: '2026-10-27', endTime: '20:30' }, weekly);
  assert.deepEqual(days(schedule), ['2026-10-27', '2026-10-29', '2026-11-03', '2026-11-05']);
  for (const entry of schedule) {
    assert.equal(draftOf(entry.startsAt).time, '19:00');
    assert.equal(Date.parse(entry.endsAt) - Date.parse(entry.startsAt), 90 * 60000);
  }
  assert.match(label(schedule), /martes y jueves/);
});
test('monthly events clamp short months without drifting from the original day', () => {
  const schedule = build({ date: '2027-01-31', time: '10:00' }, { frequency: 'monthly', weekdays: [], count: 4 });
  assert.deepEqual(days(schedule), ['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30']);
  const leap = build({ date: '2028-01-31', time: '10:00' }, { frequency: 'monthly', weekdays: [], count: 2 });
  assert.deepEqual(days(leap), ['2028-01-31', '2028-02-29']);
});
test('bad rules and invalid seed dates do not create a partial series', () => {
  const seed = { date: '2026-10-27', time: '19:00' };
  for (const count of [0, 1, 53, 2.5, NaN]) assert.equal(build(seed, { ...weekly, count }), null);
  assert.equal(build(seed, { ...weekly, weekdays: [] }), null);
  assert.equal(build({ date: '2026-02-30', time: '19:00' }, weekly), null);
  assert.equal(build({ ...seed, endDate: seed.date, endTime: '18:00' }, weekly), null);
  assert.equal(build(seed, { ...weekly, count: 52, weekdays: [1] }).length, 52);
});
test('recurrence survives JSON storage, normalization and subsequent editing', () => {
  const schedule = build({ date: '2026-10-27', time: '19:00' }, weekly);
  const restored = normalize(JSON.parse(JSON.stringify(schedule)));
  assert.equal(ruleOf(restored).frequency, 'weekly');
  assert.equal(ruleOf(restored).count, 4);
  assert.deepEqual(days(build(draftOf(restored[0].startsAt), ruleOf(restored))), days(schedule));
  assert.equal(restored.filter(entry => entry.recurrence).length, 1);
});
test('series stays active after its first meeting and advances to its next date', () => {
  const schedule = build({ date: '2026-10-27', time: '19:00' }, weekly);
  const now = new Date('2026-10-28T12:00:00-03:00').getTime();
  assert.equal(expired(schedule, null, now), false);
  assert.equal(draftOf(next(schedule, null, now).startsAt).date, '2026-10-29');
  assert.equal(expired(schedule, null, new Date('2026-11-06T12:00:00-03:00').getTime()), true);
});
