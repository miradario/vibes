const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, requireModule) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, require: requireModule, Date });
  return exports;
}
const media = load('src/constants/challengeMediaPresets.ts', () => 1);
function setup(userId, ownerId = 'owner') {
  const updates = [];
  const touchedTables = [];
  const filters = [];
  const cacheWrites = [];
  const original = { id: 'challenge', created_by: ownerId, title: 'Original',
    duration_days: 40, participant_count: 3, visibility: 'private',
    image_url: 'https://example.com/cover.jpg',
    description: media.encodeChallengeDescriptionWithPreset('Original', null, '2026-09-01T12:00:00Z'),
  };
  const supabase = {
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: null }) },
    from(table) {
      touchedTables.push(table);
      let payload;
      let requestedOwner;
      return {
        select() { return this; },
        eq(key, value) { filters.push([key, value]); if (key === 'created_by') requestedOwner = value; return this; },
        update(value) { payload = value; updates.push(value); return this; },
        async single() {
          return requestedOwner === ownerId
            ? { data: { ...original, ...payload }, error: null }
            : { data: null, error: new Error('denied') };
        },
      };
    },
  };
  const api = load('src/queries/events.queries.ts', (name) => {
    if (name === '@tanstack/react-query') return {
      useMutation: value => value,
      useQueryClient: () => ({ setQueryData: (...args) => cacheWrites.push(args), invalidateQueries() {} }),
    };
    if (name === '../lib/supabase') return { supabase };
    if (name === '../constants/challengeMediaPresets') return media;
    if (name === '../lib/moderation') return { assertAcceptableContent() {} };
    return {};
  });
  return { mutation: api.useUpdateChallengeMutation(), updates, touchedTables, filters, original, cacheWrites };
}
const input = { id: 'challenge', createdBy: 'owner', title: 'Updated', subtitle: 'New description',
  description: 'New description', durationDays: 1, startsAt: '2030-01-01', visibility: 'public',
};
test('owner can change privacy without changing schedule or participant progress', async () => {
  const state = setup('owner');
  const result = await state.mutation.mutationFn(input);
  assert.equal(result.visibility, 'public');
  assert.equal(result.title, 'Updated');
  assert.equal(result.durationDays, 40);
  assert.equal(result.startsAt, '2026-09-01T12:00:00Z');
  assert.equal(state.updates.length, 1);
  assert.equal('duration_days' in state.updates[0], false);
  assert.equal('participant_count' in state.updates[0], false);
  assert.ok(state.touchedTables.every(table => table === 'challenges'));
  assert.equal(state.filters.filter(([key]) => key === 'created_by').length, 2);
  state.mutation.onSuccess(result, input);
  assert.equal(state.cacheWrites[0][0][0], 'challenge_deep_link');
});
test('signed-out users and mismatched identities cannot update', async () => {
  for (const user of [null, 'other']) {
    const state = setup(user);
    await assert.rejects(state.mutation.mutationFn(input), /creador/);
    assert.equal(state.updates.length, 0);
  }
});
test('claiming ownership does not bypass the owner filter', async () => {
  const state = setup('other');
  await assert.rejects(state.mutation.mutationFn({ ...input, createdBy: 'other' }), /permiso/);
  assert.equal(state.updates.length, 0);
});
