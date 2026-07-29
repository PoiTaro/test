const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const marker = 'function buildSaltSpire(){';
const start = html.indexOf(marker) + marker.length;
const end = html.indexOf('\n}\n\nfunction validateStageRoutes', start);
assert(start >= marker.length && end > start, 'active Salt Spire builder was not found');
const builderBody = html.slice(start, end);

const grounds = [];
const colliders = [];
const point = () => ({
  x: 0, y: 0, z: 0,
  set(x, y, z){ this.x = x; this.y = y; this.z = z; }
});
class DummyObject {
  constructor(){
    this.position = point();
    this.rotation = { x: 0, y: 0, z: 0 };
  }
  add(){}
}
class DummyGeometry {}
class DummyMaterial {
  constructor(){ this.emissiveIntensity=0; }
}
const THREE = {
  Mesh: DummyObject,
  Group: DummyObject,
  PointLight: DummyObject,
  MeshStandardMaterial: DummyMaterial,
  MeshBasicMaterial: DummyMaterial,
  PlaneGeometry: DummyGeometry,
  BoxGeometry: DummyGeometry,
  CylinderGeometry: DummyGeometry,
  CircleGeometry: DummyGeometry,
  TorusGeometry: DummyGeometry,
  ConeGeometry: DummyGeometry,
  MathUtils: { lerp: (a, b, t) => a + (b - a) * t }
};

function local(surface, x, z){
  const dx = x - surface.x;
  const dz = z - surface.z;
  const c = Math.cos(surface.yaw || 0);
  const s = Math.sin(surface.yaw || 0);
  return { x: dx*c - dz*s, z: dx*s + dz*c };
}
function contains(surface, x, z){
  if(surface.type === 'circle') return Math.hypot(x-surface.x, z-surface.z) <= surface.r + .001;
  const p = local(surface, x, z);
  const marginX = surface.marginX || 0;
  const marginZ = surface.marginZ || 0;
  return Math.abs(p.x) <= surface.hw + marginX + .001 && Math.abs(p.z) <= surface.hd + marginZ + .001;
}
function surfaceHeight(surface, x, z){
  if(surface.type !== 'ramp') return surface.y;
  const p = local(surface, x, z);
  const t = Math.max(0, Math.min(1, (surface.hd-p.z)/(surface.hd*2)));
  return THREE.MathUtils.lerp(surface.yStart, surface.yEnd, t);
}
function heightAt(x, z, currentY=999){
  let found = -Infinity;
  let bestDelta = Infinity;
  let rampFound = -Infinity;
  let rampDelta = Infinity;
  for(const surface of grounds){
    if(!contains(surface, x, z)) continue;
    const height = surfaceHeight(surface, x, z);
    if(currentY >= 900){
      found = Math.max(found, height);
      continue;
    }
    if(height > currentY + .42) continue;
    const delta = Math.abs(height-currentY);
    if(surface.type === 'ramp' && delta < rampDelta){
      rampFound = height;
      rampDelta = delta;
    }
    if(delta < bestDelta-.001 || (Math.abs(delta-bestDelta) < .001 && height > found)){
      found = height;
      bestDelta = delta;
    }
  }
  return Number.isFinite(rampFound) ? rampFound : found;
}
function validateRoutes(routes){
  const failures = [];
  routes.forEach((route, routeIndex) => {
    for(const laneOffset of [0, -2.4, 2.4]){
      let previousHeight = null;
      for(let segment=0; segment<route.length-1; segment++){
        const a = route[segment];
        const b = route[segment+1];
        const dx = b[0]-a[0];
        const dz = b[1]-a[1];
        const distance = Math.hypot(dx, dz);
        const nx = distance ? -dz/distance : 0;
        const nz = distance ? dx/distance : 0;
        const steps = Math.max(1, Math.ceil(distance/.45));
        for(let i=0; i<=steps; i++){
          const t = i/steps;
          const edgeBlend = Math.min(1, t*5, (1-t)*5);
          const offset = laneOffset*edgeBlend;
          const x = THREE.MathUtils.lerp(a[0], b[0], t) + nx*offset;
          const z = THREE.MathUtils.lerp(a[1], b[1], t) + nz*offset;
          const height = heightAt(x, z, previousHeight == null ? 999 : previousHeight);
          if(!Number.isFinite(height)){
            failures.push({routeIndex, segment, laneOffset, x, z, reason:'no-ground'});
            previousHeight = null;
            break;
          }
          if(previousHeight != null && Math.abs(height-previousHeight) > .3){
            failures.push({routeIndex, segment, laneOffset, x, z, previousHeight, height, reason:'height-seam'});
            break;
          }
          if(laneOffset === 0){
            for(const collider of colliders){
              if(height < collider.yMin-.2 || height >= collider.h-.12) continue;
              if(Math.abs(x-collider.x) < collider.hw+.6 && Math.abs(z-collider.z) < collider.hd+.6){
                failures.push({routeIndex, segment, laneOffset, x, z, reason:'solid-blocker'});
                break;
              }
            }
          }
          previousHeight = height;
        }
      }
    }
  });
  return { ok: failures.length === 0, failures };
}

const context = {
  ARENA_W: 0, ARENA_D: 0, ARENA: 0,
  SPAWN_A: { set(){} }, SPAWN_B: { set(){} },
  STAGE_VERSION: 1, activeStage: null,
  TEAM:{A:{main:0xff7a00},B:{main:0x6a1fff}},
  scene: { fog: { color:{setHex(){}} } }, THREE, floorMat: {},
  STAGE_MATERIALS: {
    ocean:{}, darkMetal:{}, tower:{}, rail:{}, hazard:{},
    concrete:{}, grate:{}, deckEdge:{}, deckSupport:{}
  },
  makeRuntime: (id, config) => ({
    id, config, killZones:[], paintableMeshes:[], botGraph:{routes:[]},
    animators:[], disposableMaterials:[], disposableTextures:[]
  }),
  stageAdd(){},
  mapWorldPaintUV(){},
  registerGround(surface){ grounds.push(surface); },
  addDeckRect(x, z, w, d, y, opts={}){
    grounds.push({
      type:'rect', x, z, hw:(opts.groundW||w)/2, hd:(opts.groundD||d)/2,
      y, yaw:opts.yaw||0, paintable:opts.paintable!==false
    });
  },
  addRampBetween(a, b, width, yStart, yEnd, opts={}){
    const x=(a[0]+b[0])/2, z=(a[1]+b[1])/2;
    const dx=b[0]-a[0], dz=b[1]-a[1];
    grounds.push({
      type:'ramp', x, z, hw:width/2, hd:Math.hypot(dx,dz)/2,
      yStart, yEnd, y:Math.max(yStart,yEnd),
      yaw:Math.atan2(dx,dz)+Math.PI, marginZ:opts.groundMargin == null ? 1 : opts.groundMargin,
      paintable:opts.paintable!==false
    });
  },
  addSolidCollider(x, z, w, d, yMin, h){
    colliders.push({x,z,hw:w/2,hd:d/2,yMin,h});
  },
  addBox(x, z, w, h, d, material, solid, yaw, opts={}){
    if(solid) colliders.push({x,z,hw:w/2,hd:d/2,yMin:opts.baseY||0,h:(opts.baseY||0)+h});
  },
  addContainer(x, z, y){
    colliders.push({x,z,hw:3.5,hd:1.6,yMin:y,h:y+2.8});
  },
  addRailLine(){}, addStageSign(){}, addAtlasPanel(){}, addDrumCluster(){}, addPipeRuns(){},
  addTeamBanner(){}, addDistantHarbor(){}, addSupportPylons(){},
  flushRailPosts(){}, spawnPad(){},
  validateStageRoutes: validateRoutes
};

const runtime = new Function('ctx', `with(ctx){${builderBody}}`)(context);
const result = validateRoutes(runtime.botGraph.routes);
assert.equal(runtime.botGraph.routes.length, 3, 'three readable primary routes are required');
assert.equal(result.ok, true, JSON.stringify(result.failures.slice(0, 12), null, 2));
const atlasBytes = fs.statSync(path.join(__dirname, '..', 'assets', 'salt-spire-decal-atlas-v1.webp')).size;
assert(atlasBytes < 100_000, `mobile decal atlas is too large: ${atlasBytes} bytes`);
assert((builderBody.match(/addDeckRect/g)||[]).length <= 16, 'too many separate deck slabs');
assert((builderBody.match(/addRampBetween/g)||[]).length <= 16, 'too many separate ramp surfaces');
assert(
  /function rampStructureGeometry\([\s\S]*?left fascia[\s\S]*?right fascia/.test(html),
  'ramps must use a closed structural body instead of a zero-thickness plane'
);
assert(
  /const fascia=new THREE\.Mesh\(new THREE\.BoxGeometry\(w,fasciaH,d\),STAGE_MATERIALS\.deckEdge\)/.test(html),
  'flat decks must include a visible structural fascia'
);
assert(
  /addSupportPylons\(\[/.test(builderBody),
  'major offshore decks must have visible supports'
);
console.log(`Salt Spire route test passed: ${grounds.length} simple surfaces, ${runtime.botGraph.routes.length} routes.`);
