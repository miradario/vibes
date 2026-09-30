const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript'),fs=require('node:fs'),vm=require('node:vm');
const dating={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('supabase/functions/vibi-chat/dating.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:dating});
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/discoverAnswerFilters.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api,require:()=>dating});
const matches=api.matchesDiscoverAnswers;
test('interest filter includes Todos, excludes unanswered, and resets independently',()=>{
 for (const selected of ['Hombre','Mujer','Todos']) {
  assert.equal(matches({profileAnswers:{interestedIn:'Todos'}},{interestedIn:[selected]}),true);
  assert.equal(matches({}, {interestedIn:[selected]}),false);
 }
 assert.equal(matches({profile_answers:{interestedIn:'Mujer'}},{interestedIn:['Hombre']}),false);
 assert.equal(matches({}, {interestedIn:[]}),true);
});
test('multiple choices are alternatives, sections must all match',()=>{
 const candidate={profileAnswers:{hobbies:['Arte'],pets:['Gatos']}};
 assert.equal(matches(candidate,{hobbies:['Música','Arte'],pets:['Gatos']}),true);
 assert.equal(matches(candidate,{hobbies:['Arte'],pets:['Perros']}),false);
});
test('supports single answers and both database key formats',()=>{
 assert.equal(matches({personality:'Introvertido',looking_for:['Amistad']},{personality:['Introvertido'],lookingFor:['Amistad']}),true);
 assert.equal(matches({profile_answers:{favoritePlans:['Café']}},{favoritePlans:['Café']}),true);
});
test('unanswered sections only exclude when selected; reset shows all',()=>{
 assert.equal(matches({}, {hobbies:['Arte']}),false);
 assert.equal(matches({}, {hobbies:[]}),true);
 assert.equal(matches({}, {}),true);
});
test('additional profile choices use real camel and snake case values',()=>{
 assert.equal(matches({openTo:['Amistad'],education:'Universidad',family_plan:'Quiero hijos',communicationStyle:'Directo'}, {openTo:['Amistad'],education:['Universidad'],familyPlan:['Quiero hijos'],communicationStyle:['Directo']}),true);
 assert.equal(matches({zodiac:'Aries'},{zodiac:['Leo']}),false);
});
test('height ranges exclude unknown values and include endpoints',()=>{
 assert.equal(matches({height_cm:170},{heightMin:['170'],heightMax:['180']}),true);
 assert.equal(matches({heightCm:185},{heightMax:['180']}),false);
 assert.equal(matches({},{heightMin:['150']}),false);
});
