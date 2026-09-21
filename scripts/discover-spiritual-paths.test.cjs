const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, deps = {}) {
 const exports = {};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText, {exports, require: key => deps[key], Set});
 return exports;
}
const paths = load('src/lib/spiritualPaths.ts');
const {readDiscoverSpiritualPaths: read, matchesDiscoverSpiritualPaths: matches} = load('src/lib/discoverSpiritualPaths.ts', {'./spiritualPaths': paths});
test('no selection includes profiles with no practices; selected paths require a match', () => {
 assert.equal(matches({}, []), true);
 assert.equal(matches({}, ['Tantra']), false);
 assert.equal(matches({spiritualPath: ['Yoga']}, ['Tantra']), false);
});
test('multiple selected paths use OR, including legacy labels and stored detail paths', () => {
 assert.equal(matches({spiritual_path: ['Art of Living']}, ['El Arte de Vivir','Tantra']), true);
 assert.equal(matches({spiritualPath: ['Tantra']}, ['El Arte de Vivir','Tantra']), true);
 assert.equal(matches({spiritualPathDetails: {Tantra: {years: '2'}}}, ['Tantra']), true);
 assert.equal(matches({spiritualPath: ['meditacion']}, ['Meditación']), true);
});
test('persisted filters normalize, deduplicate and reject unknown values', () => {
 assert.equal(read(null).length, 0);
 const result = read(['Art of Living', 'Arte de vivir', 'Tantra', 7, 'invalid']);
 assert.equal(result.length, 2);
 assert.ok(result.includes('El Arte de Vivir'));
 assert.ok(result.includes('Tantra'));
});
