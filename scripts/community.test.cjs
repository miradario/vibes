const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const mod={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/communityDiscovery.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:mod.exports,Set,Date});
const {compareDiscoveryProfiles:compare,isSwipeHidden,affinityScore}=mod.exports;
test('closest wins even if farther person shares more interests',()=>{
 const own={profileAnswers:{hobbies:['Yoga','Música']}};
 assert.ok(compare(own,{id:'a',distanceKm:1},{id:'b',distanceKm:2,profileAnswers:{hobbies:['Yoga','Música']}})<0);
});
test('equal distance ranks shared interests and unknown distance goes last',()=>{
 const own={profile_answers:{hobbies:['Música']}};
 const matching={id:'b',profileAnswers:{hobbies:['musica']}};
 assert.equal(affinityScore(own,matching),1);
 assert.ok(compare(own,{id:'a',distanceKm:99999},matching)<0);
 assert.ok(compare(own,matching,{id:'a'})<0);
 assert.ok(compare(own,{...matching,distanceKm:5},{id:'a',distanceKm:5})<0);
});
test('likes remain hidden, discards expire at precisely 30 days',()=>{
 const now=Date.parse('2026-10-19T03:00:00Z');
 const at=(days)=>new Date(now-days*86400000).toISOString();
 assert.equal(isSwipeHidden({direction:'nope',created_at:at(29.999)},now),true);
 assert.equal(isSwipeHidden({direction:'nope',created_at:at(30)},now),false);
 assert.equal(isSwipeHidden({direction:'like',created_at:at(365)},now),true);
});
