const {test}=require('node:test'), assert=require('node:assert/strict'), ts=require('typescript'),fs=require('fs'),vm=require('vm');
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/reorderProfilePhotos.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api});
const rows=[{id:'a',order:0,is_primary:true,url:'owner/a.jpg'},{id:'b',order:1,is_primary:false,url:'owner/b.jpg'}];
test('swaps by identity while preserving photo paths and one primary',()=>{
 const result=api.reorderProfilePhotos(rows,0,1);
 assert.equal(result[0].order,1);assert.equal(result[1].order,0);
 assert.equal(result[1].is_primary,true);assert.equal(result[0].is_primary,false);
 assert.equal(result[0].url,'owner/a.jpg');assert.equal(rows[0].order,0);
});
test('moving to empty slot retains every photo and a primary',()=>{
 const result=api.reorderProfilePhotos(rows,0,5);
 assert.equal(result.length,2);assert.equal(result[0].order,5);assert.equal(result[1].is_primary,true);
});
test('rejects missing source and invalid slots without mutation',()=>{
 assert.throws(()=>api.reorderProfilePhotos(rows,4,0));
 assert.throws(()=>api.reorderProfilePhotos(rows,0,-1));
 assert.equal(rows[0].order,0);
});
