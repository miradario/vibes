const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const moduleUnderTest = { exports: {} };
new Function('module', 'exports', ts.transpileModule(fs.readFileSync('src/lib/photoCrop.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(moduleUnderTest, moduleUnderTest.exports);
const { constrainPhotoCrop, photoCropRect } = moduleUnderTest.exports;

test('portrait preview selects exactly the visible centered square', () => {
  assert.deepEqual(photoCropRect(1200, 1800, 300, { zoom: 1, x: 0, y: -75 }),
    { originX: 0, originY: 300, width: 1200, height: 1200 });
});
test('zoom and pan map to source pixels while staying inside the image', () => {
  assert.deepEqual(photoCropRect(1800, 1200, 300, { zoom: 2, x: -400, y: -200 }),
    { originX: 800, originY: 400, width: 600, height: 600 });
  for (const [width, height] of [[4032, 3024], [3024, 4032], [333, 777], [777, 333]]) {
    for (const zoom of [0.1, 1, 1.7, 4, 8]) {
      const crop = photoCropRect(width, height, 287, { zoom, x: -90000, y: 90000 });
      assert.ok(crop.originX >= 0 && crop.originY >= 0);
      assert.ok(crop.originX + crop.width <= width && crop.originY + crop.height <= height);
      assert.equal(crop.width, crop.height);
    }
  }
});
test('panning cannot expose empty space and zoom remains between 1x and 4x', () => {
  assert.deepEqual(constrainPhotoCrop(1200, 1800, 300, { zoom: 0.5, x: 20, y: -1000 }),
    { zoom: 1, x: 0, y: -150 });
  assert.equal(constrainPhotoCrop(1200, 1200, 300, { zoom: 10, x: 0, y: 0 }).zoom, 4);
});
