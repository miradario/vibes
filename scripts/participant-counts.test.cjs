const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/participantCounts.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: exportsObject });
test('legacy and current rows count the same person once and retain zero-participant challenges', () => {
  const counts = exportsObject.participantCounts(['a', 'b', 'empty'], [
    { eventId: 'a', userId: 'one' }, { eventId: 'a', userId: 'one' },
    { eventId: 'a', userId: 'two' }, { eventId: 'b', userId: 'one' },
    { eventId: 'b', userId: 'null' },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(counts)), { a: 2, b: 1, empty: 0 });
});
