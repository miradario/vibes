const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('stalled profile verification rejects the swipe instead of leaving it pending forever', async () => {
  const moduleExports = {};
  const tables = [];
  const query = { select() { return this; }, eq() { return this; }, maybeSingle: () => new Promise(() => {}) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/queries/swipes.mutations.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    exports: moduleExports, clearTimeout,
    setTimeout: (fn, ms) => { assert.equal(ms, 12000); return setTimeout(fn, 10); },
    require: name => {
      if (name === '@tanstack/react-query') return { useMutation: options => options, useQueryClient: () => ({}) };
      if (name.endsWith('/auth.queries')) return { useAuthSession: () => ({ data: { user: { id: 'fictional-user' } } }) };
      if (name.endsWith('/supabase')) return { supabase: { from: table => { tables.push(table); return query; } } };
      return {};
    },
  });
  const mutation = moduleExports.useSwipeMutation();
  await assert.rejects(mutation.mutationFn({ targetUserId: 'fictional-target', direction: 'like' }), /No se pudo verificar tu perfil/);
  assert.deepEqual(tables, ['profiles']);
});

test('connecting to yourself is rejected before any database request', async () => {
  const api = {};
  let databaseRequests = 0;
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/queries/swipes.mutations.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    exports: api,
    require: name => {
      if (name === '@tanstack/react-query') return { useMutation: options => options, useQueryClient: () => ({}) };
      if (name.endsWith('/auth.queries')) return { useAuthSession: () => ({ data: { user: { id: 'self' } } }) };
      if (name.endsWith('/supabase')) return { supabase: { from() { databaseRequests++; throw new Error('Unexpected request'); } } };
      return {};
    },
  });
  await assert.rejects(api.useSwipeMutation().mutationFn({ targetUserId: 'self', direction: 'like' }), /tu propio perfil/);
  assert.equal(databaseRequests, 0);
});
