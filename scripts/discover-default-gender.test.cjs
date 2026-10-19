const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
for (const file of ['screens/Discover.tsx', 'screens/Home.tsx']) {
  const source = fs.readFileSync(file, 'utf8');
  const start = source.indexOf('const normalizeGender =');
  const end = source.indexOf('\nconst ', start + 1);
  const result = {};
  vm.runInNewContext(ts.transpileModule(source.slice(start, end) + '\nexports.normalize = normalizeGender;', {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports: result, toFiniteNumber: value => Number(value) });
  test(`${file}: Todos overrides a legacy default ID without inventing an active filter`, () => {
    for (const value of ['all', 'Todos', 'Todas']) assert.equal(result.normalize(value, 3), 'unknown');
    assert.equal(result.normalize('woman', 3), 'woman');
    assert.equal(result.normalize('other', 3), 'other');
  });
}
