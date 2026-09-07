const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {yukemuriBlueprint,yukemuriSteamEnvelope}=require('../stages/yukemuri');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const plan=yukemuriBlueprint();
const groundSurfaces=plan.decks.map(d=>({type:'rect',x:d.x,z:d.z,hw:d.w/2,hd:d.d/2,y:d.y,yaw:0,paintable:true}));
for(const r of plan.ramps){
 const dx=r.b[0]-r.a[0],dz=r.b[1]-r.a[1];
 groundSurfaces.push({type:'ramp',x:(r.a[0]+r.b[0])/2,z:(r.a[1]+r.b[1])/2,
  hw:r.w/2,hd:Math.hypot(dx,dz)/2,yStart:r.from,yEnd:r.to,yaw:Math.atan2(dx,dz)+Math.PI,paintable:true});
}
groundSurfaces.push({type:'ring',x:0,z:0,...plan.plaza,paintable:true});
const obstacles=[{x:0,z:0,hw:4.3,hd:4.3,yMin:3,h:22},...plan.covers.map(([x,z,w,d])=>({x,z,hw:w/2,hd:d/2,yMin:Math.abs(x)>30?5.8:3,h:(Math.abs(x)>30?5.8:3)+1.5}))];
// Execute production collision/height functions, not a second implementation.
const context=vm.createContext({groundSurfaces,THREE:{MathUtils:{lerp:(a,b,t)=>a+(b-a)*t}}});
const surfaceCode=html.slice(html.indexOf('function surfaceLocal('),html.indexOf('function registerGround('));
const heightCode=html.slice(html.indexOf('function surfaceHeightAtPoint('),html.indexOf('function rebuildPaintMask('));
vm.runInContext(surfaceCode+heightCode,context);
const {surfaceContains,surfaceHeightAtPoint:heightAt}=context;
const failures=[];
for(const [routeIndex,original] of plan.routes.entries())for(const reverse of [false,true])for(const offset of [-2.4,0,2.4]){
 const route=reverse?[...original].reverse():original;
 let last=null;
 for(let seg=0;seg<route.length-1;seg++){
  const a=route[seg],b=route[seg+1],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),steps=Math.ceil(len/.2);
  for(let i=0;i<=steps;i++){
   const t=i/steps,off=offset*Math.min(1,t*5,(1-t)*5);
   const x=a[0]+dx*t-dz/len*off,z=a[1]+dz*t+dx/len*off;
   const y=heightAt(x,z,last===null?999:last);
   const error=!Number.isFinite(y)?'no ground':last!==null&&Math.abs(y-last)>.3?'height seam':obstacles.some(o=>y>=o.yMin-.2&&y<o.h-.12&&Math.abs(x-o.x)<o.hw+.65&&Math.abs(z-o.z)<o.hd+.65)?'collider':null;
   if(error){failures.push({routeIndex,reverse,offset,seg,x,z,y,last,error});break;}
   last=y;
  }
 }
}
assert.deepEqual(failures,[],'all three routes must be walkable both ways with a 4.8m corridor');
assert.equal(plan.routes.length,3);
assert.equal(groundSurfaces.length,23,'keep movement geometry small and independent of decoration');
assert(!groundSurfaces.some(s=>surfaceContains(s,0,0)),'fountain is not paintable ground');
for(const s of [-1,1])for(const [dx,dz] of [[0,0],[3.5,.5],[-1,3.5],[1.5,-3],[-3.5,-.5]]){
 assert.equal(heightAt(dx,50*s+dz),1.6,'all spawn roster offsets have ground');
}
for(let x=-55;x<=55;x+=2)for(let z=-59;z<=59;z+=2){
 const a=heightAt(x,z),b=heightAt(-x,-z);
 assert(a===b||Math.abs(a-b)<1e-9,'180-degree mirrored terrain must agree');
 const heights=groundSurfaces.filter(s=>surfaceContains(s,x,z)).map(s=>context.surfaceHeight(s,x,z));
 assert(heights.length<2||Math.max(...heights)-Math.min(...heights)<.001,'no overlapping floors with different heights');
}
for(const t of [0,7.99,14,28])assert.equal(yukemuriSteamEnvelope(t),0);
assert.equal(yukemuriSteamEnvelope(8.5),.5);
assert.equal(yukemuriSteamEnvelope(11),1);
assert.equal(yukemuriSteamEnvelope(13),.5);
for(let t=0;t<42;t+=.1)assert(Math.abs(yukemuriSteamEnvelope(t)-yukemuriSteamEnvelope(t+14))<1e-12);
assert(html.includes('yukemuri_junction:{name:'));
assert(html.includes('<option value="yukemuri_junction" selected>'));
assert(html.includes('activeStage=STAGE_DEFINITIONS[resolved].build()'));
assert(html.includes('if(m.stageId&&!Object.hasOwn(STAGE_DEFINITIONS,m.stageId))'));
console.log('Yukemuri passed: 23 surfaces, 3 bidirectional wide routes, symmetric spawns, paint mask, steam and selection.');
