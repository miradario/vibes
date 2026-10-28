const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const cache=new Map();
function load(file){
 file=path.resolve(file);if(!fs.existsSync(file)&&fs.existsSync(file+'.ts'))file+='.ts';
 if(cache.has(file))return cache.get(file);
 const exports={};cache.set(file,exports);
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(js,{exports,require:name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name)):require(name),Date,Set,Map,console});
 return exports;
}
module.exports={load,dependency:(file,name)=>/communities(?:\.ts)?$|vibesOnboardingContent$|spiritualPaths$|profileQuestionOptions$/.test(name)?load(path.resolve(path.dirname(path.resolve(file)),name)):{}};
