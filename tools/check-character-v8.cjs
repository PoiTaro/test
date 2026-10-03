// Usage: node tools/check-character-v8.cjs /absolute/path/to/three-r128.min.js
const assert=require('node:assert/strict');
const T=require(process.argv[2]||'three'),C=require('../assets/character-v8.js');
const orange={main:0xff7416,light:0xffc64a,dark:0xa73609},purple={main:0x8a27ed,light:0xcf85ff,dark:0x3a1168};
const a=C.create(T,orange,'self'),b=C.create(T,purple,'bot');
const meshes=x=>{const list=[];x.group.traverse(o=>{if(o.isMesh)list.push(o);});return list;};
const mats=o=>Array.isArray(o.material)?o.material:[o.material],am=meshes(a),bm=meshes(b);
assert.equal(a.modelVersion,8);assert.equal(am.length,bm.length);
assert(am.every((o,i)=>o.geometry===bm[i].geometry),'Actors must reuse immutable geometry');
assert(am.every((o,i)=>mats(o).every((m,j)=>m!==mats(bm[i])[j])),'Actor materials must be isolated');
const skins=am.filter(o=>o.isSkinnedMesh);assert.equal(skins.length,4);
for(const o of am){assert(o.geometry.attributes.position.array.every(Number.isFinite));assert(o.geometry.attributes.normal.array.every(Number.isFinite));}
for(const o of skins){
 assert(o.material.skinning,'Skinning must be enabled in the shader');
 const peer=b.group.getObjectByName(o.name);assert(o.skeleton.bones.every((bone,i)=>bone!==peer.skeleton.bones[i]),'Skeletons must belong to their own actor');
 const w=o.geometry.attributes.skinWeight;for(let i=0;i<w.count;i++)assert(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-6);
}
const arm=skins.find(o=>o.name==='right-arm-continuous'),v=arm.geometry.attributes.position,mid=Math.floor(v.count*.70);
a.group.updateMatrixWorld(true);const before=arm.boneTransform(mid,new T.Vector3().fromBufferAttribute(v,mid)).clone();
a.rig.forearms[1].rotation.x=.9;a.group.updateMatrixWorld(true);const after=arm.boneTransform(mid,new T.Vector3().fromBufferAttribute(v,mid));
assert(before.distanceTo(after)>.02,'Elbow rotation must deform the continuous arm surface');
assert(Math.abs(b.rig.forearms[1].rotation.x)<1e-10,'Animating one actor must not animate another');
const human=a.teamMaterials.find(x=>x.material.name==='team-main').material;
a.squid.traverse(o=>{if(o.isMesh)for(const m of mats(o)){m.transparent=true;m.opacity=.2;}});assert.equal(human.opacity,1,'Stealth must not fade human hair or tank');
const colorBefore=b.teamMaterials.find(x=>x.material.name==='team-main').material.color.clone();for(const e of a.teamMaterials)e.material.color.setHex(0x0000ff);assert(colorBefore.equals(b.teamMaterials.find(x=>x.material.name==='team-main').material.color));
for(let i=0;i<180;i++){a.vy=i<60?2:0;a.ink=i/180;C.update(a,1/60,1,i/60);a.group.traverse(o=>assert(o.quaternion.toArray().every(Number.isFinite)));}
assert(a.rig.shins.some(o=>Math.abs(o.rotation.x)>.01));assert.equal(a.rig.inkFill.scale.y,179/180);
const shooter=C.createShooter(T,orange);shooter.position.set(.15,1.13,.10);shooter.scale.setScalar(.88);a.group.remove(a.gun);a.group.add(shooter);a.gun=shooter;a.vy=0;C.update(a,.05,0,0);a.group.updateMatrixWorld(true);
for(let i=0;i<2;i++){const target=shooter.localToWorld(new T.Vector3(i===0?-.12:0,-.14,i===0?.24:0));const wrist=a.rig.hands[i].getWorldPosition(new T.Vector3());assert(wrist.distanceTo(target)<.04,'Wrist must reach the gun grip');}
console.log(JSON.stringify({version:8,meshes:am.length,skinnedMeshes:skins.length,checks:['geometry','shader skinning','weights','deformation','skeleton isolation','material isolation','stealth','animation','ink','grip contact']},null,2));
