const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/chatComposerLayout.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api});
test('composer includes the safe area once and no extra keyboard gap',()=>{
 assert.equal(api.chatComposerBottomPadding(34,false),34);
 assert.equal(api.chatComposerBottomPadding(0,false),8);
 assert.equal(api.chatComposerBottomPadding(34,true),8);
 assert.equal(api.chatComposerBottomPadding(24,true),8);
});
