const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const load = file => {
  const api = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports: api });
  return api;
};
const { bounceOffPhoto } = load('src/lib/matchCirclePhysics.ts');
const { getSharedInterests, getMatchIcebreakers } = load('src/lib/matchIcebreakers.ts');
test('a circle bounces outward without overlapping a photo, including while growing', () => {
  for (const radius of [15, 25, 32]) {
    const body = bounceOffPhoto({ x: 0, y: -55, vx: 0, vy: 40, radius }, { x: 0, y: 0, radius: 50 });
    assert.ok(Math.hypot(body.x, body.y) >= radius + 55);
    assert.ok(body.vy < 0);
  }
});
test('collision correction preserves velocity when already traveling away', () => {
  const body = bounceOffPhoto({ x: 0, y: -55, vx: 0, vy: -40, radius: 25 }, { x: 0, y: 0, radius: 50 });
  assert.equal(body.vy, -40);
  assert.equal(body.y, -80);
});
test('shared interests normalize accents and exclude unrelated personal attributes', () => {
  const shared = getSharedInterests({ spiritualPath: ['Meditación', 'Yoga'], preferences: ['Intereses: Música, Arte', 'Género: Mujer'] }, { spiritualPath: ['meditacion'], preferences: ['Intereses: Música, Viajes', 'Género: Mujer'] });
  assert.deepEqual(Array.from(shared), ['Meditación', 'Música']);
  assert.ok(getMatchIcebreakers(shared).some(question => question.includes('silencio')));
  assert.equal(getSharedInterests(null, null).length, 0);
  assert.ok(getMatchIcebreakers([]).every(question => typeof question === 'string' && question.endsWith('?')));
});
