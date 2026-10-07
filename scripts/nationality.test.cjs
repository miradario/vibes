const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, requireModule = () => ({})) {
 const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:requireModule});
 return exports;
}
const countries=load('src/constants/countries.ts');
const filters=load('src/lib/discoverAnswerFilters.ts');
test('country catalog has unique ISO codes and accent-insensitive search',()=>{
 assert.equal(countries.COUNTRIES.length,249);
 assert.equal(new Set(countries.COUNTRIES.map(c=>c.code)).size,249);
 assert.equal(countries.getCountryName('AR'),'Argentina');
 assert.ok(countries.searchCountries('mexico').some(c=>c.code==='MX'));
 assert.equal(countries.isCountryCode('ZZ'),false);
});
test('multiple selected countries match either nationality independently of residence',()=>{
 const selection={nationalityCode:['AR','UY']};
 assert.equal(filters.matchesDiscoverAnswers({nationalityCode:'AR',country:'España'},selection),true);
 assert.equal(filters.matchesDiscoverAnswers({nationality_code:'UY',country:'España'},selection),true);
 assert.equal(filters.matchesDiscoverAnswers({nationalityCode:'ES',country:'Argentina'},selection),false);
 assert.equal(filters.matchesDiscoverAnswers({country:'Argentina'},selection),false);
 assert.equal(filters.matchesDiscoverAnswers({}, {nationalityCode:[]}),true);
});
test('nationality combines with other filters',()=>{
 const selection={nationalityCode:['AR'],languages:['Español']};
 assert.equal(filters.matchesDiscoverAnswers({nationalityCode:'AR',languages:['Inglés']},selection),false);
 assert.equal(filters.matchesDiscoverAnswers({nationalityCode:'AR',languages:['Español']},selection),true);
});
test('saving nationality changes only its column, supports clearing, and propagates failures',async()=>{
 const writes=[];let fail=false;
 const api=load('src/lib/profileNationality.ts',name=>{
  if(name==='../constants/countries')return countries;
  return {supabase:{from:table=>({update:payload=>{const entry={table,payload};writes.push(entry);return {eq:(key,value)=>{entry.filter=[key,value];return{select:()=>({single:async()=> fail ? {error:new Error('denied')} : {data:{id:value,nationality_code:payload.nationality_code},error:null}})}}}}})}};
 });
 assert.equal(await api.saveProfileNationality('u1','AR'),'AR');
 assert.deepEqual(Object.keys(writes[0].payload),['nationality_code']);
 assert.deepEqual(writes[0].filter,['id','u1']);
 assert.equal(await api.saveProfileNationality('u1',null),null);
 await assert.rejects(api.saveProfileNationality('u1','ZZ'),/inválida/);
 assert.equal(writes.length,2);
 fail=true;await assert.rejects(api.saveProfileNationality('u1','UY'),/denied/);
});
