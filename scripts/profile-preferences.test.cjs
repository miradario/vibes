const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(js, { exports, require: name => dependencies[name], Date });
  return exports;
}
function questions(supabase) {
  return load('src/lib/profileQuestions.ts', { './supabase': { supabase }, './moderation': { assertAcceptableContent() {} } });
}
const q = questions({});
const { getProfileCompletion } = load('src/lib/profileCompletion.ts', { './profileQuestions': q });
test('completion ignores whitespace, empty photos and private fields', () => {
  const result = getProfileCompletion({ displayName: ' ', photos: [{ url: '' }] }, { profileAnswers: { availability: 'martes', moods: ['Calmado'] } });
  assert.equal(result.percent, 0);
  assert.equal(result.nextScreen, 'EditProfile');
});
test('all public onboarding fields reach 100% without availability, extra photos or practice details', () => {
  const answers = Object.fromEntries(q.QUESTION_GROUPS.flatMap(g => g.fields).filter(f => f.key !== 'availability').map(f => [f.key, 'respuesta']));
  const profile = { displayName: 'Nombre Completo', photos: [{ url: 'photo.jpg' }], locationLabel: 'Rosario' };
  const prefs = { ...answers, profileAnswers: answers, aboutMe: 'Hola', openTo: ['Amistad'], spiritualPath: ['Yoga'] };
  assert.equal(getProfileCompletion(profile, prefs).percent, 100);
  prefs.gender = '';
  const next = getProfileCompletion(profile, prefs);
  assert.equal(next.completed, next.total - 1);
  assert.equal(next.nextScreen, 'ProfileQuestions');
});
test('editing or clearing canonical preferences overrides stale onboarding JSON on next read', async () => {
  const api = questions({ from: table => ({ select() { return this; }, eq() { return this; }, async maybeSingle() {
    return { error: null, data: table === 'private_user_state' ? { availability: 'Solo yo' } : {
      gender: 'Hombre', looking_for: [], personality: 'Extrovertido', languages: [],
      profile_answers: { gender: 'Mujer', lookingFor: ['Citas'], languages: ['Inglés'], hobbies: ['Arte'] },
    } };
  } }) });
  const result = await api.readProfileAnswers('test');
  assert.equal(result.gender, 'Hombre');
  assert.equal(result.lookingFor.length, 0);
  assert.equal(result.languages.length, 0);
  assert.equal(result.hobbies[0], 'Arte');
  assert.equal(result.availability, 'Solo yo');
});
test('saving optional answers preserves independent onboarding motivations', async () => {
  const writes = [];
  const api = questions({ from: table => ({ async upsert(payload) { writes.push({ table, payload }); return { error: null }; } }) });
  await api.saveProfileAnswers('test', { gender: 'Otro', lookingFor: ['Citas'], availability: 'martes' });
  const publicWrite = writes.find(w => w.table === 'user_preferences').payload;
  assert.equal('open_to' in publicWrite, false);
  assert.equal('availability' in publicWrite.profile_answers, false);
  assert.equal(publicWrite.looking_for[0], 'Citas');
});
