const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(js, { exports, require: name => { if (!(name in dependencies)) throw Error(name); return dependencies[name]; }, Date });
  return exports;
}
const policy = load('src/auth/passwordPolicy.ts');
test('password requires eight characters and an uppercase letter, including Spanish letters', () => {
  for (const value of ['Abcdefg', 'abcdefgh', '12345678', '']) assert.equal(policy.isValidPassword(value), false);
  for (const value of ['Abcdefgh', 'Contraseña1', 'ñandúÑ12']) assert.equal(policy.isValidPassword(value), true);
});
test('email format validation rejects whitespace and missing domain', () => {
  for (const value of ['a', 'a@', 'a@b', 'a b@c.com', 'a@@b.com']) assert.equal(policy.isValidEmail(value), false);
  assert.equal(policy.isValidEmail('  user+test@example.com  '), true);
});
function questions(supabase) { return load('src/lib/profileQuestions.ts', { './supabase': { supabase }, './moderation': { assertAcceptableContent() {} } }); }
test('private availability never reaches public profile answers; mood columns are preserved', async () => {
  const writes = [];
  const api = questions({ from: table => ({ upsert: async payload => { writes.push({ table, payload }); return { error: null }; } }) });
  await api.saveProfileAnswers('user-a', { availability: 'martes 19h', gender: 'Mujer', lookingFor: ['Amistad', 'Citas'], hobbies: ['Arte'] });
  assert.equal(writes[0].table, 'private_user_state');
  assert.equal(writes[0].payload.availability, 'martes 19h');
  assert.equal('moods' in writes[0].payload, false);
  assert.equal('availability' in writes[1].payload.profile_answers, false);
  assert.deepEqual(writes[1].payload.looking_for, ['Amistad', 'Citas']);
});
test('failed private persistence is reported and does not continue with public write', async () => {
  let calls = 0;
  const api = questions({ from: () => ({ upsert: async () => { calls++; return { error: new Error('denied') }; } }) });
  await assert.rejects(api.saveProfileAnswers('user-a', {}), /denied/);
  assert.equal(calls, 1);
});
test('omitted gender stays empty and never gets assigned Otro', async () => {
  const writes = [];
  const api = questions({ from: () => ({ upsert: async payload => { writes.push(payload); return { error: null }; } }) });
  await api.saveProfileAnswers('user-a', {});
  assert.equal(writes[1].gender, null);
});
test('local day key changes at local midnight, with stable zero padding', () => {
  const api = questions({});
  assert.equal(api.localDayKey(new Date(2026, 8, 18, 23, 59)), '2026-09-18');
  assert.equal(api.localDayKey(new Date(2026, 8, 19, 0, 0)), '2026-09-19');
});
test('optional profile prompt reflects missing fields and respects complete answers', () => {
  const api = questions({});
  assert.equal(api.hasMissingProfileAnswers({}), true);
  const complete = Object.fromEntries(api.QUESTION_GROUPS.flatMap(group => group.fields.map(field => [field.key, 'respuesta'])));
  assert.equal(api.hasMissingProfileAnswers(complete), false);
});

test('auto-confirmation and editable user metadata never count as verified email ownership', () => {
  const api = load('src/auth/emailVerification.ts', { '../lib/supabase': { supabase: {} } });
  assert.equal(api.isEmailOwnershipVerified({ email: 'person@example.com', app_metadata: {}, email_confirmed_at: '2026-09-18', user_metadata: { email_verified: true } }), false);
  assert.equal(api.isEmailOwnershipVerified({ email: 'person@example.com', app_metadata: { vibes_verified_email: 'person@example.com', vibes_email_verified_at: '2026-09-18' } }), true);
  assert.equal(api.isEmailOwnershipVerified({ email: 'new@example.com', app_metadata: { vibes_verified_email: 'old@example.com', vibes_email_verified_at: '2026-09-18' } }), false);
});

function edgeHandler(verifyResult) {
  let handler;
  const calls = [];
  const code = ts.transpileModule(fs.readFileSync('supabase/functions/verify-email-ownership/index.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, {
    exports: {}, Response, Request, Date,
    Deno: { env: { get: key => ({ SUPABASE_URL: 'https://example.test', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' })[key] }, serve: fn => { handler = fn; } },
    require: () => ({ createClient: (_url, key) => ({ auth: {
      verifyOtp: async args => { calls.push({ action: 'verify', args, key }); return verifyResult; },
      admin: { updateUserById: async (id, args) => { calls.push({ action: 'update', id, args, key }); return { error: null }; } },
    } }) }),
  });
  return { handler, calls };
}
test('email edge rejects an invalid/expired token without setting verification', async () => {
  const { handler, calls } = edgeHandler({ error: new Error('expired'), data: {} });
  const result = await handler(new Request('https://example.test', { method: 'POST', body: JSON.stringify({ token_hash: 'a'.repeat(56) }) }));
  assert.equal(result.status, 400);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].args.type, 'email');
});
test('email edge uses only the identity proven by Supabase, never the caller-supplied email/user id', async () => {
  const { handler, calls } = edgeHandler({ error: null, data: { user: { id: 'proven-user', email: 'proven@example.com' }, session: { access_token: 'access', refresh_token: 'refresh' } } });
  const result = await handler(new Request('https://example.test', { method: 'POST', body: JSON.stringify({ token_hash: 'a'.repeat(56), userId: 'victim', email: 'victim@example.com', verified: true }) }));
  assert.equal(result.status, 200);
  assert.equal(calls[1].id, 'proven-user');
  assert.equal(calls[1].args.app_metadata.vibes_verified_email, 'proven@example.com');
  assert.equal(calls[1].key, 'service');
  assert.equal(result.headers.get('cache-control'), 'no-store');
});
test('email edge requires a token even when the request claims a verified user', async () => {
  const { handler, calls } = edgeHandler({});
  const result = await handler(new Request('https://example.test', { method: 'POST', body: JSON.stringify({ verified: true, userId: 'victim' }) }));
  assert.equal(result.status, 400);
  assert.equal(calls.length, 0);
});
test('email edge rejects a null JSON body without calling Auth', async () => {
  const { handler, calls } = edgeHandler({});
  const result = await handler(new Request('https://example.test', { method: 'POST', body: 'null' }));
  assert.equal(result.status, 400);
  assert.equal(calls.length, 0);
});
