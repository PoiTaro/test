const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert(
  /renderer\.setPixelRatio\(Math\.min\(window\.devicePixelRatio, isTouch \? 1\.5 : 2\)\)/.test(html),
  'mobile render resolution must retain a 1.5 device-pixel-ratio ceiling'
);
assert(
  /renderer\.shadowMap\.enabled = true/.test(html) &&
  /isTouch \? THREE\.PCFShadowMap : THREE\.PCFSoftShadowMap/.test(html) &&
  /const shadowMapSize = isTouch \? 1024 : 2048/.test(html),
  'mobile and desktop must both render tiered realtime shadows'
);
assert(
  /floorMat\.onBeforeCompile/.test(html) &&
  /wetInkMask/.test(html) &&
  /roughnessFactor = mix\(roughnessFactor, 0\.13, wetInkMask\)/.test(html),
  'dynamic floor material must separate glossy wet ink from the dry deck'
);
assert(
  /function makeIndustrialBumpTexture\(kind\)/.test(html) &&
  /bumpMap:INDUSTRIAL_BUMPS\.panel/.test(html) &&
  /bumpMap: makeIndustrialBumpTexture\('floor'\)/.test(html),
  'industrial surfaces must include reusable micro-height detail'
);
assert(
  /function makeOceanMaterial\(\)/.test(html) &&
  /float fresnel = pow/.test(html) &&
  /float sunGlint = pow/.test(html) &&
  /new THREE\.PlaneGeometry\(760,760,isTouch\?32:72,isTouch\?32:72\)/.test(html),
  'the ocean must use animated segmented geometry with Fresnel and sun glints'
);
assert(
  /float sunHalo = pow/.test(html) &&
  /float sunCore = pow/.test(html) &&
  /const warmFill = new THREE\.DirectionalLight/.test(html),
  'sky and lighting must include atmospheric sun and balanced fill lighting'
);
assert(
  /floorInkUniforms\.uInkTime\.value = visualTime/.test(html) &&
  /oceanUniforms\.uTime\.value = visualTime/.test(html),
  'animated quality shaders must receive the shared visual clock'
);

console.log('Render quality test passed.');
