const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const compile = path => ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
const preferences = {};
vm.runInNewContext(compile('src/notifications/preferences.ts'), { exports: preferences });

function fixture({ fail = false, loaded = true } = {}) {
  const slots = []; let cursor = 0, effects = [], data = { notificationsEnabled: true }, writes = [], alerts = [];
  const hooks = {
    ...React,
    useState(initial) { const i=cursor++; if (!(i in slots)) slots[i]=initial; return [slots[i], v => { slots[i]=typeof v==='function'?v(slots[i]):v; }]; },
    useRef(initial) { const i=cursor++; if (!(i in slots)) slots[i]={current:initial}; return slots[i]; },
    useEffect(fn,deps) { const i=cursor++; if (!slots[i] || deps.some((d,k)=>d!==slots[i][k])) { slots[i]=deps; effects.push(fn); } },
  };
  const supabase = { from: () => ({ upsert(payload) { writes.push(payload); return { select:()=>({ single:async()=>({error:fail?new Error('offline'):null,data:payload}) }) }; } }) };
  const component = {};
  const imports = {
    react: hooks,
    'react-native': { View:'View',Pressable:'Pressable',Switch:'Switch',TextInput:'TextInput',ActivityIndicator:'Spinner',Platform:{OS:'web'},StyleSheet:{create:x=>x},Alert:{alert:(...args)=>alerts.push(args)} },
    '@react-native-community/datetimepicker': {default:'DateTimePicker',__esModule:true},
    'expo-notifications': { IosAuthorizationStatus: { PROVISIONAL:3, EPHEMERAL:4 } },
    '@tanstack/react-query': { useQueryClient:()=>({cancelQueries:async()=>{},setQueryData:(_key,value)=>{data=value;}}) },
    'react-native-safe-area-context': { useSafeAreaInsets:()=>({bottom:0}) },
    './Typography': { Text:'Text' }, './Icon': {default:'Icon',__esModule:true}, './AnimatedSheetModal':{default:'Sheet',__esModule:true},
    '../src/auth/auth.queries': {useAuthSession:()=>({data:{user:{id:'user'}}})},
    '../src/queries/userPreferences.queries': {useUserPreferencesQuery:()=>({data,isSuccess:loaded,isError:false}),userPreferencesKeys:{byUser:id=>[id]}},
    '../src/lib/supabase': {supabase},
    '../src/api/mappers/userPreferences.mapper': {mapUserPreferencesRow:row=>({...data,...Object.fromEntries(Object.entries(row).map(([key,value])=>[key.replace(/_([a-z])/g,(_,c)=>c.toUpperCase()),value]))})},
    '../src/i18n': {useI18n:()=>({t:key=>key})},
    '../src/theme/vibesTheme': {vibesTheme:{colors:{},fonts:{}}},
    '../src/notifications/preferences':preferences,
  };
  vm.runInNewContext(compile('components/NotificationPreferencesSection.tsx'),{exports:component,require:name=>{if(!(name in imports))throw Error(name);return imports[name];}});
  const render=()=>{cursor=0;effects=[];const tree=component.default();effects.forEach(fn=>fn());return tree;};
  return {render,writes,alerts,prefs:()=>data};
}
function nodes(tree,type) {
  if (!tree || typeof tree!=='object') return [];
  if (Array.isArray(tree)) return tree.flatMap(item=>nodes(item,type));
  return [...(tree.type===type?[tree]:[]),...nodes(tree.props?.children,type)];
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const master=tree=>nodes(tree,'Switch').find(n=>n.props.accessibilityLabel==='configuration.receive');
const expand=tree=>nodes(tree,'Pressable').find(n=>n.props.accessibilityState?.expanded!==undefined);

test('starts collapsed, reveals six independent categories and event timing sheet',()=>{
 const f=fixture();let tree=f.render();assert.equal(nodes(tree,'Switch').length,1);
 assert.ok(JSON.stringify(tree).includes('configuration.summary'));
 expand(tree).props.onPress();tree=f.render();assert.equal(nodes(tree,'Switch').length,7);
 assert.ok(!JSON.stringify(tree).includes('configuration.summary'));
 assert.equal(nodes(tree,'Sheet')[0].props.visible,false);
 const timing=nodes(tree,'Pressable').find(n=>JSON.stringify(n.props.children).includes('configuration.remindMe'));
 timing.props.onPress();tree=f.render();assert.equal(nodes(tree,'Sheet')[0].props.visible,true);
 const radios=nodes(tree,'Pressable').filter(n=>n.props.accessibilityRole==='radio');
 assert.equal(radios.length,3);assert.equal(radios.filter(n=>n.props.accessibilityState.checked).length,1);
});
test('saving a category immediately persists only that field; master off/on preserves it',async()=>{
 const f=fixture();expand(f.render()).props.onPress();let tree=f.render();
 nodes(tree,'Switch').find(n=>n.props.accessibilityLabel==='configuration.connections').props.onValueChange(false);
 await flush();tree=f.render();assert.equal(f.prefs().notificationConnections,false);
 assert.deepEqual(Object.keys(f.writes[0]).sort(),['notification_connections','user_id']);
 master(tree).props.onValueChange(false);tree=f.render();assert.equal(nodes(tree,'Switch').length,1);await flush();
 master(f.render()).props.onValueChange(true);await flush();tree=f.render();expand(tree).props.onPress();tree=f.render();
 assert.equal(nodes(tree,'Switch').find(n=>n.props.accessibilityLabel==='configuration.connections').props.value,false);
});
test('failed saves restore the previous value and show an error',async()=>{
 const f=fixture({fail:true});master(f.render()).props.onValueChange(false);
 assert.equal(master(f.render()).props.value,false);await flush();
 assert.equal(master(f.render()).props.value,true);assert.equal(f.alerts.length,1);
});
test('loading prevents edits, and rapid changes cannot race pending saves',async()=>{
 assert.equal(nodes(fixture({loaded:false}).render(),'Switch').length,0);
 const f=fixture();const control=master(f.render());control.props.onValueChange(false);control.props.onValueChange(true);
 assert.equal(master(f.render()).props.disabled,true);await flush();assert.equal(f.writes.length,1);
});

test('category summary interpolates the count in every supported locale',()=>{
 const i18n={};vm.runInNewContext(compile('src/i18n/translations.ts'),{exports:i18n});
 for(const locale of ['es','es-AR','en']) {
  const label=i18n.translate(locale,'configuration.summary',{count:4});
  assert.ok(label.includes('4'));assert.ok(!label.includes('{'));
 }
});


test('daily challenge reminder saves the selected local time and time zone',async()=>{
 const f=fixture();expand(f.render()).props.onPress();let tree=f.render();
 const daily=nodes(tree,'Pressable').find(n=>JSON.stringify(n.props.children).includes('configuration.dailyAt'));
 assert.ok(daily);daily.props.onPress();tree=f.render();
 assert.equal(nodes(tree,'Sheet')[1].props.visible,true);
 const input=nodes(tree,'TextInput')[0];assert.equal(input.props.value,'20:00');
 input.props.onChangeText('07:35');tree=f.render();
 nodes(tree,'Pressable').find(n=>JSON.stringify(n.props.children).includes('common.save')).props.onPress();
 await flush();assert.equal(f.prefs().challengeReminderTime,'07:35');
 assert.equal(typeof f.writes[0].challenge_reminder_timezone,'string');
 assert.ok(f.writes[0].challenge_reminder_timezone.length>0);
});
test('invalid daily reminder times cannot be saved; cancelling keeps the existing time',()=>{
 const f=fixture();expand(f.render()).props.onPress();let tree=f.render();
 nodes(tree,'Pressable').find(n=>JSON.stringify(n.props.children).includes('configuration.dailyAt')).props.onPress();
 tree=f.render();nodes(tree,'TextInput')[0].props.onChangeText('25:80');tree=f.render();
 assert.equal(nodes(tree,'Pressable').find(n=>JSON.stringify(n.props.children).includes('common.save')).props.disabled,true);
 nodes(tree,'Sheet')[1].props.onClose();tree=f.render();
 assert.equal(nodes(tree,'Sheet')[1].props.visible,false);assert.equal(f.writes.length,0);
 assert.ok(!JSON.stringify(tree).includes('configuration.pushOnly'));
});
test('stored time is normalized and converted without treating local time as UTC',()=>{
 assert.equal(preferences.getChallengeReminderTime('07:35:00'),'07:35');
 assert.equal(preferences.getChallengeReminderTime('24:00'),'20:00');
 assert.equal(preferences.reminderTimeFromDate(preferences.reminderTimeToDate('23:45')),'23:45');
});
