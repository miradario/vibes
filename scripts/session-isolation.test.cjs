const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { QueryClient } = require('@tanstack/react-query');
function load(path) {const module={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(module,module.exports);return module.exports;}
const {updateSessionCache}=load('src/auth/sessionCache.ts');
const {bindQueryAppState}=load('src/lib/queryAppState.ts');
test('logout removes private and unscoped feed caches instead of refetching old account data',()=>{
 const client=new QueryClient();client.setQueryData(['auth','session'],{user:{id:'A'}});client.setQueryData(['messages','chat'],['secret']);client.setQueryData(['events'],['private challenge']);
 updateSessionCache(client,null);
 assert.equal(client.getQueryData(['auth','session']),null);assert.equal(client.getQueryData(['messages','chat']),undefined);assert.equal(client.getQueryData(['events']),undefined);client.clear();
});
test('switching accounts clears old caches while a token refresh keeps the same account data',()=>{
 const client=new QueryClient();client.setQueryData(['auth','session'],{user:{id:'A'}});client.setQueryData(['profile','A'],{name:'A'});
 updateSessionCache(client,{user:{id:'A'},access_token:'new'});assert.ok(client.getQueryData(['profile','A']));
 updateSessionCache(client,{user:{id:'B'}});assert.equal(client.getQueryData(['profile','A']),undefined);assert.equal(client.getQueryData(['auth','session']).user.id,'B');client.clear();
});
test('background state pauses query focus; returning active resumes it and cleanup unsubscribes',()=>{
 const states=[];let listener,removed=false;
 const dispose=bindQueryAppState({currentState:'active',addEventListener:(_event,fn)=>{listener=fn;return{remove:()=>removed=true};}},x=>states.push(x));
 listener('background');listener('inactive');listener('active');dispose();assert.deepEqual(states,[true,false,false,true]);assert.equal(removed,true);
});
