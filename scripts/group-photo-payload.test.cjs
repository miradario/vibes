const {test}=require('node:test'),assert=require('node:assert/strict'),ts=require('typescript'),fs=require('fs'),vm=require('vm');
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/groupPhotoPayload.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api,atob});
test('detects actual edited image format without trusting picker MIME metadata',()=>{
 for(const [bytes,type] of [[[255,216,255,224],'image/jpeg'],[[137,80,78,71,13,10,26,10],'image/png'],[Array.from(Buffer.from('RIFFxxxxWEBP')),'image/webp']]) {
  const output=api.groupPhotoPayload(Buffer.from(bytes).toString('base64'));
  assert.equal(output.type,type);assert.equal(output.body.byteLength,bytes.length);
 }
});
test('rejects empty, unsupported and oversize uploads before storage',()=>{
 assert.throws(()=>api.groupPhotoPayload(''));
 assert.throws(()=>api.groupPhotoPayload(Buffer.from('not an image').toString('base64')));
 assert.throws(()=>api.groupPhotoPayload(Buffer.alloc(10485761).toString('base64')),/10 MB/);
});
