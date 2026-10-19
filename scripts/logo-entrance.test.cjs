const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const vm=require('node:vm');
const data=JSON.parse(fs.readFileSync('assets/branding/vibes-logo-morph.json','utf8'));
const api={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/illustrations/logoMorph.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api,require:()=>data,Math});
test('the user-specified letters form their corresponding logo parts and colors',()=>{
 assert.deepEqual(data.map(s=>[s.letter,s.part,s.color]),[
  ['V','arms','#2B2B2B'],['i','spheres','#F4A340'],['b','left_leg','#2B2B2B'],['e','blue_symbol','#3978B8'],['s','right_leg','#2B2B2B']]);
 assert.equal(data[1].contours.length,2,'the i provides both spheres');
 assert.equal(data[1].contours[1].color,'#D88C7A');
 assert.equal(api.logoMorphRenderShapes.find(s=>s.letter==='i-1').color,'#D88C7A');
 assert.equal(api.logoMorphRenderShapes.find(s=>s.letter==='i-0').color,'#F4A340');
});
test('real letters and final logo have compatible finite contours throughout the morph',()=>{
 for(const shape of data){
  for(const contour of shape.contours){assert.equal(contour.from.length,contour.to.length);assert.ok(contour.from.length>100);for(const point of [...contour.from,...contour.to]) assert.ok(point.every(Number.isFinite));}
  for(const t of [0,0.1,0.25,0.5,0.75,0.9,1]){const d=api.logoMorphPath(shape,t);assert.ok(d.startsWith('M'));assert.ok(d.endsWith('Z'));assert.doesNotMatch(d,/NaN|Infinity/);}
 }
});
test('progress stays on the direct path from each letter to its part, with no outward explosion',()=>{
 for(const shape of data){assert.equal(api.logoMorphPath(shape,-1),api.logoMorphPath(shape,0));assert.equal(api.logoMorphPath(shape,2),api.logoMorphPath(shape,1));}
 assert.equal(api.LOGO_MORPH_DURATION,2500);
});
function motionFixture(){
 const slots=[],effects=[],runs=[];let cursor=0,focused=true;
 const runtime={active:true,reducedMotion:false,motionReady:true};
 const react={createElement:(type,props,...children)=>({type,props,children}),useRef:v=>{const i=cursor++;return slots[i]??={current:v};},useEffect:(fn,deps)=>{const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>v!==old.deps[j]))effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}};react.default=react;
 const motion={default:{createAnimatedComponent:v=>v},useSharedValue:initial=>{const i=cursor++;if(!slots[i]){let value=initial;slots[i]={get value(){return value},set value(v){if(typeof v==='number'){value=v;}else{const run={...v,stopped:false,finish:()=>value=v.target};slots[i].run=run;runs.push(run);}}};}return slots[i];},withTiming:(target,options)=>({target,options}),withDelay:(delay,animation)=>({...animation,delay}),cancelAnimation:v=>{if(v.run)v.run.stopped=true;},Easing:{inOut:v=>v,cubic:()=>{}},useAnimatedProps:fn=>fn()};
 const output={};const deps={react,'react-native':{View:'View'},'react-native-svg':{default:'Svg',Path:'Path'},'react-native-reanimated':motion,'@react-navigation/native':{useIsFocused:()=>focused},'../src/vibi/useMotionPreference':{useVibiRuntime:()=>runtime},'../src/illustrations/logoMorph':api};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/AnimatedBrandLogo.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText,{exports:output,require:n=>deps[n]});
 return{runtime,runs,focus:v=>focused=v,render(){cursor=0;const tree=output.default({});while(effects.length)effects.shift()();return tree;}};
}
test('reduced motion skips the letter transformation',()=>{const f=motionFixture();f.runtime.reducedMotion=true;f.render();assert.equal(f.runs.length,0);});
test('backgrounding stops the morph and returning continues without another initial pause',()=>{
 const f=motionFixture();f.render();assert.equal(f.runs[0].delay,450);f.runtime.active=false;f.render();assert.equal(f.runs[0].stopped,true);
 f.runtime.active=true;f.render();assert.equal(f.runs[1].delay,0);f.runs[1].finish();f.focus(false);f.render();f.focus(true);f.render();assert.equal(f.runs.length,2);
});
