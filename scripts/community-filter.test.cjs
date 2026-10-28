const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const {load}=require('./helpers/load-pure-ts.cjs');
function harness(){
 let id='user-a',preferences,slots=[],dependencies=[],cursor=0,effectCursor=0,pending=[];
 const react={useState(value){const index=cursor++;if(!(index in slots))slots[index]=value;return[slots[index],next=>{slots[index]=typeof next==='function'?next(slots[index]):next;}];},useEffect(callback,deps){const index=effectCursor++;if(!dependencies[index]||deps.some((x,i)=>x!==dependencies[index][i])){dependencies[index]=deps;pending.push(callback);}}};
 const imports={react,'../auth/auth.queries':{useAuthSession:()=>({data:{user:{id}}})},'../queries/userPreferences.queries':{useUserPreferencesQuery:()=>({data:preferences})},'../lib/communities':load('src/lib/communities.ts')};
 const api={};new Function('exports','require',ts.transpileModule(fs.readFileSync('src/hooks/useCommunityFilter.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(api,name=>imports[name]);
 const once=()=>{cursor=0;effectCursor=0;return api.useCommunityFilter();};
 return {render(){once();const callbacks=pending;pending=[];callbacks.forEach(f=>f());return once();},setPreferences(value){preferences=value;},switchUser(value){id=value;}};
}
test('asynchronous preferences initialize the default communities and clear survives identical refetch',()=>{
 const h=harness();assert.deepEqual(h.render()[0],[]);h.setPreferences({spiritualPath:['Art of Living','Hatha Yoga']});assert.deepEqual(Array.from(h.render()[0]),['El Arte de Vivir','Hatha']);h.render()[1]([]);h.setPreferences({spiritualPath:['Art of Living','Hatha Yoga']});assert.deepEqual(h.render()[0],[]);
});
test('a changed profile or account refreshes the defaults without persisting a browsing override',()=>{
 const h=harness();h.setPreferences({spiritual_path:['Ashtanga']});assert.deepEqual(Array.from(h.render()[0]),['Ashtanga']);h.render()[1](['Servicio']);h.setPreferences({spiritual_path:['Hatha']});assert.deepEqual(Array.from(h.render()[0]),['Hatha']);h.switchUser('user-b');h.setPreferences(null);assert.deepEqual(Array.from(h.render()[0]),[]);
});
test('saving a bio preserves the browsing filter but changing communities resets its default',()=>{
 const api=load('src/lib/aboutMeProfile.ts');const previous=api.aboutMePreferencesFromSaved({spiritual_path:['Hatha']});assert.equal('discover_spiritual_paths' in api.aboutMePreferencesPayload({...previous,aboutMe:'Nueva bio'},previous),false);assert.deepEqual(Array.from(api.aboutMePreferencesPayload({...previous,spiritualPath:['Servicio']},previous).discover_spiritual_paths),['Servicio']);
});
test('Vibi uses the same multi-community and unassigned-content rules',()=>{
 const core=load('supabase/functions/vibi-chat/core.ts');const candidate={id:'other',is_active:true};const own={id:'me'};const filters={spiritual_path:['Hatha','Músicos']};
 assert.equal(core.matchesPerson(candidate,{spiritual_path:['Ashtanga']},own,filters),false);assert.equal(core.matchesPerson(candidate,{spiritual_path:['Hatha Yoga']},own,filters),true);assert.equal(core.matchesPerson(candidate,{},own,filters),true);
});
