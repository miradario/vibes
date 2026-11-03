const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const student={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/learning/studentAgenda.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:student,Date,Set});
const data={activities:[{id:'a',title:'Yoga',status:'published',timezone:'America/Argentina/Buenos_Aires',location:'Palermo'}],enrollments:[{id:'e',activity_id:'a',status:'confirmed'}],sessions:[{id:'s',activity_id:'a',starts_at:'2026-11-06T19:00:00-03:00',ends_at:'2026-11-06T20:00:00-03:00'}]};
test('pending requests stay distinct from confirmed enrollments and deduplicate dates',()=>{
 const rows=student.studentAgenda(data,[{id:'r',source_id:'clase_1',title:'Danza',status:'pending_confirmation',starts_at:['2026-11-07T19:00:00-03:00','2026-11-07T19:00:00-03:00']}]);
 assert.equal(rows.length,2);assert.equal(rows[0].status,'confirmed');assert.equal(rows[1].status,'pending');assert.equal(rows[1].requestId,'r');
});
test('cancelled activities and requests cannot appear as upcoming',()=>{
 const rows=student.studentAgenda({...data,activities:[{...data.activities[0],status:'cancelled'}]},[{id:'r',source_id:'clase_1',title:'Danza',status:'cancelled',starts_at:['2026-11-07T19:00:00-03:00']}]);
 for(const row of rows) assert.equal(student.isUpcomingStudentMeeting(row,Date.parse('2026-11-01')),false);
});
test('ongoing confirmed meeting stays in agenda until its actual end',()=>{
 const [row]=student.studentAgenda(data,[]);
 assert.equal(student.isUpcomingStudentMeeting(row,Date.parse(row.endsAt)-1),true);
 assert.equal(student.isUpcomingStudentMeeting(row,Date.parse(row.endsAt)),false);
});
