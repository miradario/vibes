const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const filters = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/learning/filters.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText, {exports:filters, Date});
test('city filter drops street addresses and normalizes CABA', () => {
  assert.equal(filters.learningLocality('Av. Santa Fe 1234'), '');
  assert.equal(filters.learningLocality('Santos Dumont 4040, Chacarita, Argentina'), 'Chacarita');
  assert.equal(filters.learningLocality('Costa Rica 5640, Capital Federal'), 'CABA');
  assert.equal(filters.learningLocality('Online'), '');
});
test('date range includes both boundaries and respects either open boundary', () => {
  assert.equal(filters.matchesLearningDateRange(['2026-11-04 10:00'],'2026-11-04','2026-11-04'),true);
  assert.equal(filters.matchesLearningDateRange(['2026-11-03 10:00'],'2026-11-04',''),false);
  assert.equal(filters.matchesLearningDateRange(['2026-11-05 10:00'],'','2026-11-04'),false);
  assert.equal(filters.matchesLearningDateRange([], '', ''),true);
});
test('weekly classes match weekdays within range, including across months', () => {
  assert.equal(filters.weeklyRangeMatches([3],'2026-11-04','2026-11-04','2026-11-02'),true);
  assert.equal(filters.weeklyRangeMatches([3],'2026-11-05','2026-11-06','2026-11-02'),false);
  assert.equal(filters.weeklyRangeMatches([3],'2026-11-30','2026-12-04','2026-11-02'),true);
});
