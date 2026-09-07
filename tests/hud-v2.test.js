// DOM-light regression coverage for the presentation adapter; no WebGL required.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync('assets/hud-v2.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('assets/hud-v2.css','utf8');
const nodes=new Map();
function element(id='') {
  const classes=new Set();
  const el={attributes:{},style:{},dataset:{},children:[],
    classList:{add(name){classes.add(name);},toggle(name,on){on?classes.add(name):classes.delete(name);},contains(name){return classes.has(name);}},
    setAttribute(name,value){this.attributes[name]=value;},
    appendChild(child){this.children.push(child);},
    querySelector(){return this.children[0];},
  };
  Object.defineProperty(el,'id',{get(){return id;},set(value){id=value;nodes.set(id,el);}});
  Object.defineProperty(el,'innerHTML',{set(value){
    this.html=value;
    for(const match of value.matchAll(/\bid="([^"]+)"/g))element(match[1]);
  }});
  if(id)nodes.set(id,el);
  return el;
}
for(const match of html.matchAll(/\bid="([^"]+)"/g))element(match[1]);
nodes.get('specialCharge').children.push(element());
const chips=Array.from({length:8},()=>element());
const skull=element();
const document={
  getElementById(id){const node=nodes.get(id);assert(node,`Missing HUD node: ${id}`);return node;},
  createElementNS(){return element();},
  querySelector(){return skull;},querySelectorAll(){return chips;}
};
const context=vm.createContext({document});
vm.runInContext(source,context);
const run=code=>vm.runInContext(code,context);
const ink=nodes.get('inkArc'),clip=nodes.get('hudInkClipRect');
const resources=nodes.get('resourceHud'),charge=nodes.get('specialCharge');
assert.equal(ink.attributes['aria-valuenow'],'100');
assert(chips.every(chip=>chip.html.includes('<svg')),'All eight roster slots receive icons');
for(const [value,expected] of [[0,0],[.23,23],[.5,50],[1,100],[-1,0],[2,100]]){
  run(`InkHud.updateInk(${value},'A')`);
  assert.equal(ink.attributes['aria-valuenow'],String(expected));
  assert.equal(Number(clip.attributes.width),246*expected/100);
  assert.equal(resources.classList.contains('low-ink'),expected<25);
}
run("InkHud.updateInk(.5,'B')");
assert.equal(resources.dataset.team,'B');
for(const value of [0,.45,1]){
  run(`InkHud.updateSpecial(${value},${value===1})`);
  assert.equal(charge.attributes['aria-valuenow'],String(value*100));
  assert.equal(nodes.get('hudSpecialProgress').style.strokeDashoffset,String(100-value*100));
  assert.equal(resources.classList.contains('special-ready'),value===1);
}
run('InkHud.updateSpecial(0,false)');
assert(!resources.classList.contains('special-ready'),'SP resets after use');
for(const name of ['bomb','curling','sprinkler'])assert(run(`InkHud.icon('${name}')`).includes('<svg'));
for(const [remaining,total,seconds,progress] of [
  [2.6,2.6,3,1],[1.01,2.6,2,1.01/2.6],[.01,2.6,1,.01/2.6],[0,2.6,0,0],[-1,2.6,0,0]
]){
  const state=run(`InkHud.respawnState(${remaining},${total})`);
  assert.equal(state.seconds,seconds);
  assert.equal(state.progress,progress);
}
assert(html.indexOf('src="assets/hud-v2.js"')<html.indexOf('const WEAPON_LOADOUTS'),'Adapter loads before game initialization');
assert.match(html,/InkHud\.updateInk\(player\.ink,player\.team\)/);
assert.match(html,/InkHud\.updateSpecial\(value,value >= 1 && running && !player\.dead\)/);
assert.match(html,/stickEl\.offsetWidth\/2/);
assert.match(html,/killNoticeTimer=setTimeout\(\(\)=>killNoticeEl\.classList\.remove\('show'\),1550\)/);
assert.match(html,/document\.body\.classList\.add\('death-ui'\)/);
assert.match(html,/document\.body\.classList\.remove\('death-ui'\)/);
assert.match(css,/#weaponHud\s*\{\s*display:none!important/);
assert.match(css,/#killNotice\.show\s*\{\s*animation:killToastIn/);
assert.match(css,/conic-gradient\(var\(--death-accent\) calc\(var\(--respawn-progress\)/);
assert.match(css,/prefers-reduced-motion/);
assert.match(css,/bottom:var\(--kill-notice-bottom\)/,'Toast stays above the resource HUD, including safe-area insets');
assert.match(css,/--kill-notice-bottom:max\(19vh,/,'Toast is anchored in the lower part of the screen');
assert.match(css,/grid-template-areas:'image label' 'image weapon'/,'Weapon metadata stacks beside its icon');
assert.match(html,/class="deathEyebrow" aria-hidden="true">KNOCKED OUT/);
assert.match(css,/#killNotice\.show \{ animation:none;opacity:1;/,'Reduced motion keeps the kill confirmation visible until its timer clears it');
for(const file of ['assets/hud-v2.js','assets/hud-v2.css','assets/hud-splash.svg'])assert(fs.existsSync(file));
// Compile every inline script, without executing the game or accessing services.
for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
console.log('HUD v2 passed: initialization, 8 roster slots, ink/SP state, sub icons, input sizing, assets, script syntax.');
