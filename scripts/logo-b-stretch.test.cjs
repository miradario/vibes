const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const data=JSON.parse(fs.readFileSync('assets/branding/vibes-logo-morph.json','utf8'));
const api={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/illustrations/logoMorph.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:api,require:()=>data});
const b=data.find(shape=>shape.letter==='b');
const contours=path=>path.match(/M[^Z]+Z/g).map(contour=>Array.from(contour.matchAll(/[ML]([^ ]+) ([^MLZ]+)/g),match=>[Number(match[1]),Number(match[2])]));
function originalPath(shape,t){let path='';for(const contour of shape.contours){for(let i=0;i<contour.from.length;i++){const from=contour.from[i],to=contour.to[i];path+=(i?'L':'M')+(from[0]+(to[0]-from[0])*t)+' '+(from[1]+(to[1]-from[1])*t)}path+='Z'}return path}
test('the b keeps the original letter and final leg outlines',()=>{
 assert.equal(api.logoMorphPath(b,0),originalPath(b,0));
 const final=contours(api.logoMorphPath(b,1));
 final.forEach((contour,index)=>contour.forEach((point,i)=>point.forEach((value,axis)=>assert.ok(Math.abs(value-b.contours[index].to[i][axis])<1e-9))));
});
test('the stem and bowl remain a single continuous outline throughout the transformation',()=>{
 for(const t of [0.1,0.25,0.5,0.75,0.99]){
  const parts=contours(api.logoMorphPath(b,t));
  assert.equal(parts.length,2);
  assert.deepEqual(parts[0],contours(originalPath(b,t))[0]);
  const stem=parts[0];
  const area=Math.abs(stem.reduce((sum,p,i)=>{const q=stem[(i+1)%stem.length];return sum+p[0]*q[1]-q[0]*p[1]},0)/2);
  assert.ok(area>10,`stem must remain visible at ${t}`);
  assert.ok(parts.flat(2).every(Number.isFinite));
 }
});
test('the counter closes without becoming a separate descending disk',()=>{
 for(const t of [0.22,0.4,0.6,0.8]){
  const counter=contours(api.logoMorphPath(b,t))[1];
  assert.ok(counter.every(point=>Math.abs(point[0]-counter[0][0])<1e-9&&Math.abs(point[1]-counter[0][1])<1e-9));
 }
});
test('all other letters retain their exact previous movement',()=>{
 for(const shape of data.filter(shape=>shape.letter!=='b'))for(const t of [0,0.2,0.5,0.8,1])assert.equal(api.logoMorphPath(shape,t),originalPath(shape,t));
});
