const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(supabase) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync('src/auth/emailVerification.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(js, { exports, require: () => ({ supabase }) });
  return exports;
}
test('concurrent opens redeem a one-time token once and store the session once', async () => {
  let calls = 0, sessions = 0;
  const api = load({ functions: { invoke: async () => { calls++; return { data: { session: {} } }; } },
    auth: { setSession: async () => { sessions++; return {}; } } });
  await Promise.all([api.verifyEmailOwnership('test-token'), api.verifyEmailOwnership('test-token')]);
  assert.equal(calls, 1);
  assert.equal(sessions, 1);
  await api.verifyEmailOwnership('test-token');
  assert.equal(calls, 1);
});
test('a failed request can retry the same token without restarting the app', async () => {
  let calls = 0, sessions = 0;
  const api = load({ functions: { invoke: async () => ++calls === 1
    ? { error: new Error('offline') } : { data: { session: {} } } },
    auth: { setSession: async () => { sessions++; return {}; } } });
  await assert.rejects(api.verifyEmailOwnership('retry-token'));
  await api.verifyEmailOwnership('retry-token');
  assert.equal(calls, 2);
  assert.equal(sessions, 1);
});
test('only server ownership metadata for the current email counts as verified', () => {
  const { isEmailOwnershipVerified: verified } = load({});
  assert.equal(verified({ email: 'test@example.com', email_confirmed_at: 'today', app_metadata: {} }), false);
  assert.equal(verified({ email: 'new@example.com', app_metadata: { vibes_verified_email: 'old@example.com', vibes_email_verified_at: 'today' } }), false);
  assert.equal(verified({ email: 'test@example.com', app_metadata: { vibes_verified_email: 'test@example.com', vibes_email_verified_at: 'today' } }), true);
});
