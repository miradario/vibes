const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const result = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/rangeSlider.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: result });
const move = (...args) => Array.from(result.moveRangeThumb(...args));
test('age handles cannot cross or leave the supported age range', () => {
  assert.deepEqual(move(18, 80, 25, 50, 'lower', 70), [50, 50]);
  assert.deepEqual(move(18, 80, 25, 50, 'upper', 10), [25, 25]);
  assert.deepEqual(move(18, 80, 25, 50, 'lower', 0), [18, 50]);
  assert.deepEqual(move(18, 80, 25, 50, 'upper', 100), [25, 80]);
});
test('distance supports zero and exact integer values', () => {
  assert.deepEqual(move(0, 999, 0, 100, 'upper', 50.1), [0, 50]);
  assert.deepEqual(move(0, 999, 0, 50, 'lower', -20), [0, 50]);
});
test('unrestricted slider endpoints do not create active filters, including saved defaults', () => {
  const normalize = (...args) => Array.from(result.normalizeRangeBounds(...args));
  assert.deepEqual(normalize(18, 80, 18, 80), [null, null]);
  assert.deepEqual(normalize(0, 999, 0, 999), [null, null]);
  assert.deepEqual(normalize(0, null, 0, 999), [null, null]);
  assert.deepEqual(normalize(null, null, 18, 80), [null, null]);
  assert.deepEqual(normalize(25, 80, 18, 80), [25, null]);
  assert.deepEqual(normalize(0, 50, 0, 999), [null, 50]);
});
