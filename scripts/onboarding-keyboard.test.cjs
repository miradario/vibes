const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
function mount(height) {
 const slots=[], effects=[], listeners={}; let cursor=0, viewportHeight=height;
 const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),useRef:value=>{const i=cursor++;return slots[i]??=( {current:value} );},useState:value=>{const i=cursor++;slots[i]??={value};return [slots[i].value,next=>{slots[i].value=typeof next==='function'?next(slots[i].value):next;}];},useEffect:fn=>effects.push(fn)};React.default=React;
 const imports={react:React,'react-native':{View:'View',KeyboardAvoidingView:'Avoid',ScrollView:'Scroll',Platform:{OS:'android'},Keyboard:{addListener:(name,fn)=>{listeners[name]=fn;return {remove:()=>delete listeners[name]};}}},'react-native-safe-area-context':{SafeAreaView:'Safe'},'../../src/screens/Onboarding/vibesOnboardingStyles':{onboardingStyles:{}}};
 const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync('components/onboarding/OnboardingScreenContainer.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText;
 new Function('require','module','exports','requestAnimationFrame',code)(name=>imports[name],module,module.exports,fn=>fn());
 function render(){cursor=0;const tree=module.exports.default({});tree.props.ref.current={measureInWindow:fn=>fn(0,0,400,viewportHeight)};return tree;}
 const tree=render();effects.splice(0).forEach(fn=>fn());
 return {show:top=>listeners.keyboardDidShow({endCoordinates:{screenY:top}}),hide:()=>listeners.keyboardDidHide(),overlap:()=>slots[2].value,resize:h=>{viewportHeight=h;tree.props.onLayout();}};
}
test('edge-to-edge Android adds only the keyboard overlap and restores space on hide',()=>{
 const view=mount(800);view.show(500);assert.equal(view.overlap(),300);view.hide();assert.equal(view.overlap(),0);
});
test('native adjustResize does not receive duplicate keyboard padding',()=>{
 const view=mount(500);view.show(500);assert.equal(view.overlap(),0);
 view.resize(800);assert.equal(view.overlap(),300);view.resize(500);assert.equal(view.overlap(),0);
});
