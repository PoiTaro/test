const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function includes(pattern, message) {
  assert(pattern.test(html), message);
}

includes(
  /function buildWeaponModel\(key,team,side=1,mobile=isTouch\)/,
  'The shared weapon model builder is missing'
);

for (const weapon of ['roller', 'charger', 'slosher', 'dualies']) {
  includes(
    new RegExp(`key==='${weapon}'`),
    `${weapon} must have its own 3D model branch`
  );
}

for (const geometry of [
  'BoxGeometry',
  'CylinderGeometry',
  'TorusGeometry',
  'SphereGeometry',
  'CircleGeometry'
]) {
  includes(
    new RegExp(`new THREE\\.${geometry}`),
    `Weapon models must use ${geometry} for a readable layered silhouette`
  );
}

includes(
  /inkGlass=new THREE\.MeshStandardMaterial\(\{[\s\S]*?transparent:true,opacity:\.72/,
  'Weapons must include a translucent glowing ink chamber'
);
includes(
  /teamMaterials\.push\([\s\S]*?color:'main'[\s\S]*?color:'light'[\s\S]*?color:'dark'/,
  'Weapon materials must react to team-color changes'
);
includes(
  /disposeWeaponGroups\(oldGroups,entity\.group\)/,
  'Weapon replacement must preserve materials shared by the mobile character body'
);
includes(
  /parts\.roller=roller/,
  'Roller must expose its rotating paint cylinder'
);
includes(
  /parts\.chargeGlow=chargeGlow/,
  'Charger must expose its animated charge core'
);
includes(
  /parts\.bucket=bucket/,
  'Slosher must expose its animated bucket'
);
includes(
  /const extra=buildWeaponModel\(key,team,-1,isTouch\)/,
  'Dualies must be built as a real mirrored pair'
);

includes(
  /function animateWeaponModel\(entity,dt,moveAmount=0\)[\s\S]*?parts\.roller[\s\S]*?parts\.bucket[\s\S]*?parts\.chargeGlow/,
  'Weapon-specific 3D animation hooks are missing'
);
includes(
  /if\(opts\.fromPlayer\)player\.weaponKick=1/,
  'Local firing must drive 3D recoil'
);
includes(
  /if\(m\.fp&&remote\)remote\.weaponKick=1/,
  'Remote firing must drive P2P recoil'
);
includes(
  /applyWeaponVisual\(b,'shooter'\)/,
  'Bots must use the rebuilt 3D shooter'
);

const animationCalls = html.match(/animateWeaponModel\(/g) || [];
assert(
  animationCalls.length >= 5,
  'Weapon animation must run for the local player, remote player, host bots, and guest bots'
);

const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
  .filter(([, attrs]) => !/\bsrc\s*=/.test(attrs) && !/type\s*=\s*["']application\//.test(attrs))
  .map(([, , source]) => source);
for (const source of scripts) new Function(source);

console.log('Weapon model test passed: five silhouettes, team materials, animation, bots, and P2P recoil.');
