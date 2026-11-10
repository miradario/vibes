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
  path: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/resources/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/de000000-0000-4000-8000-000000000001.jpg',
  mime: 'image/jpeg',
  size: 100,
};
const audio = {
  id: 'de000000-0000-4000-8000-000000000002',
  type: 'audio',
  name: 'Guía.m4a',
  path: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/resources/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/de000000-0000-4000-8000-000000000002.m4a',
  mime: 'audio/mp4',
  size: 200,
};
const link = {
  id: 'de000000-0000-4000-8000-000000000003',
  type: 'link',
  name: 'youtube.com',
  url: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
};

test('resource drafts validate attachments without requiring a title', () => {
  api.validateResourceDraft([]);
  api.validateResourceDraft([photo, audio, link]);
  assert.throws(() => api.validateResourceDraft([{ ...photo, path: undefined, localUri: undefined }]));
  assert.throws(() => api.validateResourceDraft([photo, photo]));
  assert.throws(() => api.validateResourceDraft(Array.from({ length: 21 }, (_, i) => ({
    ...link,
    id: `de000000-0000-4000-8000-0000000000${String(i).padStart(2, '0')}`,
  }))));
});

test('resource storage paths use a challenge-level prefix, not a day number', () => {
  const path = api.resourceMediaPath(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'de000000-0000-4000-8000-000000000001',
    'jpg'
  );
  assert.equal(path, photo.path);
  assert.equal(api.isResourceMediaPath(path), true);
  assert.equal(api.isResourceMediaPath('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/1/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/de000000-0000-4000-8000-000000000001.jpg'), false);
  assert.equal(api.fileExtensionFromPath(path), 'jpg');
});

test('restart copy keeps link order and substitutes successfully copied media', () => {
  const copiedPhoto = {
    id: 'de000000-0000-4000-8000-000000000011',
    type: 'photo',
    name: 'Portada.jpg',
    path: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc/resources/dddddddd-dddd-4ddd-8ddd-dddddddddddd/de000000-0000-4000-8000-000000000011.jpg',
    mime: 'image/jpeg',
    size: 100,
  };
  const source = [photo, link, audio];
  const merged = api.buildRestartAttachments(source, new Set([link.id]), [copiedPhoto]);
  assert.deepEqual(merged.map((item) => item.type), ['photo', 'link']);
  assert.equal(merged[0].path, copiedPhoto.path);
  assert.equal(merged[1].id, link.id);
  assert.equal(api.buildRestartAttachments(source, new Set([link.id]), []).map((item) => item.type).join(), 'link');
});

test('migration copies resource links in restart_challenge and leaves day media copy unchanged', () => {
  const sql = fs.readFileSync('supabase/migrations/20261110200000_challenge_resources.sql', 'utf8');
  assert.match(sql, /save_challenge_resources/);
  assert.match(sql, /split_part\(attachment_path, '\/', 2\) <> 'resources'/);
  const restart = sql.slice(sql.lastIndexOf('create or replace function private.restart_challenge'));
  assert.match(restart, /insert into public\.challenge_days/);
  assert.match(restart, /insert into public\.challenge_resources/);
  const dayCopy = restart.slice(
    restart.indexOf('insert into public.challenge_days'),
    restart.indexOf('from public.challenge_days')
  );
  assert.match(dayCopy, /a->>'type' = 'link'/);
  assert.doesNotMatch(dayCopy, /type <> 'link'/);
  const resourceCopy = restart.slice(restart.indexOf('insert into public.challenge_resources'));
  assert.match(resourceCopy, /a->>'type' = 'link'/);
});
