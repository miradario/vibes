const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function fixture(responses) {
  let now = 1000, calls = 0;
  const warnings = [];
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/profilePhotoStorage.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    exports, Date: { now: () => now },
    console: { warn: (...args) => warnings.push(args) },
    require: () => ({ supabase: { storage: { from: () => ({
      createSignedUrl: async () => responses[calls++],
    }) } } }),
  });
  return { sign: exports.createSignedProfilePhotoUrl, warnings, calls: () => calls, advance: () => { now += 60001; } };
}
test('missing photos are cached briefly and retried so restored files can appear', async () => {
  const f = fixture([{ error: { message: 'Object not found' } }, { data: { signedUrl: 'https://photo.test/restored' } }]);
  assert.equal(await f.sign('user/missing.jpg'), null);
  assert.equal(await f.sign('user/missing.jpg'), null);
  assert.equal(f.calls(), 1);
  assert.equal(f.warnings.length, 0);
  f.advance();
  assert.equal(await f.sign('user/missing.jpg'), 'https://photo.test/restored');
  assert.equal(f.calls(), 2);
});
test('permission and service errors still warn and allow immediate retry', async () => {
  const f = fixture([{ error: { message: 'Unauthorized' } }, { data: { signedUrl: 'https://photo.test/ok' } }]);
  assert.equal(await f.sign('user/photo.jpg'), null);
  assert.equal(f.warnings.length, 1);
  assert.equal(await f.sign('user/photo.jpg'), 'https://photo.test/ok');
});
test('successful requests share a pending request and reuse the signed URL', async () => {
  const f = fixture([{ data: { signedUrl: 'https://photo.test/ok' } }]);
  await Promise.all([f.sign('user/photo.jpg'), f.sign('user/photo.jpg')]);
  assert.equal(await f.sign('user/photo.jpg'), 'https://photo.test/ok');
  assert.equal(f.calls(), 1);
});
