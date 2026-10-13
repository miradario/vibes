const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const moduleExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/authFetch.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: moduleExports, URL, AbortController, setTimeout, clearTimeout });
const { createAuthFetch } = moduleExports;
const authUrl = 'https://example.test/auth/v1/token';

test('stalled session refresh is cancelled even if native fetch never settles, then retry succeeds', async () => {
  let first = true, signal;
  const response = new Response('{}');
  const fetchAuth = createAuthFetch((_input, init) => {
    if (first) { first = false; signal = init.signal; return new Promise(() => {}); }
    return Promise.resolve(response);
  }, 10);
  await assert.rejects(fetchAuth(authUrl), { name: 'AbortError' });
  assert.equal(signal.aborted, true);
  assert.equal(await fetchAuth(authUrl), response);
});
test('existing caller cancellation is preserved', async () => {
  const controller = new AbortController();
  const request = createAuthFetch(() => new Promise(() => {}), 100)(authUrl, { signal: controller.signal });
  controller.abort();
  await assert.rejects(request, { name: 'AbortError' });
});
test('database and photo uploads retain their original transport and options', async () => {
  const options = { method: 'POST', body: 'photo' };
  const response = new Response('{}');
  const fetchAuth = createAuthFetch((input, init) => {
    assert.equal(init, options);
    return Promise.resolve(response);
  }, 1);
  assert.equal(await fetchAuth('https://example.test/storage/v1/object/photo', options), response);
});
test('auth HTTP failures are passed to the SDK unchanged', async () => {
  const response = new Response('{}', { status: 401 });
  assert.equal(await createAuthFetch(() => Promise.resolve(response))(authUrl), response);
});

test('real Supabase client reopens an expired saved session after a stalled refresh', async () => {
  const { createClient } = require('@supabase/supabase-js');
  const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', app_metadata: {}, user_metadata: {} };
  const expiry = Math.floor(Date.now() / 1000) + 3600;
  const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({ exp: expiry, sub: user.id })).toString('base64url')}.test`;
  const saved = JSON.stringify({ access_token: token, refresh_token: 'fictional-refresh', expires_at: expiry - 7200, expires_in: 3600, token_type: 'bearer', user });
  const storage = new Map([['reopen-test', saved]]);
  let calls = 0;
  const client = createClient('https://example.test', 'fictional-key', {
    auth: {
      storageKey: 'reopen-test', autoRefreshToken: false, detectSessionInUrl: false,
      storage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    },
    global: { fetch: createAuthFetch(() => {
      calls += 1;
      if (calls === 1) return new Promise(() => {});
      return Promise.resolve(new Response(JSON.stringify({ access_token: token, refresh_token: 'fictional-new-refresh', expires_in: 3600, token_type: 'bearer', user }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }, 10) },
  });
  const result = await client.auth.getSession();
  assert.equal(result.error, null);
  assert.equal(result.data.session.user.id, user.id);
  assert.equal(calls, 2);
  const reopened = await client.auth.getSession();
  assert.equal(reopened.data.session.user.id, user.id);
  assert.equal(calls, 2);
});
