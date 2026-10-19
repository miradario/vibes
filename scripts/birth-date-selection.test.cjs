const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const api={};
for(const file of ['src/lib/birthDate.ts','src/lib/birthDateSelection.ts']){
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api,Date});
}
const min=new Date(1900,0,1),max=new Date(2026,9,12);
test('changing month from a 31st selects the final valid day',()=>{
  assert.equal(api.formatBirthDate(api.selectBirthDateParts(2024,1,31,min,max)),'2024-02-29');
  assert.equal(api.formatBirthDate(api.selectBirthDateParts(2024,3,31,min,max)),'2024-04-30');
});
test('changing leap year preserves February and clamps the day',()=>{
  assert.equal(api.formatBirthDate(api.selectBirthDateParts(2025,1,29,min,max)),'2025-02-28');
  assert.equal(api.formatBirthDate(api.selectBirthDateParts(2000,1,29,min,max)),'2000-02-29');
});
test('wheel selections remain inside their minimum and maximum dates',()=>{
  assert.equal(api.formatBirthDate(api.selectBirthDateParts(1899,5,1,min,max)),'1900-01-01');
  assert.equal(api.formatBirthDate(api.selectBirthDateParts(2026,11,31,min,max)),'2026-10-12');
});
test('minimum-age limits keep the 18th birthday boundary intact',()=>{
  const adultMax=new Date(2008,9,12);
  const date=api.selectBirthDateParts(2008,9,13,min,adultMax);
  assert.equal(api.formatBirthDate(date),'2008-10-12');
  assert.equal(api.calculateAge(date,max),18);
  assert.equal(api.calculateAge(new Date(2008,9,13),max),17);
});
test('manual date parsing rejects impossible dates and round-trips local dates',()=>{
  assert.equal(api.parseBirthDate('2025-02-29'),null);
  assert.equal(api.parseBirthDate('2000-04-31'),null);
  assert.equal(api.formatBirthDate(api.parseBirthDate('1998-10-14')),'1998-10-14');
});
