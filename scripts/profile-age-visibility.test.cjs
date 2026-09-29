const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: key => {
    if (key.endsWith('.png')) return { default: 1 };
    const resolved = path.resolve(path.dirname(file), key);
    return load(fs.existsSync(resolved + '.ts') ? resolved + '.ts' : resolved + '.tsx');
  }});
  return exports;
}
const { mapCandidateToConnectionProfile: map } = load('src/lib/connectionProfiles.ts');
test('hidden age is omitted for stored and mapped preferences, including birthdate fallbacks', () => {
  for (const flag of [{ hideAge: true }, { hide_age: true }]) {
    for (const age of [{ age: 31 }, { birthDate: '1995-01-01' }, { birth_date: '1995-01-01' }]) {
      assert.equal(map({ id: 'person', ...age, ...flag }).age, undefined);
    }
  }
});
test('age remains visible by default and after disabling the preference', () => {
  assert.equal(map({ id: 'person', age: 31 }).age, '31');
  assert.equal(map({ id: 'person', age: 31, hideAge: false }).age, '31');
});
