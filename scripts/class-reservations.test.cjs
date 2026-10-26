const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const vm=require('node:vm');
function load(file,imports={}) { const exports={}; vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:key=>imports[key],Intl,Date,Set,Error}); return exports; }
const utils=load('src/learning/utils.ts');
const api=load('src/learning/reservations.ts',{'./utils':utils});
const source={id:'clase_001',weekly:[{day:1,time:'09:00'},{day:3,time:'09:00'}]};
const now=Date.parse('2026-10-26T19:00:00Z');
test('November monthly plan has nine real Mondays and Wednesdays at Argentina local time',()=>{
 const dates=api.reservationDates(source,'2026-11-01',now);
 assert.equal(dates.length,9); assert.equal(dates[0],'2026-11-02T12:00:00.000Z'); assert.equal(dates.at(-1),'2026-11-30T12:00:00.000Z');
 assert.equal(dates.filter(iso=>api.reservationWeekday(iso)===1).length,5);
 assert.equal(dates.filter(iso=>api.reservationWeekday(iso)===3).length,4);
});
test('remaining dates exclude passed starts; duplicate weekly slots do not duplicate reservations',()=>{
 const dates=api.reservationDates({...source,weekly:[...source.weekly,source.weekly[0]]},'2026-10-01',now);
 assert.equal(dates.length,1); assert.equal(dates[0],'2026-10-28T12:00:00.000Z');
});
test('month choices use class timezone at month boundary and roll over year',()=>{
 const months=api.reservationMonths(Date.parse('2027-01-01T01:00:00Z'));
 assert.equal(months[0],'2026-12-01'); assert.equal(months[1],'2027-01-01'); assert.equal(months.length,6);
});
test('internal classes only offer actual published sessions in the chosen local month',()=>{
 const dates=api.reservationDates({id:'native',sessions:[{starts_at:'2026-11-01T01:00:00Z'},{starts_at:'2026-11-02T12:00:00Z'}]},'2026-11-01',now);
 assert.equal(dates.length,1); assert.equal(dates[0],'2026-11-02T12:00:00Z');
});
test('classes with no schedule offer no invented dates',()=>assert.equal(api.reservationDates({id:'no-slots',weekly:[]},'2026-11-01',now).length,0));
