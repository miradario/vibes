const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm'), ts=require('typescript');

// Minimal TS loader for the pure session modules (relative imports only).
const cache={};
function load(file,env={}){
 const key=file+JSON.stringify(env); if(cache[key])return cache[key];
 const exports={}; cache[key]=exports;
 const out=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInNewContext(out,{exports,Intl,Date,JSON,encodeURIComponent,Error,process:{env},
  require:name=>load(path.join(path.dirname(file),name)+'.ts',env)});
 return exports;
}
const s=load('src/sessions/sessions.ts');
const api=load('src/sessions/sessionsApi.ts');
const home=load('src/sessions/homeActivities.ts');
const pros=load('src/sessions/professionals.ts');
const acts=load('src/featureFlags/activities.ts');
const plain=v=>JSON.parse(JSON.stringify(v));
const NOW=Date.parse('2026-11-17T12:00:00Z');
const session=(o={})=>({id:'b1',status:'confirmed',title:'Sesión',starts_at:'2026-11-20T13:00:00Z',ends_at:'2026-11-20T14:00:00Z',organizer_id:'org',organizer_name:'Ana',location:null,outside_availability:false,order_id:null,amount:null,payment_status:null,...o});

test('tab label and kinds follow the clases/sesiones flags',()=>{
 assert.equal(acts.activitiesTabLabel({clases:true,sesiones:false}),'Clases');
 assert.equal(acts.activitiesTabLabel({clases:false,sesiones:true}),'Sesiones');
 assert.equal(acts.activitiesTabLabel({clases:true,sesiones:true}),'Actividades');
 assert.equal(acts.activitiesTabVisible({clases:false,sesiones:false}),false);
 assert.deepEqual(plain(acts.activitiesKinds({clases:true,sesiones:true})),['classes','sessions']);
 assert.deepEqual(plain(acts.activitiesKinds({clases:false,sesiones:true})),['sessions']);
 assert.equal(acts.teacherManagementInApp,false);
 assert.equal(load('src/featureFlags/activities.ts',{EXPO_PUBLIC_APP_TEACHER_MANAGEMENT:'true'}).teacherManagementInApp,true);
});

test('pending waits on whoever did not create the session',()=>{
 assert.equal(s.sessionAwaiting(session()),null);
 assert.equal(s.sessionAwaiting(session({status:'pending',outside_availability:true})),'facilitator');
 assert.equal(s.sessionAwaiting(session({status:'pending',outside_availability:false})),'student');
 assert.equal(s.sessionAwaiting(session({status:'pending',created_by_me:false,outside_availability:true})),'student');
 assert.equal(s.sessionAwaiting(session({status:'pending',awaiting:'facilitator'})),'facilitator');
 assert.equal(s.sessionStatusLabel(session({status:'pending',awaiting:'student'})),'Te toca confirmar');
});

test('the student can cancel until the session starts, pending never expires',()=>{
 assert.equal(s.canCancelSession(session(),NOW),true);
 assert.equal(s.canCancelSession(session({status:'pending'}),NOW),true);
 assert.equal(s.canCancelSession(session(),Date.parse('2026-11-20T13:00:00Z')),false);
 assert.equal(s.canCancelSession(session({status:'cancelled'}),NOW),false);
 assert.equal(s.sessionNeedsStudent(session({status:'pending',awaiting:'student'}),NOW),'confirm');
});

test('payment: coordinate without order, pay only after confirmation, then paid',()=>{
 assert.equal(s.sessionPayment(session()).kind,'coordinate');
 assert.equal(s.sessionPayment(session({order_id:'o',amount:0,payment_status:'free'})).kind,'free');
 assert.equal(s.sessionPayment(session({status:'pending',order_id:'o',amount:5000,payment_status:'pending'})).kind,'awaiting_confirmation');
 assert.deepEqual(plain(s.sessionPayment(session({order_id:'o',amount:5000,payment_status:'pending'}))),{kind:'pay',amount:5000,currency:'ARS',orderId:'o'});
 assert.equal(s.sessionPayment(session({order_id:'o',amount:5000,payment_status:'paid'})).kind,'paid');
 assert.equal(s.sessionNeedsStudent(session({order_id:'o',amount:5000,payment_status:'pending'}),NOW),'pay');
});

test('slots: availability minus busy ranges, in Argentina time and 15-minute steps',()=>{
 const w={id:'a1',organizer_id:'org',title:'Yoga',location:null,starts_at:'2026-11-20T12:00:00Z',ends_at:'2026-11-20T14:00:00Z',busy:[{starts_at:'2026-11-20T12:30:00Z',ends_at:'2026-11-20T13:00:00Z'}]};
 const opts=s.startOptions([w],w,'2026-11-20',30,NOW);
 assert.deepEqual(plain(opts.map(o=>s.sessionTime(o.startsAt))),['09:00','10:00','10:15','10:30']);
 assert.equal(opts[0].availabilityId,'a1');
 assert.deepEqual(plain(s.bookableDays([w],w,60,NOW)),['2026-11-20']);
 assert.deepEqual(plain(s.bookableDays([w],w,90,NOW)),[]);
 assert.equal(s.toISO('2026-11-20','10:00'),'2026-11-20T13:00:00.000Z');
 assert.equal(s.REQUEST_TIMES[0],'07:00'); assert.equal(s.REQUEST_TIMES.at(-1),'22:00');
});

test('whatsapp links and Spanish errors',()=>{
 assert.equal(s.whatsappLink('+54 9 11 1234-5678','Hola'),'https://wa.me/5491112345678?text=Hola');
 assert.equal(s.whatsappLink('123'),null);
 assert.match(s.sessionError({message:'BOOKING_CLOSED'}),/ya empezó/);
 assert.match(s.sessionError({code:'PGRST202'}),/todavía no está habilitada/);
});

test('sessions API falls back to portal_scheduler when portal_student_sessions is missing',async()=>{
 const calls=[];
 const missing={rpc:async(name,args)=>{calls.push({name,args});return name==='portal_student_sessions'?{data:null,error:{code:'PGRST202'}}:{data:{bookings:[session()]},error:null};}};
 const result=await api.loadStudentSessions(missing);
 assert.equal(result.respondSupported,false); assert.equal(result.sessions.length,1);
 assert.equal(calls[1].name,'portal_scheduler'); assert.equal(calls[1].args.p_action,'get');
 await api.respondToSession(missing,'b1','decline');
 assert.equal(calls.at(-1).args.p_action,'cancel'); assert.equal(calls.at(-1).args.p_id,'b1');
 await assert.rejects(api.respondToSession(missing,'b1','accept'));
 assert.equal((await api.loadOrganizerContact(missing,'org')).whatsapp_phone,null);
 const ok={rpc:async(name,args)=>({data:{sessions:[session({awaiting:'student',status:'pending'})]},error:null})};
 assert.equal((await api.loadStudentSessions(ok)).respondSupported,true);
 const other={rpc:async()=>({data:null,error:{code:'42501',message:'FORBIDDEN'}})};
 await assert.rejects(api.loadStudentSessions(other));
});

test('reserve uses the availability id, start and duration of portal_scheduler',async()=>{
 const calls=[];const client={rpc:async(name,args)=>{calls.push({name,args});return {data:{},error:null};}};
 await api.reserveSession(client,'org','a1','2026-11-20T13:00:00.000Z',45);
 assert.deepEqual(plain(calls[0]),{name:'portal_scheduler',args:{p_action:'reserve',p_organizer:'org',p_id:'a1',p_data:{starts_at:'2026-11-20T13:00:00.000Z',duration:45}}});
 assert.equal(api.findReservedBooking({bookings:[session({starts_at:'2026-11-20T13:00:00+00:00'})]},'org','2026-11-20T13:00:00.000Z').id,'b1');
});

test('checkout calls the portal endpoint with Bearer and only accepts Mercado Pago URLs',async()=>{
 let req;const fetchOk=async(url,init)=>{req={url,init};return {ok:true,json:async()=>({init_point:'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=1'})};};
 assert.match(await api.requestCheckoutUrl(fetchOk,'https://portal.test/','tok','o1'),/mercadopago/);
 assert.equal(req.url,'https://portal.test/api/portal/appointment-checkout');
 assert.equal(req.init.headers.Authorization,'Bearer tok'); assert.equal(JSON.parse(req.init.body).order_id,'o1');
 await assert.rejects(api.requestCheckoutUrl(async()=>({ok:true,json:async()=>({init_point:'https://evil.test'})}),'https://p','t','o'));
 await assert.rejects(api.requestCheckoutUrl(async()=>({ok:false,json:async()=>({error:'Orden no disponible'})}),'https://p','t','o'),/Orden no disponible/);
});

test('home shows next class, next session and a notice for confirm/pay',()=>{
 const sessions=[session({id:'later',starts_at:'2026-11-25T13:00:00Z',ends_at:'2026-11-25T14:00:00Z'}),session({id:'p',status:'pending',awaiting:'student'}),session({id:'pay',order_id:'o',amount:100,payment_status:'pending',starts_at:'2026-11-21T13:00:00Z',ends_at:'2026-11-21T14:00:00Z'}),session({id:'old',starts_at:'2026-11-10T13:00:00Z',ends_at:'2026-11-10T14:00:00Z'})];
 const classes=[{id:'c',title:'Clase',status:'confirmed',starts_at:'2026-11-19T13:00:00Z',ends_at:'2026-11-19T14:00:00Z'},{id:'x',title:'X',status:'cancelled',starts_at:'2026-11-18T13:00:00Z',ends_at:'2026-11-18T14:00:00Z'}];
 const h=home.homeActivities(sessions,classes,NOW);
 assert.equal(h.nextSession.id,'p'); assert.equal(h.nextClass.id,'c'); assert.equal(h.toConfirm,1); assert.equal(h.toPay,1);
 assert.equal(home.homeActivitiesNotice(1,1),'Tenés 1 sesión para confirmar y 1 sesión con pago pendiente.');
 assert.equal(home.homeActivitiesNotice(0,0),null);
 const empty=home.homeActivities([],[],NOW); assert.equal(empty.nextClass,null); assert.equal(empty.nextSession,null);
});

test('professionals: specialties and filter, including profiles without availability',()=>{
 const list=[{name:'Ana',specialties:['Yoga','Meditación']},{name:'Beto',description:'Coach',specialties:['Coaching']},{name:'Caro',specialties:[]}];
 assert.deepEqual(plain(pros.professionalSpecialties(list)),['Coaching','Meditación','Yoga']);
 assert.deepEqual(plain(pros.filterProfessionals(list,'','').map(p=>p.name)),['Ana','Beto','Caro']);
 assert.deepEqual(plain(pros.filterProfessionals(list,'Yoga','').map(p=>p.name)),['Ana']);
 assert.deepEqual(plain(pros.filterProfessionals(list,'','coach').map(p=>p.name)),['Beto']);
});

test('session pushes and deferred links open the session detail',()=>{
 const nav=load('src/notifications/reminderNavigation.ts');
 assert.deepEqual(plain(nav.getReminderDestination({type:'appointment_invited',sessionId:'b1'})),{name:'SessionDetail',params:{id:'b1'}});
 assert.equal(nav.getReminderDestination({type:'appointment_cancelled'}),null);
 assert.equal(nav.isSessionPush({type:'appointment_updated'}),true);
 assert.equal(nav.isSessionPush({type:'event_reminder'}),false);
 const src=fs.readFileSync('src/deeplinks/deferredLink.ts','utf8');
 assert.match(src,/challenge\|event\|session/);
 assert.match(fs.readFileSync('App.tsx','utf8'),/SessionDetail: "session\/:id"/);
 assert.match(fs.readFileSync('app.json','utf8'),/"pathPrefix": "\/session"/);
 assert.match(fs.readFileSync('android/app/src/main/AndroidManifest.xml','utf8'),/pathPrefix="\/session"/);
});

test('notification settings show the sessions category only with flag and column',()=>{
 const prefs=load('src/notifications/preferences.ts');
 const keys=(p,f)=>plain(prefs.visibleNotificationCategories(p,f).map(c=>c.key));
 assert.equal(keys({},true).includes('notificationSessions'),false);
 assert.equal(keys({notificationSessions:true},false).includes('notificationSessions'),false);
 assert.equal(keys({notificationSessions:true},true).includes('notificationSessions'),true);
 assert.equal(keys({},false).length,6);
});

test('payments: Mercado Pago hold waits for the payment and confirms itself',()=>{
 const hold=session({status:'pending',created_by_me:true,order_id:'o',amount:5000,payment_status:'pending',payment_method:'mercadopago',hold_expires_at:'2026-11-17T12:15:00Z'});
 assert.equal(s.isPaymentHold(hold),true);
 assert.equal(s.sessionAwaiting(hold),'payment');
 assert.equal(s.sessionAwaiting(session({status:'pending',awaiting:'payment'})),'payment');
 assert.equal(s.sessionStatusLabel(hold),'Esperando el pago');
 assert.deepEqual(plain(s.sessionPayment(hold)),{kind:'hold',amount:5000,currency:'ARS',orderId:'o',expiresAt:'2026-11-17T12:15:00Z'});
 assert.equal(s.sessionNeedsStudent(hold,NOW),'pay');
 assert.equal(s.sessionNeedsStudent(hold,Date.parse('2026-11-17T12:16:00Z')),null);
 assert.equal(s.holdSecondsLeft('2026-11-17T12:15:00Z',NOW),900);
 assert.equal(s.holdSecondsLeft('2026-11-17T11:00:00Z',NOW),0);
 assert.equal(s.formatCountdown(905),'15:05'); assert.equal(s.formatCountdown(-3),'0:00');
 // Once credited it is a regular paid session.
 assert.equal(s.sessionPayment({...hold,status:'confirmed',payment_status:'paid'}).kind,'paid');
});

test('payments: cash and transfer are paid to the facilitator, nothing to pay in the app',()=>{
 const cash=session({order_id:'o',amount:3000,payment_status:'pending',payment_method:'cash',payment_instructions:' Alias ana.reiki '});
 assert.deepEqual(plain(s.sessionPayment(cash)),{kind:'offline',amount:3000,currency:'ARS',method:'cash',instructions:'Alias ana.reiki'});
 assert.equal(s.sessionNeedsStudent(cash,NOW),null);
 assert.equal(s.sessionPayment({...cash,payment_method:'transfer',payment_status:'paid'}).kind,'offline_paid');
 // Legacy facilitator orders (no payment_method) keep the confirm-then-pay flow.
 assert.equal(s.sessionPayment(session({status:'pending',order_id:'o',amount:5000,payment_status:'pending',payment_method:null})).kind,'awaiting_confirmation');
});

test('payments: a payment credited after the hold was released is settled with the facilitator',()=>{
 const late=session({status:'cancelled',late_payment:true,order_id:'o',amount:5000,payment_status:'paid',payment_method:'mercadopago',hold_expires_at:'2026-11-17T11:00:00Z'});
 assert.equal(s.sessionPayment(late).kind,'late');
 assert.equal(s.sessionStatusLabel(late),'Cancelada · pago a resolver');
 assert.equal(s.upcomingSessions([late,session({id:'c',status:'cancelled'})],NOW).length,1);
 assert.equal(s.canCancelSession(late,NOW),false);
 assert.match(s.NO_REFUND_NOTE,/no hay reintegro automático/);
});

test('service pricing matches title and location and drops unknown methods',()=>{
 const pricing=[{title:'Reiki',location:'',price:'5000',payment_methods:['mercadopago','cash','bitcoin']},{title:'Reiki',location:'Palermo',price:0,payment_methods:[]}];
 assert.deepEqual(plain(s.servicePricing(pricing,{title:'Reiki',location:''})),{title:'Reiki',location:'',price:5000,payment_methods:['mercadopago','cash']});
 assert.equal(s.servicePricing(pricing,{title:'Reiki',location:'Palermo'}).price,0);
 assert.equal(s.servicePricing(pricing,{title:'Yoga',location:''}),null);
 assert.equal(s.servicePricing(null,{title:'Reiki',location:''}),null);
 assert.equal(s.PAYMENT_METHOD_LABELS.transfer,'Transferencia');
 assert.match(s.sessionError({message:'PAYMENT_METHOD_UNAVAILABLE'}),/forma de pago/);
});

test('pricing and book use portal_student_sessions and degrade when not deployed',async()=>{
 const calls=[];
 const ok={rpc:async(name,args)=>{calls.push({name,args});return {data:args.p_action==='pricing'?{services:[{title:'Reiki',location:'',price:5000,payment_methods:['cash']}],hold_minutes:15}:{booking_id:'b9',order_id:'o9',hold_expires_at:'2026-11-17T12:15:00Z'},error:null};}};
 const pricing=await api.loadServicePricing(ok,'org');
 assert.equal(pricing.supported,true); assert.equal(pricing.holdMinutes,15); assert.equal(pricing.services.length,1);
 assert.deepEqual(plain(calls[0]),{name:'portal_student_sessions',args:{p_action:'pricing',p_id:'org',p_data:{}}});
 const booked=await api.bookSession(ok,'a1','2026-11-20T13:00:00.000Z',60,'mercadopago');
 assert.equal(booked.order_id,'o9');
 assert.deepEqual(plain(calls[1]),{name:'portal_student_sessions',args:{p_action:'book',p_id:'a1',p_data:{starts_at:'2026-11-20T13:00:00.000Z',duration:60,payment_method:'mercadopago'}}});
 const oldRpc={rpc:async()=>({data:null,error:{code:'P0001',message:'INVALID_ACTION'}})};
 assert.deepEqual(plain(await api.loadServicePricing(oldRpc,'org')),{services:[],supported:false,holdMinutes:15});
 const missing={rpc:async()=>({data:null,error:{code:'PGRST202'}})};
 assert.equal((await api.loadServicePricing(missing,'org')).supported,false);
 await assert.rejects(api.loadServicePricing({rpc:async()=>({data:null,error:{message:'FORBIDDEN'}})},'org'));
});
