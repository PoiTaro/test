// Regression: a normal U-turn used to trigger the old net-displacement stuck
// detector, reset a route to home and ultimately warp a Bot through the arena.
// Run the actual gameplay movement, collisions and waypoint functions in Node.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const stage=fs.readFileSync(path.join(__dirname,'../stages/yukemuri.js'),'utf8');
const {yukemuriBlueprint}=require('../stages/yukemuri');
const plan=yukemuriBlueprint();
class Vector3{
 constructor(x=0,y=0,z=0){this.set(x,y,z);}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
 copy(v){return this.set(v.x,v.y,v.z);}
 clone(){return new Vector3(this.x,this.y,this.z);}
 add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}
 length(){return Math.hypot(this.x,this.y,this.z);}
 normalize(){const l=this.length()||1;this.x/=l;this.y/=l;this.z/=l;return this;}
}
const grounds=plan.decks.map(d=>({type:'rect',x:d.x,z:d.z,hw:d.w/2,hd:d.d/2,y:d.y,yaw:0}));
for(const r of plan.ramps)grounds.push({type:'ramp',x:(r.a[0]+r.b[0])/2,z:(r.a[1]+r.b[1])/2,
 hw:r.w/2,hd:Math.hypot(r.b[0]-r.a[0],r.b[1]-r.a[1])/2,yStart:r.from,yEnd:r.to,yaw:Math.atan2(r.b[0]-r.a[0],r.b[1]-r.a[1])+Math.PI});
grounds.push({type:'ring',x:0,z:0,...plan.plaza});
const obstacles=[{x:0,z:0,hw:4.3,hd:4.3,yMin:3,h:22}];
for(const [x,z,w,d] of plan.covers){const y=Math.abs(x)>30?5.8:3;obstacles.push({x,z,hw:w/2,hd:d/2,yMin:y,h:y+1.5});}
const context=vm.createContext({
 groundSurfaces:grounds,obstacles,mode:'solo',isHost:false,isTouch:false,
 activeMatchSettings:{botDifficulty:'normal'},activeStage:{config:{clampBounds:false,killY:-6},botGraph:{routes:plan.routes,patrol:true}},
 THREE:{Vector3,MathUtils:{lerp:(a,b,t)=>a+(b-a)*t}},tmpV:new Vector3(),bots:[],
 inkAt:(x,z)=>z>43?1:z< -43?2:0,performance:{now:()=>0},
 animateWeaponModel(){},foePositions:()=>[],damageBot(){}
});
const fn=name=>{const start=html.indexOf('function '+name+'(');assert(start>=0);return html.slice(start,html.indexOf('\n}',start)+2);};
vm.runInContext(stage+['surfaceLocal','surfaceContains','surfaceHeight','surfaceHeightAtPoint','groundHeightAt','collideObstacles','projectBotWaypoint','pickBotTarget','updateBots'].map(fn).join('\n'),context);
for(const team of ['A','B'])for(let route=0;route<3;route++){
 const home=new Vector3(0,1.6,team==='A'?50:-50);
 const b={active:true,team,dead:false,hp:100,pos:home.clone(),home,homeOff:new Vector3(),
  target:new Vector3(),routeIndex:route,routeStep:-1,stuckT:0,stuckCount:0,edgeBlockedT:0,
  lastProgressPos:home.clone(),fireCd:Infinity,enemyInkT:Infinity,group:{position:new Vector3(),rotation:{y:0}}};
 context.bots=[b];context.pickBotTarget(b);
 let minZ=50,maxZ=-50;const visited=new Set();
 for(let i=0;i<4800;i++){
  const before=b.pos.clone();context.updateBots(.05);
  assert(Math.hypot(before.x-b.pos.x,before.z-b.pos.z)<=.426,`${team}/${route} warped at tick ${i}`);
  assert(Number.isFinite(context.groundHeightAt(b.pos.x,b.pos.z,999)),'Bot left playable ground');
  assert.equal(b.stuckCount,0,`${team}/${route}: false stuck detection`);
  minZ=Math.min(minZ,b.pos.z);maxZ=Math.max(maxZ,b.pos.z);visited.add(b.routeIndex);
 }
 assert(minZ<-45&&maxZ>45,'Bot must reach both spawn approaches');
 assert.equal(visited.size,3,'Bot must patrol all three routes');
}
console.log('Yukemuri Bots passed: 6 × 240 simulated seconds; no gaps, false stuck detection or rescue warps.');
