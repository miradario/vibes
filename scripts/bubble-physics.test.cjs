const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript'),fs=require('node:fs'),vm=require('node:vm');
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/bubblePhysics.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api});
test('bubbles bounce when approaching and remain separate',()=>{
 const out=api.stepBubbles([{x:20,y:20,width:50,height:50,vx:20,vy:0},{x:71,y:20,width:50,height:50,vx:-20,vy:0}],300,400,1/30);
 assert.ok(out[0].vx<0&&out[1].vx>0);assert.ok(out[1].x-out[0].x>=54);
});
for(const [width,height] of [[320,300],[390,500],[768,800]])test(`ten bubbles stay in bounds without overlap at ${width}x${height}`,()=>{
 const columns=height<380?4:3,rows=Math.ceil(10/columns),cw=width/columns,ch=height/rows,size=Math.max(48,Math.min(82,cw-30,ch-48));
 let bodies=Array.from({length:10},(_,i)=>({x:(i%columns)*cw+6,y:Math.floor(i/columns)*ch+(ch-size-34)/2,width:size,height:size,vx:(i%2?-1:1)*(12+i%4*2),vy:(i%3?1:-1)*(10+i%3*3)}));
 for(let frame=0;frame<3600;frame++){
  bodies=api.stepBubbles(bodies,width,height,1/60);
  for(let i=0;i<bodies.length;i++){
   const a=bodies[i];assert.ok(a.x>=0&&a.y>=0&&a.x+a.width<=width+.001&&a.y+a.height<=height+.001);
   for(let j=i+1;j<bodies.length;j++){
    const b=bodies[j];
    const distance=Math.hypot(b.x+b.width/2-a.x-a.width/2,b.y+b.height/2-a.y-a.height/2);
    assert.ok(distance >= (a.width+b.width)/2-.05,`circle overlap at frame ${frame}`);
   }
  }
 }
});

test('overlapping label areas do not cause a bounce before circles touch',()=>{
 const out=api.stepBubbles([{x:20,y:20,width:50,height:50,vx:1,vy:0},{x:65,y:65,width:50,height:50,vx:-1,vy:0}],300,400,1/30);
 assert.equal(out[0].vx,1);assert.equal(out[1].vx,-1);
});
