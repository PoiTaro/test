const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const events=[],nodes=new Map();
for(const match of html.matchAll(/\bid="([^"]+)"/g))nodes.set(match[1],{
  style:{},dataset:{},clientWidth:300,clientHeight:400,hidden:true,
  appendChild(){},setAttribute(){},classList:{add(){}},
});
nodes.get('title').style.display='none';
nodes.get('homeStageCanvas').parentElement={classList:{add(){events.push('thumbnail');}}};
nodes.get('homeStageCanvas').getContext=()=>({drawImage(){}});
const vector=()=>({set(){return this;},multiplyScalar(){return this;}});
class Camera { constructor(){this.position=vector();}lookAt(){}updateProjectionMatrix(){} }
class Scene { add(){} }
class Light { constructor(){this.position=vector();} }
class Renderer {
  constructor(){events.push('renderer-created');this.domElement={setAttribute(){},addEventListener(){}};}
  setPixelRatio(){}setClearColor(){}setSize(){}render(){events.push('avatar-render');}
}
let stage='yukemuri',weapon='shooter';
const context=vm.createContext({document:{hidden:false,getElementById:id=>{assert(nodes.has(id),id);return nodes.get(id);},querySelectorAll:()=>[]},window:{matchMedia:()=>({matches:true})},devicePixelRatio:2});
vm.runInContext(fs.readFileSync('assets/home-v4.js','utf8'),context);
context.options={THREE:{PerspectiveCamera:Camera,WebGLRenderer:Renderer,Scene,HemisphereLight:Light,DirectionalLight:Light},
  renderer:{domElement:{clientWidth:844,clientHeight:390},render(){events.push('stage-render');}},scene:{},
  createKid:()=>({group:{rotation:{},position:{}},marker:{}}),simplifyKidForMobile(){},
  applyWeaponVisual:(entity,key)=>events.push('weapon:'+key),loadStage:id=>events.push('stage:'+id),
  getStage:()=>stage,getWeapon:()=>weapon,weaponImage:()=>''};
vm.runInContext('var view=InkHome.create(options);view.render(.04,0)',context);
assert.equal(events.length,0,'No home rendering while hidden');
nodes.get('title').style.display='grid';
vm.runInContext('view.render(.04,1);view.render(.04,1.01);view.render(.04,1.05)',context);
assert.equal(events.filter(x=>x==='renderer-created').length,1,'Reuse one avatar renderer');
assert.equal(events.filter(x=>x==='stage:yukemuri').length,1,'Do not rebuild the stage each frame');
assert.equal(events.filter(x=>x==='thumbnail').length,1,'Capture preview only when needed');
assert.equal(events.filter(x=>x==='avatar-render').length,2,'Throttle preview to 30fps');
weapon='roller';stage='saltSpire';
vm.runInContext('view.render(.04,2)',context);
assert(events.includes('weapon:roller'),'Selected weapon updates the avatar');
assert(events.includes('stage:saltSpire'),'Selected stage updates the backdrop');
assert.equal(events.filter(x=>x==='thumbnail').length,2);
nodes.get('title').style.display='none';
const count=events.length;vm.runInContext('view.render(.04,3)',context);assert.equal(events.length,count);
assert.match(html,/if\(!running&&homeView\.visible\(\)\) homeView\.render/);
assert.match(html,/else renderer\.render\(scene, camera\)/,'Battle keeps its own camera');
assert.equal((html.match(/id="titlePlayerName"/g)||[]).length,1);
for(const id of ['btnOnline','btnFriend','startBtn','titleWeaponBtn','titleSettingsBtn','titleStageSwitch'])assert(html.includes(`id="${id}"`));
assert(!html.includes("--font-game:'Dela Gothic One'"));
console.log('Home v4 passed: hidden state, frame throttle, shared stage, weapon changes, thumbnail refresh, battle camera and navigation hooks.');
