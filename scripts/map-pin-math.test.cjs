const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync('src/lib/mapPinMath.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const m = {};
vm.runInNewContext(code, { exports: m, Math });
const center = { lat: -34.5889, lng: -58.4298 };
const container = { width: 340, height: 168 };
const image = { width: 800, height: 360 };

test('world projection round-trips', () => {
  const back = m.worldToLatLng(m.latLngToWorld(center, 15), 15);
  assert.ok(Math.abs(back.lat - center.lat) < 1e-9);
  assert.ok(Math.abs(back.lng - center.lng) < 1e-9);
});

test('cover scale uses the larger ratio', () => {
  assert.equal(m.coverScale(container, image), 168 / 360);
});

test('tapping the centre keeps the coordinates', () => {
  const p = m.previewPointToLatLng({ center, point: { x: 170, y: 84 }, container, image });
  assert.ok(Math.abs(p.lat - center.lat) < 1e-9);
  assert.ok(Math.abs(p.lng - center.lng) < 1e-9);
});

test('moving right/down goes east/south by the expected distance', () => {
  const p = m.previewPointToLatLng({ center, point: { x: 170 + 168 / 360 * 100, y: 84 + 168 / 360 * 100 }, container, image });
  assert.ok(p.lng > center.lng);
  assert.ok(p.lat < center.lat);
  // 100 px de mapa a zoom 15 ≈ 100 * 360 / (256 * 2^15) grados de longitud.
  assert.ok(Math.abs(p.lng - center.lng - 100 * 360 / (256 * 32768)) < 1e-9);
});

test('points are clamped to the preview', () => {
  const c = m.clampPointToContainer({ x: -5, y: 500 }, container);
  assert.equal(c.x, 0);
  assert.equal(c.y, 168);
});
