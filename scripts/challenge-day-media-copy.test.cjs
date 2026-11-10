const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const mod = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync('src/lib/challengeDayContent.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText)(mod.exports);
const api = mod.exports;
const photo = {
  id: 'de000000-0000-4000-8000-000000000001',
  type: 'photo',
  name: 'Portada.jpg',
  path: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/1/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/de000000-0000-4000-8000-000000000001.jpg',
  mime: 'image/jpeg',
  size: 100,
};
const audio = {
  id: 'de000000-0000-4000-8000-000000000002',
  type: 'audio',
  name: 'Guía.m4a',
  path: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/1/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/de000000-0000-4000-8000-000000000002.m4a',
  mime: 'audio/mp4',
  size: 200,
};
const link = {
  id: 'de000000-0000-4000-8000-000000000003',
  type: 'link',
  name: 'youtube.com',
  url: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
};

test('restart copy keeps link order and substitutes successfully copied day media', () => {
  const copiedPhoto = {
    id: 'de000000-0000-4000-8000-000000000011',
    type: 'photo',
    name: 'Portada.jpg',
    path: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc/1/dddddddd-dddd-4ddd-8ddd-dddddddddddd/de000000-0000-4000-8000-000000000011.jpg',
    mime: 'image/jpeg',
    size: 100,
  };
  const source = [photo, link, audio];
  const merged = api.buildRestartAttachments(source, new Set([link.id]), [copiedPhoto]);
  assert.deepEqual(merged.map((item) => item.type), ['photo', 'link']);
  assert.equal(merged[0].path, copiedPhoto.path);
  assert.equal(merged[1].id, link.id);
  assert.deepEqual(
    api.buildRestartAttachments(source, new Set([link.id]), []).map((item) => item.type),
    ['link']
  );
  assert.equal(api.fileExtensionFromPath(photo.path), 'jpg');
});

test('migration grants copy-time file access without replacing challenge_day_media_access', () => {
  const sql = fs.readFileSync(
    'supabase/migrations/20261110220000_copy_day_media_on_restart.sql',
    'utf8'
  );
  assert.match(sql, /challenge_restart_copy_media_access/);
  assert.match(sql, /list_challenge_day_media_for_copy/);
  assert.match(sql, /or public\.challenge_restart_copy_media_access\(name\)/);
  assert.doesNotMatch(sql, /create or replace function public\.challenge_day_media_access/);
  assert.match(sql, /private\.can_restart_source/);
  assert.doesNotMatch(sql, /grant select on public\.challenge_days/);
});

test('copyDayMedia asks the copy RPC for source attachments instead of selecting challenge_days', () => {
  const source = fs.readFileSync('src/queries/challengeRestart.queries.ts', 'utf8');
  const fn = source.slice(
    source.indexOf('const copyDayMedia'),
    source.indexOf('export const useRestartChallengeMutation')
  );
  assert.match(fn, /list_challenge_day_media_for_copy/);
  assert.doesNotMatch(fn, /eq\(["']challenge_id["'],\s*sourceId\)/);
  assert.match(fn, /\.from\(["']challenge_days["']\)/);
  assert.match(fn, /eq\(["']challenge_id["'],\s*targetId\)/);
  assert.match(fn, /buildRestartAttachments/);
  assert.match(fn, /save_challenge_day/);
});
