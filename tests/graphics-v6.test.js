const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const events={captures:0,disposed:0,canvases:0};
class Geometry{dispose(){events.disposed++;}}
class Material{constructor(options){Object.assign(this,options);this.color={multiplyScalar(){}};}dispose(){events.disposed++;}}
class Texture{constructor(canvas){this.image=canvas;this.repeat={set(){}};}clone(){return new Texture(this.image);}}
const THREE={Scene:class{add(){}},Mesh:class{constructor(g,m){this.material=m;this.position={set(){}};this.rotation={};}lookAt(){}},
 MeshBasicMaterial:Material,SphereGeometry:Geometry,PlaneGeometry:Geometry,CanvasTexture:Texture,
 PMREMGenerator:class{fromScene(){events.captures++;return {texture:{id:events.captures}};}dispose(){events.disposed++;}},sRGBEncoding:3001,RepeatWrapping:1000};
const context=vm.createContext({THREE,renderer:{capabilities:{getMaxAnisotropy:()=>16}},document:{createElement(){events.canvases++;return {getContext:()=>({createImageData:()=>({data:new Uint8ClampedArray(256*256*4)}),putImageData(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})};}}});
vm.runInContext(fs.readFileSync('assets/graphics-v6.js','utf8')+'\nthis.graphics=InkGraphics;',context);
const {graphics,renderer}=context;
const day=graphics.environment(THREE,renderer,false),dusk=graphics.environment(THREE,renderer,true);
assert.notEqual(day,dusk);assert.equal(graphics.environment(THREE,renderer,false),day);assert.equal(events.captures,2,'Switching stages reuses reflection render targets');
assert.equal(events.disposed,18,'Temporary capture geometry/materials and generators are released');
for(const kind of ['stone','roof','wood','plaster']){
 const first=graphics.surface(THREE,renderer,kind);assert.equal(graphics.surface(THREE,renderer,kind),first);
 assert.notEqual(first.map,first.bump);assert.equal(first.map.image,first.bump.image);assert.equal(first.map.encoding,3001);assert.notEqual(first.bump.encoding,3001);
 assert.equal(first.map.anisotropy,4);
}
assert.equal(events.canvases,4,'Surface maps are shared, not recreated per building');
console.log('Graphics v6 passed: environment reuse, capture cleanup, texture reuse and separate color/height encoding.');
