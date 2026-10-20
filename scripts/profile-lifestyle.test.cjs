const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function fixture(row) {
  let saved;
  const query = {select(){return query},eq(){return query},async maybeSingle(){return {data:row}},async upsert(payload){saved=payload;return {error:null}}};
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/profileQuestions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{
    exports,require:name=>name==='./supabase'?{supabase:{from:()=>query}}:{assertAcceptableContent(){}},
  });
  return {...exports,saved:()=>saved};
}
test('saved settings populate onboarding lifestyle selectors',async()=>{
  const api=fixture({vegetarian:'Vegano',smoking:'No',profile_answers:{alcohol:'A veces'}});
  const answers=await api.readProfileAnswers('user');
  assert.equal(answers.diet,'Vegana');assert.equal(answers.smoking,'No');assert.equal(answers.alcohol,'A veces');
});
test('saving lifestyle updates existing preference fields and keeps alcohol in profile answers',async()=>{
  const api=fixture(null);
  await api.saveProfileAnswers('user',{diet:'Vegetariana',smoking:'A veces',alcohol:'No'});
  assert.equal(api.saved().vegetarian,'Sí');assert.equal(api.saved().smoking,'A veces');
  assert.equal(api.saved().profile_answers.alcohol,'No');assert.equal('alcohol' in api.saved(),false);
});
test('unselecting lifestyle clears the stored selection without affecting unrelated partial updates',async()=>{
  const api=fixture(null);
  await api.saveProfileAnswers('user',{diet:'',smoking:''});
  assert.equal(api.saved().vegetarian,null);assert.equal(api.saved().smoking,null);
  await api.saveProfileAnswers('user',{personality:'Medio'});
  assert.equal('vegetarian' in api.saved(),false);assert.equal('smoking' in api.saved(),false);
});
