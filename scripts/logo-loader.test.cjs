const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const vm=require('node:vm');
const data=JSON.parse(fs.readFileSync('assets/branding/vibes-logo-morph.json','utf8'));
const morph={};
const api={};
const compile=file=>ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
vm.runInNewContext(compile('src/illustrations/logoMorph.ts'),{exports:morph,require:()=>data,Math});
vm.runInNewContext(compile('src/illustrations/logoLoader.ts'),{exports:api,require:()=>morph,Math});
test('each actual logo piece becomes a ring segment with the same color',()=>{
  assert.equal(api.logoLoaderShapes.length,6);
  api.logoLoaderShapes.forEach((shape,i)=>{
    assert.equal(shape.color,morph.logoMorphRenderShapes[i].color);
    assert.equal(JSON.stringify(shape.from),JSON.stringify(morph.logoMorphRenderShapes[i].contours[0].to));
    assert.equal(shape.from.length,shape.to.length);
    for(const [x,y] of shape.to){
      const radius=Math.hypot(x-627,y-627);
      assert.ok(radius>=330-0.001&&radius<=430+0.001);
    }
  });
});
test('deconstruction and reconstruction stay finite and inside the viewport',()=>{
  for(const shape of api.logoLoaderShapes) for(let i=0;i<=100;i++){
    const path=api.logoLoaderPath(shape,i/100);
    assert.doesNotMatch(path,/NaN|Infinity/);
    const numbers=path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g).map(Number);
    for(const n of numbers) assert.ok(n>=0&&n<=1254,`${shape.key}: ${n}`);
  }
});
test('only the assembled circle rotates; both sides of the loop show the complete logo',()=>{
  assert.equal(api.logoLoaderFrame(0).morph,0);
  assert.equal(api.logoLoaderFrame(1).morph,0);
  for(const phase of [0.12,0.2,0.39]) assert.equal(api.logoLoaderFrame(phase).rotation,0);
  for(const phase of [0.4,0.5,0.7]) assert.equal(api.logoLoaderFrame(phase).morph,1);
  assert.equal(api.logoLoaderFrame(0.72).rotation,360);
  assert.equal(api.logoLoaderFrame(1).rotation%360,api.logoLoaderFrame(0).rotation);
});
