const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/safetyFeedback.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api});
test('safety reports require a supported category and meaningful bounded text',()=>{
 for(const category of api.SAFETY_FEEDBACK_CATEGORIES)assert.equal(api.validateSafetyFeedback(category,'Descripción del problema.','perfil'),true);
 assert.equal(api.validateSafetyFeedback('unknown','Descripción del problema.',''),false);
 assert.equal(api.validateSafetyFeedback('child_safety','          ',''),false);
 assert.equal(api.validateSafetyFeedback('child_safety','a'.repeat(4001),''),false);
 assert.equal(api.validateSafetyFeedback('child_safety','Descripción válida.','a'.repeat(1001)),false);
});
test('the report submit path stays in app and only confirms after a backend response',()=>{
 const source=fs.readFileSync('screens/Contact.tsx','utf8');
 const submit=source.slice(source.indexOf('  const submit ='),source.indexOf('  return <ScreenContainer'));
 assert.ok(submit.includes('supabase.from("safety_feedback").insert'));
 assert.equal(submit.includes('Linking'),false);
 assert.ok(submit.indexOf('result.error')<submit.indexOf('Reporte recibido'));
 assert.ok(submit.includes('inFlight.current'));
 assert.ok(source.includes('Conservamos tu texto'));
});
