const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
process.env.TZ = 'America/Argentina/Buenos_Aires';
const Now = Date;
class FixedDate extends Now {
  constructor(...args) { super(...(args.length ? args : ['2026-10-06T12:00:00-03:00'])); }
}
function loadMapping() {
  const file = 'screens/ChallengeDetailScreen.tsx';
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = ['getCurrentDayFromStart', 'getCompletedDaysFromCheckins', 'getStatusFromData', 'mapEventToChallengeData', 'clamp', 'formatDisplayDate'];
  const code = source.statements.filter(n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => names.includes(d.name.getText(source)))).map(n => n.getText(source)).join('\n');
  const context = { Date: FixedDate, FALLBACK_CHALLENGE: {}, module: {} };
  if (fs.existsSync('src/lib/challengeProgress.ts')) Object.assign(context, load('src/lib/challengeProgress.ts'));
  vm.runInNewContext(ts.transpileModule(code + '\nmodule.exports = mapEventToChallengeData;', { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  return context.module.exports;
}
function load(file) {
 const exports = {};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports, Date: FixedDate, require: p => load(require('node:path').resolve(require('node:path').dirname(file), p + '.ts')) });
 return exports;
}
test('detail resets a stale streak after a missed day instead of summing all check-ins', () => {
 const value = loadMapping()({id:'a', startsAt:'2026-10-01T12:00:00-03:00', durationDays:10, attendees:'1'}, ['2026-10-01','2026-10-02','2026-10-04'], {streak:7,totalCheckins:9});
 assert.equal(value.streak, 0);
 assert.equal(value.bestStreak, 2);
});
test('detail preserves yesterday streak while today can still be completed', () => {
 const value = loadMapping()({id:'a', startsAt:'2026-10-01T12:00:00-03:00', durationDays:10, attendees:'1'}, ['2026-10-04','2026-10-05'], {});
 assert.equal(value.streak, 2);
});
const progress = load('src/lib/challengeProgress.ts');
test('consecutive runs, duplicates and unrelated dates do not inflate current or best streak', () => {
 const value = progress.getChallengeStreaks([1,2,2,4,5,6,8,99,-1], 8, 10);
 assert.equal(value.streak, 1);
 assert.equal(value.bestStreak, 3);
 assert.equal(progress.getChallengeStreaks([1,2,4,5,6], 8, 10).streak, 0);
 assert.equal(progress.getChallengeStreaks([], 0, 10).streak, 0);
});
test('finished challenges retain closing streak and do not forgive a missed final day', () => {
 assert.equal(progress.getChallengeStreaks([1,2,4,5], 100, 5).streak, 2);
 assert.equal(progress.getChallengeStreaks([1,2,3,4], 100, 5).streak, 0);
 assert.equal(progress.getChallengeStreaks([1,2,3,4], 5, 5).streak, 4);
});
test('local date stays on October 6 until midnight in Argentina', () => {
 assert.equal(progress.localDayKey(new Now('2026-10-07T02:59:59Z')), '2026-10-06');
 assert.equal(progress.localDayKey(new Now('2026-10-07T03:00:00Z')), '2026-10-07');
});
test('calendar days survive daylight-saving transitions', () => {
 const old = process.env.TZ;
 try {
  process.env.TZ = 'America/New_York';
  assert.equal(progress.getChallengeDay('2026-03-07T12:00:00-05:00', new Now('2026-03-09T00:00:00-04:00')), 3);
  assert.equal(progress.completedChallengeDays(['2026-03-09'], '2026-03-07T12:00:00-05:00', 5)[0], 3);
 } finally { process.env.TZ = old; }
});
test('check-in mutation writes the local day and scopes the challenge and user', async () => {
 const writes = [];
 const exports = {};
 class NightDate extends Now { constructor(...args) { super(...(args.length ? args : ['2026-10-07T02:30:00Z'])); } }
 const dateExports = {};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/challengeProgress.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:dateExports,Date:NightDate});
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/queries/events.queries.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText, {
  exports,Date:NightDate,require(name) {
   if(name === '../lib/challengeProgress') return dateExports;
   if(name === '@tanstack/react-query') return {useMutation:v=>v,useQueryClient:()=>({})};
   if(name === '../lib/supabase') return {supabase:{from: table=>({insert:async data=>{writes.push({table,data}); return {error:null};}})}};
   return {};
  }
 });
 await exports.useCheckInChallengeMutation().mutationFn({challengeId:'c1',userId:'u1'});
 assert.equal(writes[0].data.checkin_date,'2026-10-06');
 assert.equal(writes[0].data.challenge_id,'c1');
 assert.equal(writes[0].data.user_id,'u1');
});
