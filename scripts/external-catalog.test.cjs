const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const data=JSON.parse(fs.readFileSync('assets/catalog/buenos-aires-classes.json','utf8'));
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/learning/externalCatalog.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,{exports:api,require:()=>data,Intl});
const filters={query:'',specialty:'',location:'',modality:'',date:''};
test('all nine external references retain their actual unknown fields and valid place links',()=>{
 assert.equal(api.externalClasses.length,9);assert.equal(api.externalPlaces.length,5);
 assert.equal(new Set(api.externalClasses.map(item=>item.id)).size,9);
 for(const item of api.externalClasses){assert.ok(api.placeForClass(item));assert.equal(item.reserva_en_vibes_habilitada,false);assert.equal(item.proxima_fecha_confirmada,null);assert.equal(item.cupo_maximo,null);assert.ok(item.fuentes.every(source=>source.url.startsWith('https://')));}
});
test('unknown price is never displayed as free and only published zero is free',()=>{
 assert.equal(api.externalPrice(data.clases[2]),'Precio a consultar');
 assert.equal(api.externalPrice(data.clases[8]),'Gratis');
 assert.match(api.externalPrice(data.clases[0]),/45.000/);
});
test('weekly schedules stay as weekly text without inferred next dates',()=>{
 assert.match(api.externalSchedule(data.clases[0]),/Lunes 09:00/);
 assert.equal(api.externalSchedule(data.clases[5]),'Horarios a consultar');
 assert.equal(api.matchesExternalClass(data.clases[0],{...filters,date:'2026-10-26'}),false);
});
test('search includes teachers, neighborhoods, and disciplines without accents',()=>{
 assert.equal(api.matchesExternalClass(data.clases[2],{...filters,query:'pilheu'}),true);
 assert.equal(api.matchesExternalClass(data.clases[2],{...filters,location:'palermo',specialty:'5 Ritmos'}),true);
 assert.equal(api.matchesExternalClass(data.clases[6],{...filters,specialty:'Meditacion'}),true);
 assert.equal(api.matchesExternalClass(data.clases[0],{...filters,specialty:'Tantra'}),false);
});
test('mixed modality matches in person and online, unknown modality does not promise either',()=>{
 for(const modality of ['in_person','online','mixed']) assert.equal(api.matchesExternalClass(data.clases[5],{...filters,modality}),true);
 assert.equal(api.matchesExternalClass(data.clases[6],{...filters,modality:'online'}),false);
});
