const pureTs = require('./helpers/load-pure-ts.cjs');
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, deps = {}) {
 const exports = {};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText, {exports, require: key => deps[key] ?? pureTs.dependency(file,key), Set});
 return exports;
}
const paths = load('src/lib/spiritualPaths.ts');
const {readDiscoverSpiritualPaths: read, matchesDiscoverSpiritualPaths: matches} = load('src/lib/discoverSpiritualPaths.ts', {'./spiritualPaths': paths, '../screens/Onboarding/vibesOnboardingContent': load('src/screens/Onboarding/vibesOnboardingContent.ts')});
test('unassigned profiles only stay visible without community selection', () => {
 assert.equal(matches({}, []), true);
 assert.equal(matches({}, ['Ashtanga']), false);
 assert.equal(matches({spiritualPath: ['Hatha Yoga']}, ['Ashtanga']), false);
});
test('multiple communities use OR, including legacy aliases and stored detail keys', () => {
 assert.equal(matches({spiritual_path: ['Art of Living']}, ['El Arte de Vivir','Danzantes']), true);
 assert.equal(matches({spiritualPath: ['Contact']}, ['El Arte de Vivir','Danzantes']), true);
 assert.equal(matches({spiritualPathDetails: {Hatha: {years: '2'}}}, ['Hatha']), true);
 assert.equal(matches({spiritualPath: ['meditacion trasendental']}, ['Meditación trascendental']), true);
});
test('persisted community filters normalize, deduplicate and reject unknown values', () => {
 assert.equal(read(null).length, 0);
 const result = read(['Art of Living', 'Arte de vivir', 'Danzantes', 7, 'invalid']);
 assert.equal(result.length, 2);
 assert.ok(result.includes('El Arte de Vivir'));
 assert.ok(result.includes('Danzantes'));
});
