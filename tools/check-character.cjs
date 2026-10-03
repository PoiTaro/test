// Usage: node tools/check-character.cjs /absolute/path/to/three-r128.min.js
const assert=require('node:assert/strict');
const T=require(process.argv[2]||'three'),C=require('../assets/character-v7.js');
const orange={main:0xff7416,light:0xffc64a,dark:0xa73609},purple={main:0x8a27ed,light:0xcf85ff,dark:0x3a1168};
const a=C.create(T,orange,'self'),b=C.create(T,purple,'bot');
const meshes=x=>{const list=[];x.group.traverse(o=>{if(o.isMesh)list.push(o);});return list;};
const am=meshes(a),bm=meshes(b);assert.equal(am.length,bm.length);
assert(am.some((o,i)=>o.geometry===bm[i].geometry),'Actors reuse geometry');assert(am.every((o,i)=>o.material!==bm[i].material),'Actor materials must be isolated');
const human=a.teamMaterials.find(x=>x.material.name==='team-main').material;
a.squid.traverse(o=>{if(o.isMesh){o.material.transparent=true;o.material.opacity=.2;}});assert.equal(human.opacity,1,'Stealth does not fade human hair or tank');
const before=b.teamMaterials.find(x=>x.material.name==='team-main').material.color.clone();for(const e of a.teamMaterials)e.material.color.setHex(0x0000ff);assert(before.equals(b.teamMaterials.find(x=>x.material.name==='team-main').material.color),'Recoloring one actor must not recolor another');
for(let i=0;i<180;i++){a.vy=i<60?2:0;a.ink=i/180;C.update(a,1/60,1,i/60);a.group.traverse(o=>assert(o.quaternion.toArray().every(Number.isFinite),'All animation transforms remain finite'));}
assert(a.rig.shins.some(o=>Math.abs(o.rotation.x)>.01));assert.equal(a.rig.inkFill.scale.y,179/180);
for(const o of am)assert(o.geometry.attributes.position.array.every(Number.isFinite));
console.log('Character v7: real Three.js creation, geometry reuse, actor/form material isolation, animation and ink level passed.');
