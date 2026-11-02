const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
function load(path) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
    { exports, require: () => load('src/lib/eventSchedule.ts'), Date, Set });
  return exports;
}
const explorer = load('src/lib/eventExplorer.ts');
test('calendar includes saved recurring sessions once and sorts by date', () => {
  const result = explorer.calendarOccurrences([{ id: 'weekly', startsAt: '2026-11-04T19:30:00-03:00', schedule: [
    { startsAt: '2026-11-11T19:30:00-03:00' }, { startsAt: '2026-11-04T19:30:00-03:00' }, { startsAt: '2026-11-04T19:30:00-03:00' },
  ] }]);
  assert.equal(result.length, 2);
  assert.ok(Date.parse(result[0].startsAt) < Date.parse(result[1].startsAt));
});
test('calendar ignores invalid dates and falls back to startsAt', () => {
  assert.equal(explorer.calendarOccurrences([{ id:'bad', startsAt:'invalid' }]).length, 0);
  assert.equal(explorer.calendarOccurrences([{ id:'valid', startsAt:'2026-11-05T21:00:00-03:00' }]).length, 1);
});
test('map excludes online, missing and out-of-range coordinates; accepts zero', () => {
  assert.equal(explorer.hasEventCoordinates({ locationLatitude:0,locationLongitude:0 }), true);
  for (const event of [{}, {locationLatitude:91,locationLongitude:1}, {locationLatitude:1,locationLongitude:NaN}, {modality:'online',locationLatitude:1,locationLongitude:1}]) assert.equal(explorer.hasEventCoordinates(event),false);
});
