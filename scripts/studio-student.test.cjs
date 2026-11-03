const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(env={}) {
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/learning/studioStudent.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,Date,process:{env}});return exports;
}
const api=load();
test('studio stays disabled until its migration is deployed and explicitly enabled',()=>{
 assert.equal(api.studioStudentEnabled,false);
 assert.equal(load({EXPO_PUBLIC_PORTAL_STUDIO_ENABLED:'false'}).studioStudentEnabled,false);
 assert.equal(load({EXPO_PUBLIC_PORTAL_STUDIO_ENABLED:'true'}).studioStudentEnabled,true);
});
test('mobile uses the exact portal_student RPC contract for reads and per-session bookings',async()=>{
 const calls=[];const client={rpc:async(name,args)=>{calls.push({name,args});return {data:'id',error:null};}};
 await api.requestStudioStudent(client);
 await api.requestStudioStudent(client,'book','session-id',{waitlist:true});
 assert.equal(calls[0].name,'portal_student');assert.equal(calls[0].args.p_action,'get');assert.equal(calls[0].args.p_id,null);
 assert.equal(calls[1].args.p_id,'session-id');assert.equal(calls[1].args.p_data.waitlist,true);
});
test('cancellation and consent use booking/organizer IDs with no checkout requests',async()=>{
 const calls=[];const client={rpc:async(name,args)=>{calls.push(args);return {data:true,error:null};}};
 await api.requestStudioStudent(client,'cancel','booking-id');
 await api.requestStudioStudent(client,'contact','organizer-id',{phone:'5491112345678',whatsapp_opt_in:false});
 assert.equal(calls[0].p_action,'cancel');assert.equal(calls[0].p_id,'booking-id');
 assert.equal(calls[1].p_id,'organizer-id');assert.equal(calls[1].p_data.whatsapp_opt_in,false);
});
test('available balance excludes pending, refunded and expired packs',()=>{
 const base={remaining:3,status:'paid',expires_at:'2026-11-10T00:00:00Z'};
 assert.equal(api.studioCreditBalance([base,{...base,status:'pending'},{...base,status:'refunded'},{...base,expires_at:'2026-11-01T00:00:00Z'}],Date.parse('2026-11-03')),3);
});
test('cancellation matches the backend deadline exactly; waiting can be withdrawn',()=>{
 const booking={status:'confirmed',starts_at:'2026-11-06T19:00:00Z',cancellation_hours:12};
 const boundary=Date.parse(booking.starts_at)-12*3600000;
 assert.equal(api.studioCanCancel(booking,boundary-1),true);
 assert.equal(api.studioCanCancel(booking,boundary),false);
 assert.equal(api.studioCanCancel({...booking,status:'waitlist'},boundary),true);
 assert.equal(api.studioCanCancel({...booking,status:'cancelled'},boundary),false);
});
test('RPC errors propagate and unavailable migration gets an honest message',async()=>{
 const error={code:'PGRST202',message:'Could not find the function'};
 await assert.rejects(api.requestStudioStudent({rpc:async()=>({data:null,error})}),cause=>cause===error);
 assert.match(api.studioStudentError(error),/todavía no está habilitada/);
 assert.match(api.studioStudentError({message:'CREDITS_REQUIRED'}),/crédito vigente/);
});
