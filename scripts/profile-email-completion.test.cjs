const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript'),fs=require('fs'),vm=require('vm');
const exportsObject={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/profileCompletion.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:exportsObject,require:()=>({QUESTION_GROUPS:[]})});
test('email verification adds exactly one completed field with a stable total',()=>{
 const pending=exportsObject.getProfileCompletion({}, {}, false);
 const verified=exportsObject.getProfileCompletion({}, {}, true);
 assert.equal(verified.total,pending.total);
 assert.equal(verified.completed,pending.completed+1);
 assert.ok(verified.percent>pending.percent);
 assert.equal(pending.nextScreen,'EditProfile');
});
