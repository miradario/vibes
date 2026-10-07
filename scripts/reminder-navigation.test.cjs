const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function appNavigation(route = 'Tab') {
 const source = ts.createSourceFile('App.tsx', fs.readFileSync('App.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
 let declaration, onStateChange;
 function visit(n) { if (ts.isJsxAttribute(n) && n.name.getText(source) === 'onStateChange') onStateChange = n.initializer.expression; if(ts.isVariableDeclaration(n) && n.name.getText(source) === 'navigateFromNotification') declaration = n; ts.forEachChild(n, visit); }
 visit(source);
 const calls=[];
 const context={syncVibiRoute:()=>{},module:{},isNavigationReady:true,pendingNotificationData:null,navigationRef:{current:{getCurrentRoute:()=>({name:route}),dispatch:v=>calls.push(v)}},CommonActions:{navigate:v=>v}, fetchEventFeedItemById:async()=>null, navigateToMessages:()=>calls.push({name:'messages'}), console};
 if(fs.existsSync('src/notifications/reminderNavigation.ts')) {
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/notifications/reminderNavigation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports});
  Object.assign(context,exports);
 }
 vm.runInNewContext(ts.transpileModule('const '+declaration.getText(source)+'; module.exports={run:navigateFromNotification,changed:'+onStateChange.getText(source)+'};',{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
 return {...context.module.exports,calls,context,setRoute:r=>{route=r;}};
}
test('challenge reminder opens its ID even when feed lookup cannot return the item',async()=>{
 const s=appNavigation(); await s.run({type:'challenge_reminder',eventId:'challenge-1'});
 assert.equal(s.calls[0]?.name,'ChallengeDetailScreen');
 assert.equal(s.calls[0]?.params?.challengeId,'challenge-1');
});
test('cold-start reminder waits for Startup before navigating',async()=>{
 const s=appNavigation('Startup'); await s.run({type:'challenge_reminder',eventId:'challenge-1'});
 assert.equal(s.calls.length,0);
 assert.equal(s.context.pendingNotificationData.eventId,'challenge-1');
});

test('queued cold-start reminder opens exactly once after startup', async()=>{
 const s=appNavigation('Startup');
 await s.run({type:'challenge_reminder',eventId:'challenge-1'});
 s.changed(); assert.equal(s.calls.length,0);
 s.setRoute('Tab'); s.changed();
 assert.equal(s.calls.length,1);
 assert.equal(s.calls[0].params.challengeId,'challenge-1');
 s.changed(); assert.equal(s.calls.length,1);
});
test('a reminder clears a previously viewed event from merged navigation params', async()=>{
 const s=appNavigation('ChallengeDetailScreen');
 await s.run({type:'challenge_reminder',eventId:'new-challenge'});
 const params={event:{id:'old-challenge'}, ...s.calls[0].params};
 assert.equal(params.event?.id ?? params.challengeId, 'new-challenge');
});
