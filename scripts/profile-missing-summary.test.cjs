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
const q = load('src/lib/profileQuestionOptions.ts');
const { getProfileCompletion, summarizeMissing } = load('src/lib/profileCompletion.ts', { './profileQuestions': q });
const allAnswers = Object.fromEntries(q.QUESTION_GROUPS.flatMap(g => g.fields.map(f => [f.key, 'x'])));
const profile = { photos: ['a.jpg'], displayName: 'Ana', locationLabel: 'BA', birthDate: '1990-01-01' };
const prefs = { aboutMe: 'Bio', openTo: ['Eventos'], spiritualPath: ['Yoga'] };

test('summary joins with commas and "y" and pluralizes photos', () => {
  assert.equal(summarizeMissing([{ group: 'photos' }]), '1 foto');
  assert.equal(summarizeMissing([{ group: 'interests' }, { group: 'photos' }, { group: 'email' }, { group: 'photos' }]), '2 fotos, validar email y completar intereses');
  assert.equal(summarizeMissing([{ group: 'email' }, { group: 'basics' }]), 'validar email y completar datos básicos');
  assert.equal(summarizeMissing([]), '');
});
test('summary stays short with more than three items', () => {
  assert.equal(summarizeMissing(['photos', 'email', 'basics', 'plans'].map(group => ({ group }))), '1 foto, validar email, completar datos básicos y más');
});
test('summary is empty exactly at 100%', () => {
  const full = getProfileCompletion(profile, prefs, true, allAnswers);
  assert.equal(full.percent, 100);
  assert.equal(full.missingSummary, '');
});
test('summary comes from the same fields as the percent', () => {
  const noPhotoNoEmail = getProfileCompletion({ ...profile, photos: [] }, prefs, false, allAnswers);
  assert.ok(noPhotoNoEmail.percent < 100);
  assert.equal(noPhotoNoEmail.missingSummary, '1 foto y validar email');
  const hobbies = getProfileCompletion(profile, prefs, true, { ...allAnswers, hobbies: [] });
  assert.ok(hobbies.percent < 100);
  assert.equal(hobbies.missingSummary, 'completar intereses');
  const plans = getProfileCompletion(profile, prefs, true, { ...allAnswers, idealPlan: '' });
  assert.equal(plans.missingSummary, 'completar planes');
});
