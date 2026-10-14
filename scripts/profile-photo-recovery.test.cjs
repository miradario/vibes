const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const compile = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

test('a stalled photo URL leaves the cache retryable and does not block profiles forever', async () => {
  const boot = {}, photo = {};
  vm.runInNewContext(compile('src/lib/startupBoot.ts'), { exports: boot, setTimeout: (fn) => setTimeout(fn, 10), clearTimeout });
  let requests = 0;
  vm.runInNewContext(compile('src/lib/profilePhotoStorage.ts'), {
    exports: photo, console,
    require: name => name === './startupBoot' ? boot : {
      supabase: { storage: { from: () => ({ createSignedUrl: () => {
        requests += 1;
        return requests === 1 ? new Promise(() => {}) : Promise.resolve({ data: { signedUrl: 'https://example.test/photo' }, error: null });
      } }) } },
    },
  });
  const [first, duplicate] = await Promise.all([
    photo.createSignedProfilePhotoUrl('fictional-photo.jpg'),
    photo.createSignedProfilePhotoUrl('fictional-photo.jpg'),
  ]);
  assert.equal(first, null);
  assert.equal(duplicate, null);
  assert.equal(requests, 1);
  assert.equal(await photo.createSignedProfilePhotoUrl('fictional-photo.jpg'), 'https://example.test/photo');
  assert.equal(requests, 2);
  assert.equal(await photo.createSignedProfilePhotoUrl('fictional-photo.jpg'), 'https://example.test/photo');
  assert.equal(requests, 2);
});
