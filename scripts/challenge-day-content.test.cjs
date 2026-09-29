const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const mod = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync('src/lib/challengeDayContent.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText)(mod.exports);
const api = mod.exports;
const video = 'M7lc1UVf-VE';
test('normalizes watch, mobile, shortened, Shorts, embed and live YouTube links', () => {
  for (const url of [`https://www.youtube.com/watch?v=${video}&t=12`, `youtube.com/watch?v=${video}`, `https://m.youtube.com/watch?v=${video}`, `https://youtu.be/${video}?si=x`, `https://youtube.com/shorts/${video}`, `https://youtube.com/embed/${video}`, `https://youtube.com/live/${video}`]) {
    assert.equal(api.parseDayLink(url).youtubeId, video);
    assert.equal(api.parseDayLink(url).url, `https://www.youtube.com/watch?v=${video}`);
  }
});
test('rejects invalid YouTube IDs, playlists and unsafe URL schemes; does not treat lookalike domains as YouTube', () => {
  for (const url of ['https://youtube.com/watch?v=short', 'https://youtu.be/ABCDEFGHIJK/more', 'https://youtube.com/playlist?list=abc', 'javascript:alert(1)', 'file:///tmp/private', 'https://user:pass@example.com', '']) assert.throws(() => api.parseDayLink(url));
  assert.equal(api.parseDayLink(`https://youtube.com.evil.test/watch?v=${video}`).youtubeId, null);
});
test('validates file families and size boundaries', () => {
  assert.equal(api.validateDayFile('photo','image/jpeg',api.PHOTO_LIMIT).extension,'jpg');
  assert.equal(api.validateDayFile('audio','audio/webm;codecs=opus',api.AUDIO_LIMIT).extension,'webm');
  for (const [type,mime,size] of [['photo','image/jpeg',api.PHOTO_LIMIT+1],['audio','audio/mp4',0],['photo','audio/mp4',100],['audio','application/x-msdownload',100],['audio','audio/mp4',NaN]]) assert.throws(() => api.validateDayFile(type,mime,size));
});
test('reordering preserves items and does not mutate input', () => {
  const items = ['photo','audio','link'];
  assert.deepEqual(api.moveDayAttachment(items,2,-1),['photo','link','audio']);
  assert.deepEqual(items,['photo','audio','link']);
  assert.equal(api.moveDayAttachment(items,0,-1),items);
});
test('publishes references only and preserves ordered content', () => {
  const items = [{id:'photo',type:'photo',name:'Foto',path:'private/path',mime:'image/jpeg',size:100,localUri:'file://private',error:'error'}, {id:'link',type:'link',name:'YouTube',url:`https://youtu.be/${video}`}];
  const persisted = api.persistedAttachments(items);
  assert.equal(persisted[0].path,'private/path');
  assert.equal('localUri' in persisted[0],false);
  assert.equal('error' in persisted[0],false);
  assert.equal(persisted[1].url,`https://www.youtube.com/watch?v=${video}`);
});
test('draft limits, required title and missing local files are enforced without discarding draft', () => {
  const draft = {challenge_id:'challenge', day:1, revision:0, title:'Día uno', description:'Respirá', attachments:[]};
  api.validateDayDraft(draft);
  assert.throws(() => api.validateDayDraft({...draft,title:' '}));
  assert.throws(() => api.validateDayDraft({...draft,description:'x'.repeat(10001)}));
  assert.throws(() => api.validateDayDraft({...draft,attachments:[{id:'1',type:'photo',mime:'image/jpeg',size:100}]}));
  assert.equal(draft.description,'Respirá');
});

test('shared content appears on every day alongside its specific content without copying attachments', () => {
  const shared = { challenge_id: 'a', day: 0, title: 'Todos los días', description: 'Respirá', attachments: [{ id: 'audio', type: 'audio', path: 'a/0/owner/audio.mp3' }], revision: 1 };
  const first = { ...shared, day: 1, title: 'Día 1', description: 'Observá', attachments: [] };
  const second = { ...first, day: 2, title: 'Día 2', description: 'Escuchá' };
  const contents = [second, shared, first];
  assert.deepEqual(api.getChallengeContentForDay(contents, 1), [shared, first]);
  assert.deepEqual(api.getChallengeContentForDay(contents, 2), [shared, second]);
  assert.deepEqual(api.getChallengeContentForDay(contents, 3), [shared]);
  assert.deepEqual(api.getChallengeContentForDay(contents, 0), [shared]);
  assert.equal(api.getChallengeContentForDay(contents, 2)[0].attachments, shared.attachments);
  assert.equal(contents.length, 3);
});
test('empty shared content can be cleared without hiding or replacing a daily assignment', () => {
  const empty = { challenge_id: 'a', day: 0, title: 'Todos los días', description: '', attachments: [], revision: 2 };
  const daily = { ...empty, day: 1, title: 'Mi consigna' };
  assert.deepEqual(api.getChallengeContentForDay([empty, daily], 1), [daily]);
  assert.deepEqual(api.getChallengeContentForDay([empty], 2), []);
  assert.deepEqual(api.getChallengeContentForDay([], 1), []);
  assert.equal(api.getChallengeContentLabel(0), 'Todos los días');
  api.validateDayDraft(empty);
});
