const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  const result = {}; cache.set(file, result);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports: result, require: name => load(path.resolve(path.dirname(file), name + '.ts')) });
  return result;
}
const { matchesSavedDiscoverExtras: matches } = load('src/lib/discoverSavedFilters.ts');
test('Home applies persisted multiple genders, diet, spiritual path and nationality together', () => {
  const preferences = {
    discover_genders: ['male', 'female'], discover_diets: ['vegetarian'],
    discover_spiritual_paths: ['Hatha'], discover_answer_filters: { nationalityCode: ['AR'] },
  };
  const profile = { vegetarian: 'Sí', spiritual_path: ['Hatha Yoga'], nationality_code: 'AR' };
  assert.equal(matches(profile, preferences, 'female'), true);
  assert.equal(matches(profile, preferences, 'unknown'), false);
  assert.equal(matches({ ...profile, vegetarian: 'No' }, preferences, 'female'), false);
  assert.equal(matches({ ...profile, spiritual_path: ['Ashtanga'] }, preferences, 'female'), false);
  assert.equal(matches({ ...profile, nationality_code: 'UY' }, preferences, 'female'), false);
});
test('empty saved filters allow profiles with incomplete answers', () => {
  assert.equal(matches({}, {}, 'unknown'), true);
});
const { DISCOVER_ANSWER_FILTER_FIELDS: fields, readDiscoverAnswerFilters: read } = load('src/lib/discoverFilterOptions.ts');
const { QUESTION_GROUPS } = load('src/lib/profileQuestionOptions.ts');
const { PURPOSE_OPTIONS, PRACTICE_OPTIONS } = load('src/screens/Onboarding/vibesOnboardingContent.ts');
test('filter choices match current profile questions exactly, without legacy duplicates', () => {
 const questions = QUESTION_GROUPS.flatMap(group=>group.fields);
 for(const field of fields.filter(field=>field.key!=='openTo')) {
  assert.deepEqual(field.options, questions.find(question=>question.key===field.key).options);
 }
 assert.deepEqual(fields.find(field=>field.key==='openTo').options, PURPOSE_OPTIONS.map(option=>option.label));
 assert.equal(new Set(fields.map(field=>field.key)).size,fields.length);
 for(const key of ['education','familyPlan','communicationStyle','lookingFor','habits']) assert.equal(fields.some(field=>field.key===key),false);
});
test('saved retired filters do not secretly exclude profiles on Home',()=>{
 assert.equal(matches({}, {discover_answer_filters:{education:['Universidad']}}, 'unknown'),true);
 assert.equal(matches({profileAnswers:{diet:'Vegana'}}, {discover_answer_filters:{diet:['Vegana']}}, 'unknown'),true);
 assert.equal(matches({profileAnswers:{diet:'Vegetariana'}}, {discover_answer_filters:{diet:['Vegana']}}, 'unknown'),false);
});
test('legacy duplicate controls migrate to current labels and explicit reset wins',()=>{
 assert.equal(read({}, {discover_diets:['other']}).diet.join(','),'Vegana,Pescetariana');
 assert.equal(read({}, {discover_smoking:'occasionally'}).smoking[0],'A veces');
 assert.equal(read({diet:[],smoking:[]}, {discover_diets:['vegetarian'],discover_smoking:'yes'}).diet.length,0);
});
test('every named onboarding practice can be selected and matched',()=>{
 const {readDiscoverSpiritualPaths, matchesDiscoverSpiritualPaths}=load('src/lib/discoverSpiritualPaths.ts');
 for(const practice of PRACTICE_OPTIONS.filter(value=>value!=='Otras')) {
  assert.equal(readDiscoverSpiritualPaths([practice]).length,1);
  assert.equal(matchesDiscoverSpiritualPaths({spiritual_path:[practice]},[practice]),true);
 }
 assert.equal(readDiscoverSpiritualPaths(['Art of Living'])[0],'El Arte de Vivir');
});
