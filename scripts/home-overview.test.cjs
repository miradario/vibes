const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/homeOverview.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: api });
test('agenda excludes past, invalid and challenge dates and orders next three', () => {
 const events = ['2026-09-24','2026-09-19','2026-09-22','invalid','2026-09-23','2026-09-25'].map((date,id)=>({id,type:'event',startsAt:date+'T12:00:00Z'}));
 events.push({id:99,type:'challenge',startsAt:'2026-09-21T12:00:00Z'});
 assert.equal(JSON.stringify(api.getUpcomingHomeEvents(events, Date.parse('2026-09-21T12:00:00Z')).map(e=>e.id)), '[2,4,0]');
});
test('checkin progress deduplicates days and excludes dates outside the challenge', () => {
 const result = api.getHomeChallengeProgress(['2026-09-20','2026-09-21','2026-09-21','2026-09-22','2026-09-30','invalid'], '2026-09-21T12:00:00', 4);
 assert.equal(result.completed,2); assert.equal(result.percent,50);
 assert.equal(api.getHomeChallengeProgress([], '2026-09-21T12:00:00', 4).percent,0);
 assert.equal(api.getHomeChallengeProgress([], null, 4),null);
});
