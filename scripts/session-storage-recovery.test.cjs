const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, deps = {}) {
  const module = { exports: {} };
  new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(module, module.exports, name => deps[name]);
  return module.exports;
}
const { createRecoveryStorage } = load('src/auth/recoveryStorage.ts');
test('session reset drains in-flight writes, blocks late session resurrection and preserves unrelated data', async () => {
  const data = new Map([['auth','old'],['auth-code-verifier','code'],['auth-user','user'],['language','es'],['user_preferences:1','preferences']]);
  let finish;
  const storage = {
    getItem: async key => data.get(key) ?? null,
    setItem: (key, value) => new Promise(resolve => { finish = () => { data.set(key,value); resolve(); }; }),
    removeItem: async key => { data.delete(key); },
    multiRemove: async keys => keys.forEach(key => data.delete(key)),
  };
  const recovery = createRecoveryStorage(storage,'auth');
  const write = recovery.adapter.setItem('auth','in-flight');
  const reset = recovery.reset();
  assert.equal(await recovery.adapter.getItem('auth'),null);
  await recovery.adapter.setItem('auth','late');
  finish(); await write; await reset;
  assert.equal(data.has('auth'),false);
  assert.equal(data.has('auth-code-verifier'),false);
  assert.equal(data.has('auth-user'),false);
  assert.equal(data.get('language'),'es');
  assert.equal(data.get('user_preferences:1'),'preferences');
});
test('a reset failure is reported and remains retryable', async () => {
  let fail = true;
  const recovery = createRecoveryStorage({ getItem: async () => 'old', setItem: async () => {}, removeItem: async () => {}, multiRemove: async () => { if(fail) throw Error('storage'); } },'auth');
  await assert.rejects(recovery.reset(),/storage/);
  fail = false; await recovery.reset();
});
test('malformed fallback preferences recover without clearing a valid session', async () => {
  const removed = [];
  const { getUserPreferences } = load('src/lib/userPreferencesStore.ts', {
    '@react-native-async-storage/async-storage': { default: { getItem: async () => '{bad', removeItem: async key => removed.push(key) } },
    './supabase': { supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ error: { message: "could not find the table 'public.user_preferences'" } }) }) }) }) } },
    '../api/mappers/userPreferences.mapper': { mapUserPreferencesRow: value => value },
  });
  assert.equal(await getUserPreferences('user-1'),null);
  assert.deepEqual(removed,['user_preferences:user-1']);
});
