const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(file,globals={}) {
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Intl,Date,Error,process:{env:{}},...globals});return exports;
}
const u=load('src/learning/utils.ts');
test('development feature flag is opt-in and always off in release',()=>{
 const f='src/featureFlags/useLearningEnabled.ts';
 assert.equal(load(f,{__DEV__:false,process:{env:{EXPO_PUBLIC_LEARNING_ENABLED:'true'}}}).LEARNING_ENABLED,false);
 assert.equal(load(f,{__DEV__:true}).LEARNING_ENABLED,false);
 assert.equal(load(f,{__DEV__:true,process:{env:{EXPO_PUBLIC_LEARNING_ENABLED:'true'}}}).LEARNING_ENABLED,true);
});
test('IANA wall-clock dates round-trip without using the device timezone',()=>{
 const iso=u.zonedDateToISO('2026-10-12 10:00','America/Argentina/Buenos_Aires');assert.equal(iso,'2026-10-12T13:00:00.000Z');assert.equal(u.wallDate(iso,'America/Argentina/Buenos_Aires'),'2026-10-12 10:00');
 assert.equal(u.zonedDateToISO('2026-10-12 10:00','Asia/Kolkata'),'2026-10-12T04:30:00.000Z');
});
test('invalid dates and nonexistent DST times are rejected',()=>{
 assert.throws(()=>u.zonedDateToISO('2026-02-30 10:00','UTC'),/no existe/);
 assert.throws(()=>u.zonedDateToISO('2026-03-08 02:30','America/New_York'),/no existe/);
 assert.throws(()=>u.zonedDateToISO('12/10/2026','UTC'),/formato/);
});
const activity={id:'a',teacher_ids:['teacher'],place_id:'place',title:'Respirar',description:'Meditación',location:'Palermo',modality:'mixed',timezone:'America/Argentina/Buenos_Aires',status:'published'};
const data={profiles:[{id:'teacher',name:'Lucía',specialties:['Yoga']},{id:'place',name:'Casa Calma'}],sessions:[{id:'s1',activity_id:'a',starts_at:'2026-10-12T13:00:00Z',ends_at:'2026-10-12T14:00:00Z'},{id:'s2',activity_id:'a',starts_at:'2026-10-13T13:00:00Z',ends_at:'2026-10-13T14:00:00Z'}]};
const f={query:'',specialty:'',modality:'',location:'',date:''};
test('courses filter by any upcoming meeting, teacher, place, specialty and modality',()=>{
 const now=Date.parse('2026-10-12T15:00:00Z');
 assert.equal(u.matchesActivity(activity,data,{...f,query:'lucía',specialty:'Yoga',modality:'online',location:'palermo',date:'2026-10-13'},now),true);
 assert.equal(u.matchesActivity(activity,data,{...f,query:'casa calma'},now),true);
 assert.equal(u.matchesActivity(activity,data,{...f,date:'2026-10-12'},now),false);
 assert.equal(u.matchesActivity({...activity,status:'cancelled'},data,f,now),false);
 assert.equal(u.matchesActivity(activity,data,{...f,specialty:'Respiración'},now),false);
});
test('paid activities clearly differ from free activities and errors do not claim payment',()=>{
 assert.equal(u.priceLabel({price:0,currency:'ARS'}),'Gratis');assert.notEqual(u.priceLabel({price:8000,currency:'ARS'}),'Gratis');
 assert.match(u.learningError(Error('PAYMENT_UNAVAILABLE')),/No se confirmó ninguna reserva paga/);
 assert.match(u.learningError(Error('FULL_CAPACITY')),/último cupo/);
 assert.match(u.learningError(Error('FORBIDDEN')),/permiso/);
});
