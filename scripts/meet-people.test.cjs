const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(path, dependencies = {}) {
 const exports = {};
 const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
 new Function('exports', 'require', code)(exports, name => dependencies[name] ?? {});
 return exports;
}
const { isMeetPeopleEnabled } = load('src/lib/meetPeople.ts');
test('existing accounts remain enabled until explicitly opting out in either stored format', () => {
 assert.equal(isMeetPeopleEnabled(null), true);
 assert.equal(isMeetPeopleEnabled({}), true);
 assert.equal(isMeetPeopleEnabled({meetPeopleEnabled:false}), false);
 assert.equal(isMeetPeopleEnabled({meet_people_enabled:false}), false);
 assert.equal(isMeetPeopleEnabled({meetPeopleEnabled:true}), true);
});
test('resuming onboarding preserves an explicit opt out', () => {
 const { buildResumeOnboardingDraft } = load('src/lib/resumeOnboarding.ts', {
  './meetPeople': { isMeetPeopleEnabled },
  '../screens/Onboarding/vibesOnboardingContent': { PURPOSE_OPTIONS: [] },
 });
 assert.equal(buildResumeOnboardingDraft({}, {meetPeopleEnabled:false}, {}).meetPeopleEnabled,false);
 assert.equal(buildResumeOnboardingDraft({}, {}, {}).meetPeopleEnabled,true);
});
test('privacy preference cannot be silently dropped when the server lacks its column', async () => {
 const missing = {code:'PGRST204',message:"Could not find the 'meet_people_enabled' column"};
 const { upsertUserPreferences } = load('src/lib/userPreferencesStore.ts', {
  './supabase': {supabase:{from:()=>({upsert:async()=>({error:missing})})}},
  '@react-native-async-storage/async-storage': {default:{setItem:async()=>{throw new Error('must not save locally')}}},
 });
 await assert.rejects(upsertUserPreferences('viewer',{meet_people_enabled:false}),error=>error===missing);
});
