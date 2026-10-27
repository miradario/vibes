const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function catalogFixture(enabled=true) {
 const rows={learning_profiles:Array.from({length:501},(_,i)=>({id:`p${i}`})),learning_activities:Array.from({length:501},(_,i)=>({id:`a${i}`})),learning_sessions:Array.from({length:1001},(_,i)=>({id:`s${i}`})),learning_teacher_places:[],learning_enrollments:[]};
 const calls=[];
 const supabase={rpc:async()=>({data:{enabled,can_create:enabled,managed_ids:[]},error:null}),from:table=>{
  const builder={select(){return builder},order(){return builder},async range(start,end){calls.push({table,start,end});return{data:rows[table].slice(start,end+1),error:null}}};return builder;
 }};
 const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/learning/queries.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,__DEV__:false,require:key=>key==='../lib/supabase'?{supabase}:key==='./developmentProfiles'?{withDevelopmentProfiles:data=>data}:{}});
 return {api:exports,calls};
}
test('catalog includes classes and sessions beyond the first page',async()=>{
 const f=catalogFixture();const data=await f.api.loadLearning();
 assert.equal(data.activities.length,501);assert.equal(data.activities.at(-1).id,'a500');
 assert.equal(data.sessions.length,1001);assert.equal(data.sessions.at(-1).id,'s1000');
 assert.equal(data.profiles.length,501);
 assert.ok(f.calls.some(call=>call.table==='learning_sessions'&&call.start===1000));
});
test('disabled class access does not query protected catalog tables',async()=>{
 const f=catalogFixture(false);const data=await f.api.loadLearning();
 assert.equal(data.activities.length,0);assert.equal(f.calls.length,0);
});
