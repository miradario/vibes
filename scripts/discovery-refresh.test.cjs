const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const exportsUnderTest = {};
new Function('exports', ts.transpileModule(fs.readFileSync('src/lib/discoveryRefresh.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(exportsUnderTest);
const { createDiscoveryRefresh } = exportsUnderTest;
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return {promise,resolve,reject}; };
test('entering discovery hides the prior result before the new request completes', async () => {
 const request = deferred(), states = [];
 const controller = createDiscoveryRefresh(() => request.promise, state => states.push(state));
 const pending = controller.refresh();
 assert.equal(states.at(-1).phase,'loading');
 request.resolve(); await pending;
 assert.equal(states.at(-1).phase,'ready');
});
test('retry clears a failed load and runs a new request', async () => {
 let calls=0; const states=[];
 const controller=createDiscoveryRefresh(async()=>{if(++calls===1)throw Error('network');},state=>states.push(state));
 await controller.refresh(); assert.equal(states.at(-1).phase,'error');
 const pending=controller.refresh(); assert.equal(states.at(-1).phase,'loading');
 await pending; assert.equal(states.at(-1).phase,'ready'); assert.equal(calls,2); assert.equal(states.at(-1).attempt,2);
});
test('a late response from an older attempt cannot replace the current result', async () => {
 const first=deferred(), second=deferred(), states=[];let calls=0;
 const controller=createDiscoveryRefresh(()=>++calls===1?first.promise:second.promise,state=>states.push(state));
 const old=controller.refresh(), current=controller.refresh();
 second.resolve(); await current;
 first.reject(Error('late failure')); await old;
 assert.equal(states.at(-1).phase,'ready');assert.equal(states.at(-1).attempt,2);
});
test('leaving the screen invalidates a pending response', async () => {
 const request=deferred(),states=[];
 const controller=createDiscoveryRefresh(()=>request.promise,state=>states.push(state));
 const pending=controller.refresh();controller.cancel();request.resolve();await pending;
 assert.equal(states.length,1);assert.equal(states[0].phase,'loading');
});
test('a timed-out request can be retried successfully', async () => {
 const stalled=deferred(),states=[];let calls=0;
 const controller=createDiscoveryRefresh(()=>++calls===1?stalled.promise:Promise.resolve(),state=>states.push(state),5);
 await controller.refresh();assert.equal(states.at(-1).phase,'error');
 await controller.refresh();assert.equal(states.at(-1).phase,'ready');
 stalled.resolve();
});
