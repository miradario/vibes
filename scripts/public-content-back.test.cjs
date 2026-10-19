const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const {StackRouter}=require('@react-navigation/routers');
const api={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/publicContentBack.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api});
const routing={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/publicContentRoute.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:routing});
function fixture(routes,index=routes.length-1){
  const options={routeNames:['Welcome','Tab','EventDetail','ChallengeDetailScreen'],routeParamList:{},routeGetIdList:{}};
  const router=StackRouter({initialRouteName:'Welcome'});
  let state=router.getRehydratedState({routes,index},options);
  const dispatch=action=>{const next=router.getStateForAction(state,action,options);assert.ok(next,'action must be handled');state=next;};
  return {get state(){return state;},dispatch,navigation:{canGoBack:()=>state.index>0,goBack:()=>dispatch({type:'GO_BACK'}),reset:payload=>dispatch({type:'RESET',payload})}};
}
test('a second link opens its own event instead of the inline event retained by navigation',()=>{
  const oldEvent={id:'old',title:'Previous event'};
  const f=fixture([{name:'EventDetail',params:{event:oldEvent}}]);
  f.dispatch({type:'NAVIGATE',payload:{name:'EventDetail',params:{eventId:'new'}}});
  const params=f.state.routes[f.state.index].params;
  const target=routing.resolvePublicContentRoute(params.eventId,params.event);
  assert.equal(target.id,'new');assert.equal(target.inlineEvent,undefined);
});
test('ordinary in-app navigation keeps its matching inline event',()=>{
  const event={id:'existing'};
  assert.equal(routing.resolvePublicContentRoute(undefined,event).inlineEvent,event);
  assert.equal(routing.resolvePublicContentRoute('existing',event).inlineEvent,event);
});
for(const name of ['EventDetail','ChallengeDetailScreen']){
  test(`cold ${name} link returns a signed-in user to Home`,()=>{
    const f=fixture([{name,params:{eventId:'qa'}}]);
    api.leavePublicContent(f.navigation,true);
    assert.equal(f.state.routes[0].name,'Tab');
    assert.equal(f.state.routes[0].params.screen,'Home');
  });
  test(`cold ${name} link gives a guest a Welcome destination`,()=>{
    const f=fixture([{name}]);api.leavePublicContent(f.navigation,false);
    assert.equal(f.state.routes[0].name,'Welcome');
    assert.equal(f.state.routes.length,1);
  });
  test(`warm ${name} link preserves the user's existing navigation history`,()=>{
    const f=fixture([{name:'Tab',params:{screen:'EventsTab'}},{name}]);
    api.leavePublicContent(f.navigation,true);
    assert.equal(f.state.routes[0].name,'Tab');
    assert.equal(f.state.routes[0].params.screen,'EventsTab');
    assert.equal(f.state.routes.length,1);
  });
}
