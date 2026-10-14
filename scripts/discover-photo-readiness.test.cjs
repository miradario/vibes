const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const moduleExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/discoverPhotoReadiness.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: moduleExports });
const check = moduleExports.discoverPhotoReadiness;
const photos = [{ key: 'a', uri: 'https://example.test/a' }, { key: 'b', uri: 'https://example.test/b' }];
test('profiles stay behind the loading state until every visible photo is loaded', () => {
  assert.equal(check(photos, { a: true }).ready, false);
  assert.equal(check(photos, { a: true, b: true }).ready, true);
});
test('photo failure shows an error, and successful retry releases the loading state', () => {
  const failed = check(photos, { a: true, b: false });
  assert.equal(failed.ready, false); assert.equal(failed.failed, true);
  assert.equal(check(photos, { a: true, b: true }).failed, false);
});
test('profiles with no photo do not wait for a nonexistent image', () => {
  assert.equal(check([...photos, { key: 'c', uri: null }], { a: true, b: true }).ready, true);
});
