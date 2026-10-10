const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function fixture(os, result) {
 const calls = [], exchanges = [], api = {};
 const deps = {
  'expo-web-browser': { maybeCompleteAuthSession() {}, openAuthSessionAsync: async (...args) => { calls.push(args); return result; } },
  'expo-linking': { createURL: (path) => `com.gurudevelopers.vibes://${path}` },
  'react-native': { Platform: { OS: os } },
  'expo-apple-authentication': {},
  '../lib/supabase': { supabase: { auth: {
   signInWithOAuth: async () => ({ data: { url: 'https://example.com/oauth' } }),
   exchangeCodeForSession: async (code) => { exchanges.push(code); return { data: { session: { token: 'test' } } }; },
  } } },
  './session.recovery': {},
  '../theme/vibesTheme': { vibesTheme: { colors: { background: '#FEFEFD', primaryText: '#2B2B2B' } } },
 };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/auth/supabaseAuth.client.ts', 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, {exports: api, require: name => { if (!(name in deps)) throw Error(name); return deps[name]; }, process: {env: {}}, URL, console});
 return {api, calls, exchanges};
}
test('Android browser receives concrete color values and exchanges the callback code', async () => {
 const f = fixture('android', {type: 'success', url: 'com.gurudevelopers.vibes://auth-callback?code=test-code'});
 assert.equal((await f.api.signInWithGoogle()).token, 'test');
 const [url, redirect, options] = f.calls[0];
 assert.equal(url, 'https://example.com/oauth');
 assert.equal(redirect, 'com.gurudevelopers.vibes://auth-callback');
 for (const key of ['toolbarColor', 'secondaryToolbarColor', 'controlsColor']) assert.match(options[key], /^#[0-9A-F]{6}$/);
 assert.deepEqual(f.exchanges, ['test-code']);
});
test('iOS retains native auth session options and cancellation creates no session', async () => {
 const f = fixture('ios', {type: 'cancel'});
 assert.equal(await f.api.signInWithGoogle(), null);
 assert.equal(f.calls[0][2], undefined);
 assert.deepEqual(f.exchanges, []);
});
test('OAuth callback errors do not exchange a code', async () => {
 const f = fixture('android', {type: 'success', url: 'com.gurudevelopers.vibes://auth-callback?error=access_denied'});
 await assert.rejects(f.api.signInWithGoogle(), /access_denied/);
 assert.deepEqual(f.exchanges, []);
});
