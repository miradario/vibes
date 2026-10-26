const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/learning/developmentProfiles.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: api, Set });
test('production returns the real catalog without fictional teachers', () => {
  const real = [{ id: 'real', kind: 'teacher', name: 'Real' }];
  assert.equal(api.withDevelopmentProfiles(real, false), real);
});
test('development adds two labeled examples while preserving real teachers', () => {
  const real = { id: 'real', kind: 'teacher', name: 'Real' };
  const rows = api.withDevelopmentProfiles([real], true);
  assert.equal(rows.length, 3); assert.equal(rows[0], real);
  for (const row of rows.slice(1)) {
    assert.equal(row.kind, 'teacher'); assert.match(row.name, /^EJEMPLO/);
    assert.match(row.description, /ficticio/); assert.match(row.description, /no ofrece inscripciones reales/);
  }
});
test('reloading the catalog does not duplicate examples', () => {
  const rows = api.withDevelopmentProfiles([], true);
  assert.equal(api.withDevelopmentProfiles(rows, true).length, 2);
});
