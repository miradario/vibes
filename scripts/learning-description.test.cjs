const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const helpers={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/learning/description.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:helpers});
test('logistics become separate facts without losing other content',()=>{
 const result=helpers.learningDescriptionDetails('Danza libre.\n\nViernes · 19:30 a 21:30\n\nEntrada individual. Ingreso desde 19:15. Cupo limitado.');
 assert.equal(result.schedule,'Viernes · 19:30 a 21:30');
 assert.equal(result.admission,'Ingreso desde 19:15');
 assert.equal(result.body,'Danza libre.\n\nEntrada individual. Cupo limitado.');
});
test('missing logistics are not invented',()=>{
 const result=helpers.learningDescriptionDetails('Un espacio para bailar.');
 assert.equal(result.body,'Un espacio para bailar.');
 assert.equal(result.schedule,undefined);assert.equal(result.admission,undefined);
});
