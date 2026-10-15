const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  const result = {}; cache.set(file, result);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports: result, require: name => load(path.resolve(path.dirname(file), name + '.ts')) });
  return result;
}
const { matchesSavedDiscoverExtras: matches } = load('src/lib/discoverSavedFilters.ts');
test('Home applies persisted multiple genders, diet, spiritual path and nationality together', () => {
  const preferences = {
    discover_genders: ['male', 'female'], discover_diets: ['vegetarian'],
    discover_spiritual_paths: ['Yoga'], discover_answer_filters: { nationalityCode: ['AR'] },
  };
  const profile = { vegetarian: 'Sí', spiritual_path: ['Yoga'], nationality_code: 'AR' };
  assert.equal(matches(profile, preferences, 'female'), true);
  assert.equal(matches(profile, preferences, 'unknown'), false);
  assert.equal(matches({ ...profile, vegetarian: 'No' }, preferences, 'female'), false);
  assert.equal(matches({ ...profile, spiritual_path: ['Reiki'] }, preferences, 'female'), false);
  assert.equal(matches({ ...profile, nationality_code: 'UY' }, preferences, 'female'), false);
});
test('empty saved filters allow profiles with incomplete answers', () => {
  assert.equal(matches({}, {}, 'unknown'), true);
});
