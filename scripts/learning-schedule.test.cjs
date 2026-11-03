const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const schedule = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/learning/schedule.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText, {exports:schedule,Date});
const session = (id, day) => ({id,title:id,activity_id:'a',starts_at:`2026-11-${day}T19:30:00-03:00`,ends_at:`2026-11-${day}T21:30:00-03:00`});
test('compact preview excludes finished meetings and keeps next three without mutating input', () => {
 const rows=[session('five','30'),session('three','13'),session('one','01'),session('four','20'),session('two','06')];
 const result=schedule.learningSchedulePreview(rows,Date.parse('2026-11-07T00:00:00-03:00'));
 assert.equal(Array.from(result.preview,x=>x.id).join(','),'three,four,five');
 assert.equal(result.nextId,'three');
 assert.equal(rows[0].id,'five');
});
test('ongoing meeting is not marked as the next future start', () => {
 const result=schedule.learningSchedulePreview([session('current','06'),session('next','13')],Date.parse('2026-11-06T20:00:00-03:00'));
 assert.equal(result.preview.length,2); assert.equal(result.nextId,'next');
});
test('invalid sessions are omitted and finished programs have no next badge', () => {
 const result=schedule.learningSchedulePreview([session('past','01'),{...session('invalid','02'),starts_at:'bad'}],Date.parse('2026-12-01'));
 assert.equal(result.ordered.length,0); assert.equal(result.preview.length,0); assert.equal(result.nextId,null);
});

test('meeting disappears exactly at its end, including from the expanded list', () => {
 const row=session('ending','06');
 assert.equal(schedule.learningSchedulePreview([row],Date.parse(row.ends_at)-1).ordered.length,1);
 assert.equal(schedule.learningSchedulePreview([row],Date.parse(row.ends_at)).ordered.length,0);
});
