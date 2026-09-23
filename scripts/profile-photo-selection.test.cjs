const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('fs');
const vm = require('vm');
function load(file, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, require: name => imports[name] });
  return exports;
}
const caseMapper = load('src/api/mappers/case.mapper.ts');
const { mapProfileWithPhotos } = load('src/api/mappers/profile.mapper.ts', {
  './case.mapper': caseMapper,
});
test('avatar main photo follows editor order despite a stale primary flag', () => {
  const result = mapProfileWithPhotos({ photos: ['legacy.jpg'] }, [
    { id: 'old', url: 'old.jpg', order: 2, is_primary: true },
    { id: 'new', url: 'new.jpg', order: 0, is_primary: false },
  ]);
  assert.equal(result.photos.find(p => p.isPrimary).url, 'new.jpg');
  assert.equal(result.photos[0].url, 'new.jpg');
  assert.equal(result.photos.filter(p => p.isPrimary).length, 1);
});
test('uses earliest occupied slot after removal and preserves legacy-only photos', () => {
  assert.equal(mapProfileWithPhotos({}, [
    { url: 'later.jpg', order: 4, is_primary: true },
    { url: 'first.jpg', order: 1, is_primary: false },
  ]).photos[0].url, 'first.jpg');
  assert.equal(mapProfileWithPhotos({ photos: ['legacy.jpg'] }, []).photos[0].url, 'legacy.jpg');
  assert.equal(mapProfileWithPhotos({}, []).photos.length, 0);
});

test('temporary negative reorder positions cannot become the profile avatar', () => {
  const result = mapProfileWithPhotos({}, [
    { url: 'stale.jpg', order: -3, is_primary: true },
    { url: 'current.jpg', order: 0, is_primary: false },
  ]);
  assert.equal(result.photos[0].url, 'current.jpg');
  assert.equal(result.photos[0].isPrimary, true);
});
