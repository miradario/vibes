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
  const exports = {};
  cache.set(file, exports);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { exports, Date, require: name => {
    if (/\.(png|jpg)$/.test(name)) return 1;
    if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name + '.ts'));
    return require(name);
  } });
  return exports;
}
const { mapCandidateToConnectionProfile: map } = load('src/lib/connectionProfiles.ts');
test('location and distance stay separate in the mapped profile', () => {
  const profile = map({ id: 'test', displayName: 'Test', city: 'Rosario', country: 'Argentina', distanceKm: 12.4 });
  assert.equal(profile.location, 'Rosario, Argentina');
  assert.equal(profile.distanceLabel, '12 km');
});
test('distance without a city never becomes a location', () => {
  const profile = map({ id: 'test', distanceKm: 5 });
  assert.equal(profile.location, undefined);
  assert.equal(profile.distanceLabel, '5 km');
});
test('missing or invalid distance does not invent kilometers', () => {
  for (const distanceKm of [undefined, NaN, Infinity]) {
    const profile = map({ id: 'test', locationLabel: 'Rosario', distanceKm });
    assert.equal(profile.location, 'Rosario');
    assert.equal(profile.distanceLabel, undefined);
  }
});

const { splitProfileLocation } = load('src/lib/profileLocation.ts');
test('cached location suffix is moved into the distance field', () => {
  const result = splitProfileLocation('Cañuelas, Argentina · 60 km');
  assert.equal(result.location, 'Cañuelas, Argentina');
  assert.equal(result.distanceLabel, '60 km');
});
test('explicit distance overrides stale suffix and street names remain intact', () => {
  const result = splitProfileLocation('Cañuelas, Argentina · 60 km', '62 km');
  assert.equal(result.location, 'Cañuelas, Argentina');
  assert.equal(result.distanceLabel, '62 km');
  assert.equal(splitProfileLocation('Ruta 3 km 60').location, 'Ruta 3 km 60');
  assert.equal(splitProfileLocation('60 km').location, undefined);
});
