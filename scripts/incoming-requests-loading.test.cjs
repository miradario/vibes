const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const compile = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
function load({ stalled = false, matched = false } = {}) {
  const api = {}, boot = {}, calls = [];
  vm.runInNewContext(compile('src/lib/startupBoot.ts'), {
    exports: boot, setTimeout: fn => setTimeout(fn, 10), clearTimeout,
  });
  const supabase = { from(table) {
    const call = { table, filters: [] }; calls.push(call);
    const result = () => {
      if (stalled) return new Promise(() => {});
      const data = table === 'swipes' ? [{ swiper_id: 'sender' }]
        : table === 'matches' && matched ? [{ user1_id: 'viewer', user2_id: 'sender' }]
        : table === 'profiles' ? (call.single ? { id: 'viewer' } : [{ id: 'sender', is_active: true }]) : [];
      return Promise.resolve({ data, error: null });
    };
    const query = { then(resolve, reject) { return result().then(resolve, reject); },
      maybeSingle() { call.single = true; return this; } };
    for (const key of ['select', 'eq', 'or', 'order', 'is', 'neq', 'not', 'limit', 'in', 'gt'])
      query[key] = (...args) => { call.filters.push([key, ...args]); return query; };
    return query;
  } };
  vm.runInNewContext(compile('src/queries/candidates.queries.ts'), {
    exports: api,
    require: name => {
      if (name.endsWith('/startupBoot')) return boot;
      if (name.endsWith('/supabase')) return { supabase };
      if (name === '@tanstack/react-query') return { useQuery: options => options };
      if (name.endsWith('/auth.queries')) return { useAuthSession: () => ({ data: { user: { id: 'viewer' } } }) };
      if (name.endsWith('/case.mapper')) return { mapSupabaseSelect: rows => rows };
      if (name.endsWith('/profilePhotos')) return { hasProfilePhotos: () => false, comparePhotoPriority: () => 0 };
      if (name.endsWith('/zodiac')) return { zodiacFromBirthDate: () => null };
      return {};
    },
  });
  return { api, calls };
}
test('incoming requests retrieve the sender directly without fetching all outgoing swipes', async () => {
  const { api, calls } = load();
  const result = await api.useIncomingLikeCandidatesQuery().queryFn();
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'sender');
  assert.equal(calls.filter(call => call.table === 'swipes').length, 1);
  assert.ok(calls.some(call => call.table === 'profiles' && call.filters.some(([op, key, ids]) => op === 'in' && key === 'id' && ids[0] === 'sender')));
});
test('matched requests return empty without fetching profile photos', async () => {
  const { api, calls } = load({ matched: true });
  assert.equal((await api.useIncomingLikeCandidatesQuery().queryFn()).length, 0);
  assert.deepEqual(calls.map(call => call.table), ['swipes', 'matches']);
});
test('a stalled initial requests query rejects and inactive tabs do not auto-load', async () => {
  const { api } = load({ stalled: true });
  assert.equal(api.useIncomingLikeCandidatesQuery(false).enabled, false);
  assert.equal(api.useSwipeHistoryCandidatesQuery(false).enabled, false);
  assert.equal(api.useCandidatesQuery(undefined, false, false).enabled, false);
  await assert.rejects(api.useIncomingLikeCandidatesQuery().queryFn(), /No pudimos cargar las solicitudes/);
});
