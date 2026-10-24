const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,deps=()=>({})){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:deps,Date});return exports;}
const media=load('src/constants/challengeMediaPresets.ts',()=>1);
const schedule=load('src/lib/eventSchedule.ts');
const classification=load('src/constants/eventClassification.ts');
function setup(){
 let patch; const filters=[];const original={id:'event',type:'event',created_by:'owner',title:'Before',image_url:'https://example.com/original.jpg',capacity:0,schedule:[],starts_at:null};
 const supabase={from(){return {update(value){patch=value;return this},eq(key,value){filters.push([key,value]);return this},select(){return this},async single(){return {data:{...original,...patch},error:null}}}}};
 const api=load('src/queries/events.queries.ts',name=>name==='@tanstack/react-query'?{useMutation:x=>x,useQueryClient:()=>({})}:name==='../lib/supabase'?{supabase}:name==='../constants/challengeMediaPresets'?media:name==='../lib/eventSchedule'?schedule:name==='../constants/eventClassification'?classification:name==='../lib/moderation'?{assertAcceptableContent(){}}:{});
 return {mutation:api.useUpdateEventMutation(),get patch(){return patch},filters};
}
const input={eventId:'event',updatedBy:'owner',title:'After',subtitle:'Description',description:'Description',startsAt:null,capacity:0,pricingType:'free',modality:'in_person'};
test('editing text preserves the existing cover without uploading or overwriting it',async()=>{
 const state=setup();const result=await state.mutation.mutationFn(input);
 assert.equal('image_url' in state.patch,false);
 assert.equal(result.imageUrl,'https://example.com/original.jpg');
 assert.equal(result.capacity,0);assert.equal(result.startsAt,null);
 assert.ok(state.filters.some(([key,value])=>key==='created_by'&&value==='owner'));
 assert.ok(state.filters.some(([key,value])=>key==='type'&&value==='event'));
});
test('an explicitly selected replacement cover is written',async()=>{
 const state=setup();await state.mutation.mutationFn({...input,imageUri:'https://example.com/new.jpg'});
 assert.equal(state.patch.image_url,'https://example.com/new.jpg');
});
test('editing a recurring event persists the series rule and all occurrences',async()=>{
 const state=setup();
 const recurring=schedule.buildRecurringSchedule({date:'2026-10-27',time:'19:00'},{frequency:'weekly',count:4,weekdays:[2]});
 const result=await state.mutation.mutationFn({...input,startsAt:recurring[0].startsAt,schedule:recurring});
 assert.equal(state.patch.schedule.length,4);
 assert.equal(result.schedule.length,4);
 assert.equal(schedule.getEventRecurrence(result.schedule).frequency,'weekly');
 assert.equal(schedule.getEventRecurrence(result.schedule).count,4);
});
