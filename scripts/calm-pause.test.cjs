const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const e = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/calmPause.ts', 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, {exports: e});
test('breathing cycle has four seconds in and six out without a hold', () => {
 assert.equal(e.getBreathFrame(3999).exhaling, false);
 assert.equal(e.getBreathFrame(4000).exhaling, true);
 assert.equal(e.getBreathFrame(4000).expansion, 1);
 assert.ok(Math.abs(e.getBreathFrame(7000).expansion - 0.5) < 0.00001);
 assert.equal(e.getBreathFrame(9999).exhaling, true);
 assert.equal(e.getBreathFrame(10000).exhaling, false);
 assert.equal(e.getBreathFrame(10000).expansion, 0);
 assert.equal(e.getBreathFrame(14000).expansion, 1);
});
test('illustration adapts to small phones, large phones and increased text', () => {
 for (const [w,h,f] of [[320,500,1], [390,760,1], [448,920,1], [320,500,2], [768,980,1]]) {
  const size = e.getCalmIllustrationSize(w,h,f);
  assert.ok(size >= 128 && size <= 360); assert.ok(size <= w-48);
 }
 assert.ok(e.getCalmIllustrationSize(320,500,2) <= e.getCalmIllustrationSize(320,500,1));
});
test('continue and skip preserve all startup destinations and update-gate priority', () => {
 assert.equal(e.getStartupDestination(false,false,null).name,'Welcome');
 assert.equal(e.getStartupDestination(true,true,null).name,'VibesOnboardingFlow');
 const home=e.getStartupDestination(true,false,null);
 assert.equal(home.name,'Tab'); assert.equal(home.params.screen,'Home');
 for (const signedIn of [true,false]) for(const onboarding of [true,false]) {
  const gate={requiredVersion:'2'}; const route=e.getStartupDestination(signedIn,onboarding,gate);
  assert.equal(route.name,'UpdateGate'); assert.equal(route.params,gate);
 }
});
