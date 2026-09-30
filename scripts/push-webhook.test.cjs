const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'), vm=require('node:vm'), ts=require('typescript');
const api={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('supabase/functions/send-push/webhook.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api});
test('only the dedicated webhook credential authorizes delivery',()=>{
 const secret='x'.repeat(64);
 assert.equal(api.authorizedWebhook(null,secret),false);
 assert.equal(api.authorizedWebhook('Bearer invalid',secret),false);
 assert.equal(api.authorizedWebhook('Bearer '+secret,undefined),false);
 assert.equal(api.authorizedWebhook('Bearer '+secret,secret),true);
});
test('a new like or a changed decision notifies; repeated likes and passes do not',()=>{
 const row={swiper_id:'sender',target_id:'recipient',direction:'like'};
 assert.equal(api.isConnectionRequest(row),true);
 assert.equal(api.isConnectionRequest(row,{direction:'nope'}),true);
 assert.equal(api.isConnectionRequest(row,{direction:'like'}),false);
 assert.equal(api.isConnectionRequest({...row,direction:'nope'}),false);
 assert.equal(api.isConnectionRequest({...row,target_id:'sender'}),false);
});

function handlerFixture({disabled=false,blocked=false}={}) {
 let handler; const deliveries=[]; let databaseCalls=0;
 const db={from(table){
  databaseCalls++; let columns='',ids=[];
  const q={select(v){columns=v;return q;},in(key,v){ids=v;return q;},eq(){return q;},is(){return q;},or(){return q;},limit(){return q;},order(){return q;},
   single:async()=>({data:{user1_id:'sender',user2_id:'recipient'},error:null}),
   then(resolve){
    let data=[];
    if(table==='profiles')data=ids.map(id=>({id,display_name:'Persona'}));
    if(table==='user_blocks' && blocked)data=[{blocker_id:'sender'}];
    if(table==='user_preferences')data=[{user_id:'recipient',notifications_enabled:!disabled}];
    if(table==='push_tokens')deliveries.push(...ids);
    return Promise.resolve({data,error:null}).then(resolve);
   }};return q;
 }};
 const env={PUSH_WEBHOOK_SECRET:'x'.repeat(64),SUPABASE_URL:'https://example.test',SUPABASE_SERVICE_ROLE_KEY:'fixture'};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('supabase/functions/send-push/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports:{},require:name=>name==='./webhook.ts'?api:name.includes('server.ts')?{serve:fn=>handler=fn}:{createClient:()=>db},
  Deno:{env:{get:key=>env[key]}},Request,Response,console,TextEncoder,crypto:require('node:crypto').webcrypto,
 });
 return {deliveries, calls:()=>databaseCalls, send:(payload,authorized=true)=>handler(new Request('https://example.test',{method:'POST',headers:authorized?{Authorization:'Bearer '+env.PUSH_WEBHOOK_SECRET}:{},body:JSON.stringify(payload)}))};
}
test('actual webhook rejects missing auth before querying or delivering',async()=>{
 const fixture=handlerFixture();
 assert.equal((await fixture.send({table:'messages',record:{}},false)).status,401);
 assert.equal(fixture.calls(),0);
});
test('authenticated direct-message handler selects recipient push tokens',async()=>{
 const fixture=handlerFixture();
 const response=await fixture.send({type:'INSERT',table:'messages',record:{id:'message',match_id:'match',sender_id:'sender',text:'Hola'}});
 assert.equal(response.status,200);
 assert.deepEqual(fixture.deliveries,['recipient']);
});
test('connection handler respects blocks, notification preference and repeated decisions',async()=>{
 const payload={type:'INSERT',table:'swipes',record:{id:'swipe',swiper_id:'sender',target_id:'recipient',direction:'like'}};
 const fixture=handlerFixture();
 assert.equal((await fixture.send(payload)).status,200);
 assert.deepEqual(fixture.deliveries,['recipient']);
 for(const config of [{disabled:true},{blocked:true}]){
  const suppressed=handlerFixture(config);
  assert.equal((await suppressed.send(payload)).status,200);
  assert.deepEqual(suppressed.deliveries,[]);
 }
 const repeated=handlerFixture();
 await repeated.send({...payload,type:'UPDATE',old_record:{direction:'like'}});
 assert.deepEqual(repeated.deliveries,[]);
});
