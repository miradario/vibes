const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, imports) {
  const module = { exports: {} };
  new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(module, module.exports, name => imports[name]);
  return module.exports;
}
const { imageCacheSource } = load('src/lib/imageCacheSource.ts', {});
test('rotating signed tokens share cached bytes without changing the actual request or object version', () => {
  const original = { uri: 'https://example.supabase.co/storage/v1/object/sign/profile%20pictures/user/photo.jpg?token=old&v=2' };
  const next = { uri: original.uri.replace('token=old', 'token=new') };
  assert.equal(imageCacheSource(original).cacheKey, imageCacheSource(next).cacheKey);
  assert.equal(imageCacheSource(original).uri, original.uri);
  assert.notEqual(imageCacheSource(original).cacheKey, imageCacheSource({ uri: original.uri.replace('v=2', 'v=3') }).cacheKey);
  const external = { uri: 'https://other.test/image?token=old' };
  assert.equal(imageCacheSource(external), external);
  assert.equal(imageCacheSource(12), 12);
});
test('new portrait and landscape uploads keep aspect ratio, never upscale, and propagate conversion failures', async () => {
  let size = [4000, 3000], fail = false;
  const calls = [];
  const { preparePhotoUpload } = load('src/lib/preparePhotoUpload.ts', {
    'react-native': { Image: { getSize: (uri, ok) => ok(...size) } },
    'expo-image-manipulator': { SaveFormat: { JPEG: 'jpeg' }, manipulateAsync: async (...args) => { if (fail) throw Error('decode'); calls.push(args); return { uri: 'file:///optimized.jpg' }; } },
  });
  await preparePhotoUpload('file:///large.jpg');
  assert.deepEqual(calls.at(-1)[1], [{ resize: { width: 1600 } }]);
  size = [2000, 4000]; await preparePhotoUpload('file:///portrait.jpg');
  assert.deepEqual(calls.at(-1)[1], [{ resize: { height: 1600 } }]);
  size = [500, 700]; await preparePhotoUpload('file:///small.png');
  assert.deepEqual(calls.at(-1)[1], []);
  assert.equal(calls.at(-1)[2].format, 'jpeg');
  assert.equal(await preparePhotoUpload('https://external.test/photo.jpg'), 'https://external.test/photo.jpg');
  fail = true; await assert.rejects(preparePhotoUpload('file:///broken.jpg'), /decode/);
});
