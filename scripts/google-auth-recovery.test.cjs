const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, deps = {}, extra = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, console, Date, require: (name) => {
    if (!(name in deps)) throw Error(name);
    return deps[name];
  }, ...extra });
  return exports;
}
const { isEmailOwnershipVerified } = load('src/auth/emailVerification.ts', { '../lib/supabase': { supabase: {} } });
const googleUser = (email, verified = true) => ({ email: 'user@example.com', app_metadata: {}, identities: [{ provider: 'google', identity_data: { email, email_verified: verified } }] });
test('Google verifies only the matching provider-confirmed email, including existing accounts', () => {
  assert.equal(isEmailOwnershipVerified(googleUser('USER@example.com')), true);
  assert.equal(isEmailOwnershipVerified(googleUser('other@example.com')), false);
  assert.equal(isEmailOwnershipVerified(googleUser('user@example.com', false)), false);
  assert.equal(isEmailOwnershipVerified({ email: 'user@example.com', app_metadata: { provider: 'google' }, user_metadata: { email_verified: true } }), false);
});
function service(route, failure) {
  const sent = [];
  const checked = [];
  const api = load('src/auth/auth.service.ts', {
    './emailVerification': {},
    './passwordPolicy': load('src/auth/passwordPolicy.ts'),
    './session.bootstrap': { bootstrapAuthSession: async () => {} },
    './session.recovery': {},
    './supabaseAuth.client': {
      getPasswordRecoveryRoute: async (email) => { checked.push(email); if (failure) throw failure; return route; },
      resetPasswordForEmail: async (email) => { sent.push(email); return { error: null }; },
    },
  });
  return { api, sent, checked };
}
test('Google recovery never sends an email and normalizes the address', async () => {
  const { api, sent, checked } = service('google');
  assert.equal(await api.resetPassword({ email: ' USER@example.com ' }), 'google');
  assert.deepEqual(sent, []);
  assert.deepEqual(checked, ['user@example.com']);
});
test('password and unknown accounts retain the existing recovery call', async () => {
  const { api, sent } = service('email');
  assert.equal(await api.resetPassword({ email: 'user@example.com' }), 'email');
  assert.deepEqual(sent, ['user@example.com']);
});
test('lookup failure fails closed without sending a recovery link', async () => {
  const { api, sent } = service('email', Error('unavailable'));
  await assert.rejects(api.resetPassword({ email: 'user@example.com' }), /unavailable/);
  assert.deepEqual(sent, []);
});
function edge(route, error = null) {
  let handler;
  const calls = [];
  load('supabase/functions/password-recovery-route/index.ts', {
    'https://esm.sh/@supabase/supabase-js@2': { createClient: () => ({ rpc: async (name, args) => { calls.push({ name, args }); return { data: route, error }; } }) },
  }, { Request, Response, Deno: { env: { get: () => 'test' }, serve: (fn) => { handler = fn; } } });
  return { handler, calls };
}
test('recovery endpoint trusts the server decision, not caller provider flags', async () => {
  const { handler, calls } = edge('google');
  const response = await handler(new Request('https://test.invalid', { method: 'POST', body: JSON.stringify({ email: ' USER@example.com ', provider: 'email' }) }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { route: 'google' });
  assert.equal(calls[0].args.p_email, 'user@example.com');
});
test('invalid requests and rate limiting do not expose account information', async () => {
  const { handler, calls } = edge('rate_limited');
  assert.equal((await handler(new Request('https://test.invalid', { method: 'POST', body: '{}' }))).status, 400);
  assert.equal(calls.length, 0);
  assert.equal((await handler(new Request('https://test.invalid', { method: 'POST', body: JSON.stringify({ email: 'user@example.com' }) }))).status, 429);
});
