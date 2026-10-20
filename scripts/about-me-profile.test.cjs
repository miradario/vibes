const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript'),fs=require('node:fs'),vm=require('node:vm');
function load(file,imports={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},fileName:file}).outputText,{exports,require:name=>imports[name]??{}});return exports;}
const paths=load('src/lib/spiritualPaths.ts');
const api=load('src/lib/aboutMeProfile.ts',{'./spiritualPaths':paths});
test('Sobre mí restores onboarding preferences and custom practices in both row formats',()=>{
 const value=api.aboutMePreferencesFromSaved({about_me:'Mi bio',open_to:['Amistad','Clases'],spiritual_path:['Yoga','Mi práctica'],spiritual_path_details:{Yoga:{role:'Alumno',years:'4',notes:'Mi experiencia'}}});
 assert.equal(value.aboutMe,'Mi bio');assert.ok(value.openTo.includes('Amistad'));assert.ok(value.spiritualPath.includes('Mi práctica'));assert.equal(value.spiritualPathDetails.Yoga.years,'4');
});
test('saving Sobre mí uses only its fields and preserves unrelated account preferences',()=>{
 const value=api.aboutMePreferencesFromSaved({aboutMe:' Mi bio ',openTo:['Eventos'],spiritualPath:['Yoga'],spiritualPathDetails:{Yoga:{notes:'Experiencia'}},hideAge:true,discoverGenders:['Mujer'],heightCm:170});
 const payload=api.aboutMePreferencesPayload(value);
 assert.equal(payload.about_me,'Mi bio');assert.equal(payload.open_to[0],'Eventos');assert.equal(payload.spiritual_path_details.Yoga.notes,'Experiencia');
 assert.equal('hide_age' in payload,false);assert.equal('discover_genders' in payload,false);assert.equal('height_cm' in payload,false);assert.equal('profile_answers' in payload,false);
});
test('empty and malformed optional selections do not prevent opening Sobre mí',()=>{
 const value=api.aboutMePreferencesFromSaved({openTo:null,spiritualPath:'legacy invalid'});
 assert.equal(value.openTo.length,0);assert.equal(value.spiritualPath.length,0);
 const payload=api.aboutMePreferencesPayload(api.aboutMePreferencesFromSaved(null));
 assert.equal(payload.about_me,'');assert.equal(payload.open_to.length,0);
});
const questions=load('src/lib/profileQuestions.ts');
const completion=load('src/lib/profileCompletion.ts',{'./profileQuestions':questions});
test('removed onboarding questions do not keep the profile incomplete',()=>{
 const result=completion.getProfileCompletion({photos:['one'],displayName:'Ana',locationLabel:'Buenos Aires',birthDate:'1990-01-01'},{aboutMe:'Bio',openTo:['Eventos'],spiritualPath:['Yoga']},true,{});
 const answers={};
 for(const group of questions.QUESTION_GROUPS)for(const field of group.fields)if(!['lookingFor','habits','interestedIn'].includes(field.key))answers[field.key]='Respuesta';
 const full=completion.getProfileCompletion({photos:['one'],displayName:'Ana',locationLabel:'Buenos Aires',birthDate:'1990-01-01'},{aboutMe:'Bio',openTo:['Eventos'],spiritualPath:['Yoga']},true,answers);
 assert.ok(result.percent<full.percent);assert.equal(full.percent,100);
});
