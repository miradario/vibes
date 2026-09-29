const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function mutation(updateResponse) {
  const calls = [];
  const supabase = { from(table) {
    let operation = 'select';
    const query = {
      select() { return query; },
      eq(key, value) { calls.push([table, 'eq', key, value]); return query; },
      insert(value) { operation = 'insert'; calls.push([table, operation, value]); return query; },
      update(value) { operation = 'update'; calls.push([table, operation, value]); return query; },
      single() { return Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate' } }); },
      maybeSingle() {
        if (table === 'profiles') return Promise.resolve({ data: { id: 'me' }, error: null });
        if (operation === 'update') return Promise.resolve(updateResponse);
        return Promise.resolve({ data: null, error: null });
      },
    };
    return query;
  }};
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/queries/swipes.mutations.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText, { exports, setTimeout, clearTimeout, require(name) {
    if (name === '@tanstack/react-query') return { useQueryClient: () => ({}), useMutation: (options) => options };
    if (name === '../auth/auth.queries') return { useAuthSession: () => ({ data: { user: { id: 'me' } } }) };
    if (name === '../lib/supabase') return { supabase };
    if (name === 'react-native') return { Platform: { OS: 'web' } };
    return {};
  }});
  return { fn: exports.useSwipeMutation().mutationFn, calls };
}
test('reconnecting a discarded profile updates the original decision to like', async () => {
  const { fn, calls } = mutation({ data: { id: 'old-swipe', direction: 'like' }, error: null });
  const result = await fn({ targetUserId: 'other', direction: 'like' });
  assert.equal(result.swipeId, 'old-swipe');
  assert.equal(result.match, false);
  assert.equal(calls.find(([table, op]) => table === 'swipes' && op === 'update')[2].direction, 'like');
  assert.ok(calls.some(([table, op, key, value]) => table === 'swipes' && key === 'swiper_id' && value === 'me'));
  assert.ok(calls.some(([table, op, key, value]) => table === 'swipes' && key === 'target_id' && value === 'other'));
});
test('an invisible or blocked update never reports a saved connection', async () => {
  const { fn } = mutation({ data: null, error: null });
  await assert.rejects(fn({ targetUserId: 'other', direction: 'like' }), /No se pudo actualizar tu decisión anterior/);
});
test('database errors are preserved instead of treating missing data as success', async () => {
  const { fn } = mutation({ data: null, error: { message: 'permission denied' } });
  await assert.rejects(fn({ targetUserId: 'other', direction: 'like' }), /permission denied/);
});
