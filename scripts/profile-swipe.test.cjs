const {test}=require('node:test'),assert=require('node:assert/strict');
const ts=require('typescript'),fs=require('node:fs'),vm=require('node:vm');
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/profileSwipe.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api});
test('upward swipes open details even with some horizontal drift',()=>{assert.equal(api.getProfileSwipeAction(40,-150,360,true),'details');assert.equal(api.getProfileSwipeAction(0,-80,360,false),'details');});
test('horizontal gestures connect or pass only when enabled and beyond threshold',()=>{assert.equal(api.getProfileSwipeAction(120,10,360,true),'like');assert.equal(api.getProfileSwipeAction(-120,10,360,true),'pass');assert.equal(api.getProfileSwipeAction(120,10,360,false),null);});
test('short, downward and ambiguous diagonal gestures do nothing',()=>{for(const [x,y] of [[30,0],[0,100],[100,-100],[0,-20]])assert.equal(api.getProfileSwipeAction(x,y,360,true),null);});
test('history swipes advance without connecting or dismissing',()=>{
  assert.equal(api.getProfileSwipeAction(-140,10,360,false,true),'next');
  assert.equal(api.getProfileSwipeAction(140,10,360,false,true),'next');
  assert.equal(api.getProfileSwipeAction(0,-100,360,false,true),'details');
  assert.equal(api.getProfileSwipeAction(30,0,360,false,true),null);
  assert.equal(api.getProfileSwipeAction(-140,10,360,false,false),null);
  assert.equal(api.getProfileSwipeAction(-140,10,360,true,true),'pass');
});

test('a short upward swipe opens details without triggering a profile action',()=>{
  for(const enabled of [true,false]) {
    assert.equal(api.getProfileSwipeAction(10,-35,360,enabled,true),'details');
    assert.equal(api.getProfileSwipeAction(0,-30,360,enabled,true),null);
  }
});
