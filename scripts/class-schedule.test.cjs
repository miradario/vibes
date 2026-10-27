const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(file,imports={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:key=>imports[key],Date,Intl,Set,Error});return exports;}
const utils=load('src/learning/utils.ts');
const {classScheduleSessions, classScheduleFromSessions}=load('src/learning/classSchedule.ts',{'./utils':utils});
const schedule={days:[1,3],start:'09:00',end:'10:00',from:'2026-11-01',until:'2026-11-30',timezone:'America/Argentina/Buenos_Aires',title:'Yoga'};
const now=Date.parse('2026-10-26T12:00:00Z');
test('weekly class produces nine real November meetings, without changing its timezone',()=>{const sessions=classScheduleSessions(schedule,now);assert.equal(sessions.length,9);assert.equal(sessions[0].starts_at,'2026-11-02T12:00:00.000Z');assert.equal(sessions.at(-1).starts_at,'2026-11-30T12:00:00.000Z');assert.equal(sessions[0].ends_at,'2026-11-02T13:00:00.000Z');const pattern=classScheduleFromSessions(sessions,schedule.timezone);assert.equal(pattern.start,'09:00');assert.equal(pattern.end,'10:00');assert.equal(pattern.days.join(','),'1,3');assert.equal(pattern.until,'2026-11-30');});
test('invalid or empty schedules cannot be published',()=>{for(const patch of [{days:[]},{days:[7]},{end:'08:00'},{start:'25:00'},{until:'2026-10-01'},{from:'2026-11-31'},{days:[2],from:'2026-11-02',until:'2026-11-02'}]) assert.throws(()=>classScheduleSessions({...schedule,...patch},now));});
test('past starts and over 100 meetings are rejected instead of silently dropping dates',()=>{assert.throws(()=>classScheduleSessions(schedule,Date.parse('2026-11-03T00:00:00Z')),/futuro/);assert.throws(()=>classScheduleSessions({...schedule,days:[0,1,2,3,4,5,6],until:'2027-03-01'},now),/100/);});
test('local times remain correct across a DST change',()=>{const sessions=classScheduleSessions({...schedule,days:[0],from:'2026-10-25',until:'2026-11-01',timezone:'America/New_York'},Date.parse('2026-10-24T12:00:00Z'));assert.equal(sessions.length,2);assert.equal(sessions[0].starts_at,'2026-10-25T13:00:00.000Z');assert.equal(sessions[1].starts_at,'2026-11-01T14:00:00.000Z');});
