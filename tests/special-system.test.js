const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');

function includes(pattern, message) {
  assert(pattern.test(html), message);
}

// Regression: #hud disables pointer events, so actionable children must opt back in.
includes(
  /\.tbtn\s*\{[^}]*pointer-events\s*:\s*auto[^}]*touch-action\s*:\s*none/s,
  'Touch HUD buttons must remain interactive inside #hud'
);
includes(
  /bindTouchAction\('btnSpecial',\s*\(\)\s*=>\s*activateSpecial\(\)\)/,
  'Special button must invoke activation directly'
);
includes(
  /function activateSpecial\(\)\s*\{[\s\S]*?return false;[\s\S]*?return true;/,
  'Special activation must report rejected and successful activation'
);

for (const type of ['overdrive', 'barrier', 'inkRain', 'megaCannon']) {
  includes(
    new RegExp(`type==='${type}'`),
    `${type} must have a dedicated implementation`
  );
}

includes(
  /function makeSpecialVisual\([\s\S]*?TorusGeometry[\s\S]*?OctahedronGeometry[\s\S]*?IcosahedronGeometry[\s\S]*?CylinderGeometry/,
  'Specials must build dedicated 3D geometry'
);
includes(
  /function damageSpecialArea\([\s\S]*?damagePlayer\([\s\S]*?damageBot\(/,
  'Special area damage must affect players and bots'
);
includes(
  /player\.overdriveT=9;/,
  'Overdrive must last nine seconds'
);
includes(
  /const rateBoost=player\.overdriveT>0\?\.42:1;/,
  'Overdrive must substantially improve fire rate'
);
includes(
  /if\(player\.overdriveT>0\) speed\*=1\.4;/,
  'Overdrive must substantially improve movement speed'
);
includes(
  /const damageBoost=overdriveShot\?1\.38:1;/,
  'Overdrive must improve weapon damage'
);
includes(
  /const paintBoost=overdriveShot\?1\.2:1;/,
  'Overdrive must improve weapon paint radius'
);
includes(
  /damage:120,r:5\.2,hitRadius:2\.2,visualScale:4\.4/,
  'Mega Cannon must launch a large lethal 3D projectile'
);
includes(
  /fromRemote:true/,
  'Remote special projectiles must retain remote ownership'
);

const networkBlock = html.match(/case 'sx': \{[\s\S]*?\n\s*break;\n\s*\}/);
assert(networkBlock, 'Network special handler is missing');
for (const type of ['overdrive', 'barrier', 'inkRain', 'megaCannon']) {
  assert(
    networkBlock[0].includes(`m.k==='${type}'`),
    `${type} must be synchronized over P2P`
  );
}

console.log('Special system test passed: input, four 3D effects, damage, and P2P sync.');
