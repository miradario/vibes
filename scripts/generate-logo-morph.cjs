// Generate compatible contours from the actual Josefin font to the flat brand mark.
const fs=require('node:fs');
const opentype=require(process.env.VIBES_OPENTYPE_MODULE||'opentype.js');
const font=opentype.loadSync('assets/font/JosefinSans-Regular.ttf');
const N=160;
function cubic(a,b,c,d,t){const u=1-t;return [0,1].map(k=>u*u*u*a[k]+3*u*u*t*b[k]+3*u*t*t*c[k]+t*t*t*d[k]);}
function contours(path){let out=[],p=[],point=[0,0];for(const c of path.commands){if(c.type==='M'){if(p.length)out.push(p);p=[];point=[c.x,c.y];p.push(point);}else if(c.type==='L'){point=[c.x,c.y];p.push(point);}else if(c.type==='C'||c.type==='Q'){const a=point,d=[c.x,c.y];let b,c2;if(c.type==='Q'){const q=[c.x1,c.y1];b=a.map((v,k)=>v+2/3*(q[k]-v));c2=d.map((v,k)=>v+2/3*(q[k]-v));}else{b=[c.x1,c.y1];c2=[c.x2,c.y2];}for(let i=1;i<=24;i++)p.push(cubic(a,b,c2,d,i/24));point=d;}else if(c.type==='Z'){if(p.length)out.push(p);p=[];}}if(p.length)out.push(p);return out;}
function sample(points){const closed=[...points,points[0]],lens=[0];for(let i=1;i<closed.length;i++)lens.push(lens.at(-1)+Math.hypot(closed[i][0]-closed[i-1][0],closed[i][1]-closed[i-1][1]));const length=lens.at(-1);let j=1;return Array.from({length:N},(_,i)=>{const at=i*length/N;while(j<lens.length-1&&lens[j]<at)j++;const t=(at-lens[j-1])/(lens[j]-lens[j-1]||1);return [0,1].map(k=>+(closed[j-1][k]+t*(closed[j][k]-closed[j-1][k])).toFixed(3));});}
function area(p){return p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2;}
function top(p){const index=p.reduce((best,v,i)=>v[1]<p[best][1]?i:best,0);return [...p.slice(index),...p.slice(0,index)];}
function circle(x,y,r){return Array.from({length:128},(_,i)=>[x+Math.cos(i*Math.PI/64)*r,y+Math.sin(i*Math.PI/64)*r]);}
function curve(a,b,c,d){return Array.from({length:33},(_,i)=>cubic(a,b,c,d,i/32));}
function stroke(points){points=points.filter((p,i)=>i===0||Math.hypot(p[0]-points[i-1][0],p[1]-points[i-1][1])>0.001);const normals=points.map((p,i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy);return[-dy/l,dx/l];});const left=points.map((p,i)=>[p[0]+normals[i][0]*21,p[1]+normals[i][1]*21]);const right=points.map((p,i)=>[p[0]-normals[i][0]*21,p[1]-normals[i][1]*21]);const cap=(p,n)=>{const angle=Math.atan2(n[1],n[0]);return Array.from({length:17},(_,i)=>[p[0]+21*Math.cos(angle-i*Math.PI/16),p[1]+21*Math.sin(angle-i*Math.PI/16)]);};return [...left,...cap(points.at(-1),normals.at(-1)),...right.reverse(),...cap(points[0],normals[0].map(v=>-v))];}
const hands=stroke([...curve([496,819],[512,879],[563,935],[627,935]),...curve([627,935],[691,935],[742,879],[758,819])]);
const leaf=[...curve([627,486],[581,534],[511,598],[511,650]),...curve([511,650],[511,705],[565,764],[627,820]),...curve([627,820],[689,764],[743,705],[743,650]),...curve([743,650],[743,598],[673,534],[627,486])];
const leftLeg=stroke([...curve([297,1047],[286,1126],[433,1104],[554,1056]),...curve([554,1056],[589,1042],[608,1014],[627,1014])]);
const rightLeg=stroke([...curve([627,1014],[652,1014],[678,1043],[714,1058]),...curve([714,1058],[836,1108],[955,1122],[958,1047])]);
const targets=[[hands],[circle(627,410,54),circle(627,249,95)],[leftLeg],[leaf],[rightLeg]];
const colors=['#2B2B2B','#F4A340','#2B2B2B','#3978B8','#2B2B2B'];const size=300,width=font.getAdvanceWidth('Vibes',size);const glyphs=font.getPaths('Vibes',(1254-width)/2,735,size);
// Fill the e's upper bowl while retaining its open lower curve.
glyphs[3].commands.splice(14,10,{type:'L',x:761.55,y:670.5});
// Tighten the e/s gap and keep the complete word centered. Logo targets stay unchanged.
glyphs.forEach((path,index)=>path.commands.forEach(command=>{
  const offset=index===4?-9:9;
  for(const key of ['x','x1','x2']) if(typeof command[key]==='number') command[key]+=offset;
}));
const shapes=glyphs.map((path,i)=>{const source=contours(path).sort((a,b)=>Math.abs(area(b))-Math.abs(area(a)));return {letter:'Vibes'[i],part:['arms','spheres','left_leg','blue_symbol','right_leg'][i],color:colors[i],contours:source.map((points,index)=>{const from=top(sample(points));let to;const destination=targets[i][index];if(destination){let target=sample(destination);if(Math.sign(area(target))!==Math.sign(area(from)))target.reverse();to=top(target);}else{const target=targets[i][0],x=target.reduce((s,p)=>s+p[0],0)/target.length,y=target.reduce((s,p)=>s+p[1],0)/target.length;to=Array.from({length:N},()=>[+x.toFixed(3),+y.toFixed(3)]);}return{from,to,...(i===1&&index===1?{color:"#D88C7A"}:{})};})};});
fs.writeFileSync('assets/branding/vibes-logo-morph.json',JSON.stringify(shapes));console.log('Generated real Josefin letter outlines and matching logo contours.');
