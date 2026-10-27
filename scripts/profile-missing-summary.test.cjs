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
const { getProfileCompletion, summarizeMissing, nextProfileParams } = load('src/lib/profileCompletion.ts', { './profileQuestions': q });
const allAnswers = Object.fromEntries(q.QUESTION_GROUPS.flatMap(g => g.fields.map(f => [f.key, 'x'])));
const profile = { photos: ['a.jpg'], displayName: 'Ana', locationLabel: 'BA', birthDate: '1990-01-01' };
const prefs = { aboutMe: 'Bio', openTo: ['Eventos'], spiritualPath: ['Yoga'] };

test('summary joins with commas and "y" and pluralizes photos', () => {
  assert.equal(summarizeMissing([{ group: 'photos' }]), '1 foto');
  assert.equal(summarizeMissing([{ group: 'interests' }, { group: 'photos' }, { group: 'email' }, { group: 'photos' }]), '2 fotos, validar email y más');
  assert.equal(summarizeMissing([{ group: 'email' }, { group: 'basics' }]), 'validar email y datos básicos');
  assert.equal(summarizeMissing([]), '');
});
test('summary stays short with more than three items', () => {
  assert.equal(summarizeMissing(['photos', 'email', 'basics', 'plans'].map(group => ({ group }))), '1 foto, validar email y más');
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
  assert.equal(hobbies.missingSummary, 'intereses');
  const plans = getProfileCompletion(profile, prefs, true, { ...allAnswers, favoritePlans: [] });
  assert.ok(plans.percent < 100);
  assert.equal(plans.missingSummary, 'planes');
});
test('FTUX mode: email excluded from percent but kept in summary', () => {
  const ftux = getProfileCompletion(profile, prefs, false, allAnswers, { emailCountsInPercent: false });
  assert.equal(ftux.percent, 100);
  assert.equal(ftux.nextLabel, undefined);
  assert.equal(ftux.missingSummary, 'validar email');
  const counted = getProfileCompletion(profile, prefs, false, allAnswers);
  assert.ok(counted.percent < 100);
  assert.equal(counted.total, ftux.total + 1);
  const verified = getProfileCompletion(profile, prefs, true, allAnswers, { emailCountsInPercent: false });
  assert.equal(verified.missingSummary, '');
  const noPhoto = getProfileCompletion({ ...profile, photos: [] }, prefs, false, allAnswers, { emailCountsInPercent: false });
  assert.equal(noPhoto.missingSummary, '1 foto y validar email');
  assert.equal(noPhoto.percent, 60);
});
test('the three Sobre mí steps are separate items: identidad, intereses, planes', () => {
  assert.equal(getProfileCompletion(profile, { ...prefs, aboutMe: '' }, true, { ...allAnswers, gender: '' }).missingSummary, 'identidad');
  assert.equal(getProfileCompletion(profile, { ...prefs, spiritualPath: [] }, true, allAnswers).missingSummary, 'intereses');
  assert.equal(getProfileCompletion(profile, { ...prefs, openTo: [] }, true, allAnswers).missingSummary, 'planes');
  assert.equal(getProfileCompletion(profile, prefs, true, { ...allAnswers, diet: '', languages: [], favoritePlans: [] }).missingSummary, 'identidad, intereses y más');
  assert.equal(summarizeMissing(['plans', 'interests', 'identity', 'basics'].map(group => ({ group }))), 'datos básicos, identidad y más');
});
test('next screen follows summary order, including email outside the percent', () => {
  const photo = getProfileCompletion({ ...profile, photos: [] }, { ...prefs, aboutMe: '' }, false, allAnswers);
  assert.equal(photo.nextScreen, 'EditProfile');
  assert.equal(photo.nextOpensPhotoPicker, true);
  assert.deepEqual({ ...nextProfileParams(photo, 5) }, { photoRequestId: 5 });
  const email = getProfileCompletion(profile, prefs, false, { ...allAnswers, hobbies: [] }, { emailCountsInPercent: false });
  assert.equal(email.nextScreen, 'EditProfile');
  assert.equal(email.nextOpensPhotoPicker, false);
  assert.equal(nextProfileParams(email), undefined);
  const onlyEmail = getProfileCompletion(profile, prefs, false, allAnswers, { emailCountsInPercent: false });
  assert.equal(onlyEmail.percent, 100);
  assert.equal(onlyEmail.nextScreen, 'EditProfile');
  assert.equal(getProfileCompletion({ ...profile, birthDate: '' }, { ...prefs, aboutMe: '' }, true, allAnswers).nextScreen, 'EditProfile');
  const identity = getProfileCompletion(profile, { ...prefs, aboutMe: '' }, true, allAnswers);
  assert.equal(identity.nextScreen, 'ProfileQuestions');
  assert.deepEqual({ ...nextProfileParams(identity) }, { initialGroup: 0 });
  const interests = getProfileCompletion(profile, prefs, true, { ...allAnswers, pets: '', favoritePlans: [] });
  assert.deepEqual({ ...nextProfileParams(interests) }, { initialGroup: 1 });
  const plans = getProfileCompletion(profile, prefs, true, { ...allAnswers, favoritePlans: [] });
  assert.equal(plans.nextScreen, 'ProfileQuestions');
  assert.deepEqual({ ...nextProfileParams(plans) }, { initialGroup: 2 });
});
test('questions hidden in ProfileQuestions never count as missing', () => {
  const hidden = getProfileCompletion(profile, prefs, true, { ...allAnswers, idealPlan: '', talkAbout: '', trySomething: '', habits: '', lookingFor: [] });
  assert.equal(hidden.percent, 100);
  assert.equal(hidden.missingSummary, '');
});
