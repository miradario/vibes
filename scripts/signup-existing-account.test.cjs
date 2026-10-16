const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(result = { data: null, error: null }) {
  const api = {}, ids = [];
  const query = { select() { return this; }, eq(key, value) { ids.push([key, value]); return this; }, maybeSingle: () => Promise.resolve(result) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/auth/signupRouting.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports: api,
    require: name => name.endsWith('startupBoot') ? { withBootTimeout: promise => promise } : { supabase: { from: () => query } },
  });
  return { api, ids };
}
test('existing email errors are recognized by code and message, but other errors are preserved', () => {
  const { api } = load();
  for (const error of [{ code: 'user_already_exists' }, { code: 'email_exists' }, { message: 'User already registered' }])
    assert.equal(api.isAccountAlreadyRegistered(error), true);
  assert.equal(api.isAccountAlreadyRegistered({ message: 'Network request failed' }), false);
});
test('obfuscated duplicate signups do not fall through to a new-account flow', () => {
  const { api } = load();
  assert.equal(api.isObfuscatedExistingSignup({ session: null, user: { identities: [] } }), true);
  assert.equal(api.isObfuscatedExistingSignup({ session: null, user: { identities: [{ provider: 'email' }] } }), false);
  assert.equal(api.isObfuscatedExistingSignup({ session: {}, user: { identities: [] } }), false);
});
test('social signup checks only the authenticated id and preserves existing profiles', async () => {
  const { api, ids } = load({ data: { id: 'authenticated-account' }, error: null });
  assert.equal(await api.hasRegisteredProfile('authenticated-account'), true);
  assert.deepEqual(ids, [['id', 'authenticated-account']]);
  assert.equal(await load().api.hasRegisteredProfile('new-account'), false);
});
test('a profile lookup failure is not treated as a new account', async () => {
  await assert.rejects(load({ data: null, error: new Error('Network failure') }).api.hasRegisteredProfile('account'), /Network failure/);
});
