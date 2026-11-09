const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const teachers={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/learning/visibleTeachers.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:teachers,Set});
test('Classes selection includes only Ana Frenkel and Pablo Gumina',()=>{
 for(const name of ['Ana Frenkel','Pablo Gumina','  ANA   FRENKEL ']) assert.equal(teachers.isVisibleClassTeacher(name),true);
 for(const name of ['Pablo Pérez','EJEMPLO · Lucía Fernández','',null,undefined]) assert.equal(teachers.isVisibleClassTeacher(name),false);
});
