/* Yukemuri Junction — original onsen-town arena.
 * Loaded before the game; nothing accesses game globals until a function runs.
 * The blueprint is shared by the builder and route tests (metres, X/Z).
 */
'use strict';

function yukemuriBlueprint(){
  const decks=[],ramps=[];
  for(const s of [1,-1]){
    decks.push(
      {x:0,z:50*s,w:24,d:16,y:1.6,kind:'spawn'},
      {x:0,z:40*s,w:76,d:8,y:1.6,kind:'approach'},
      {x:0,z:18*s,w:16,d:6,y:3,kind:'plaza-entry'},
      {x:-32*s,z:23*s,w:20,d:10,y:5.8,kind:'rooftop'},
      {x:32*s,z:23*s,w:20,d:10,y:1.2,kind:'alley'}
    );
    ramps.push(
      {a:[0,36*s],b:[0,21*s],w:16,from:1.6,to:3},
      {a:[-32*s,36*s],b:[-32*s,28*s],w:12,from:1.6,to:5.8},
      {a:[-32*s,18*s],b:[-32*s,8*s],w:12,from:5.8,to:3},
      {a:[32*s,36*s],b:[32*s,28*s],w:12,from:1.6,to:1.2},
      {a:[32*s,18*s],b:[32*s,8*s],w:12,from:1.2,to:3}
    );
    decks.push({x:24*s,z:0,w:24,d:16,y:3,kind:'side-junction'});
  }
  // Every route is authored A -> B; Bots reverse the same points for B.
  // The central fountain is deliberately bypassed on both sides.
  const routes=[
    [[0,50],[0,40],[0,36],[0,21],[0,16],[-9,10],[-9,0],[-9,-10],[0,-16],[0,-21],[0,-36],[0,-40],[0,-50]],
    [[0,50],[0,40],[-32,40],[-32,36],[-32,28],[-32,23],[-32,18],[-32,8],[-32,0],[-16,0],[-9,9],[9,9],[16,0],[32,0],[32,-8],[32,-18],[32,-23],[32,-28],[32,-36],[32,-40],[0,-40],[0,-50]],
    [[0,50],[0,40],[32,40],[32,36],[32,28],[32,23],[32,18],[32,8],[32,0],[16,0],[9,-9],[-9,-9],[-16,0],[-32,0],[-32,-8],[-32,-18],[-32,-23],[-32,-28],[-32,-36],[-32,-40],[0,-40],[0,-50]]
  ];
  return {decks,ramps,routes,plaza:{inner:4.3,outer:21,y:3},
    covers:[[-13,14,4,2.2],[13,-14,4,2.2],[-39,23,3,3],[39,-23,3,3]],
    vents:[[-7,-7],[7,7],[-7,7],[7,-7]]};
}

function applyStageEnvironment(id){
  const dusk=id==='yukemuri_junction';
  const sky=scene.getObjectByName('world-sky');
  if(sky){
    sky.material.uniforms.top.value.setHex(dusk?0x07172e:0x2f7fd8);
    sky.material.uniforms.mid.value.setHex(dusk?0x305375:0x9fd0f2);
    sky.material.uniforms.bottom.value.setHex(dusk?0x75849a:0xffe9c9);
  }
  hemisphere.color.setHex(dusk?0xb9d8ff:0xcfe6ff);
  hemisphere.groundColor.setHex(dusk?0x937565:0xd6ae83);
  hemisphere.intensity=dusk?.55:.82;
  sun.color.setHex(dusk?0xd3e6ff:0xfff0d8);sun.intensity=dusk?1:1.48;
  rim.intensity=dusk?.3:.42;warmFill.intensity=dusk?.24:.18;
  renderer.toneMappingExposure=dusk?.86:1.08;
  for(const cloud of scene.children.filter(o=>o.name==='world-cloud')){
    for(const mesh of cloud.children)mesh.material.color.setHex(dusk?0x5c7893:0xffffff);
  }
  floorMat.bumpScale=dusk?.035:.075;
}

function drawYukemuriFloor(){
  // A neutral, world-aligned slate pavement, never pre-painted team ink.
  const ctx=pctx,step=12;
  ctx.fillStyle='#777f87';ctx.fillRect(0,0,TEX,TEX);
  for(let row=0,y=0;y<TEX;y+=step,row++){
    for(let x=-step;x<TEX;x+=step*2){
      const xx=x+(row%2)*step;
      const tone=112+((row*17+x*13)%19+19)%19;
      ctx.fillStyle=`rgb(${tone},${tone+8},${tone+12})`;
      ctx.fillRect(xx+1,y+1,step*2-2,step-2);
      ctx.strokeStyle='rgba(235,244,246,.16)';ctx.lineWidth=1;
      ctx.strokeRect(xx+2,y+2,step*2-4,step-4);
    }
  }
  const [cx,cy]=worldToTex(0,0);
  ctx.strokeStyle='#b5b7a5';ctx.lineWidth=3;
  for(const radius of [5.2,18.8,20.4]){
    ctx.beginPath();ctx.ellipse(cx,cy,radius/ARENA_W*TEX,radius/ARENA_D*TEX,0,0,Math.PI*2);ctx.stroke();
  }
  // Roof terraces receive gray ceramic strips using the same UV map.
  for(const s of [-1,1]){
    const a=worldToTex(-42*s,28*s),b=worldToTex(-22*s,18*s);
    const x=Math.min(a[0],b[0]),y=Math.min(a[1],b[1]),w=Math.abs(a[0]-b[0]),h=Math.abs(a[1]-b[1]);
    ctx.fillStyle='#556e7b';ctx.fillRect(x,y,w,h);
    ctx.strokeStyle='#89a0a5';ctx.lineWidth=1;
    for(let yy=y+5;yy<y+h;yy+=8){ctx.beginPath();ctx.moveTo(x,yy);ctx.lineTo(x+w,yy);ctx.stroke();}
  }
  paintTex.needsUpdate=true;
}

function buildYukemuri(){
  ARENA_W=112;ARENA_D=120;ARENA=120;
  SPAWN_A.set(0,1.6,50);SPAWN_B.set(0,1.6,-50);
  const rt=makeRuntime('yukemuri_junction',{
    name:'湯けむりジャンクション',width:112,depth:120,seaLevel:-4.2,killY:-6,
    clampBounds:false,maxPlayableY:7.5,stageVersion:STAGE_VERSION,
    spawnYawA:Math.PI,spawnYawB:0
  });
  activeStage=rt;
  scene.fog.color.setHex(0x556d7d).convertSRGBToLinear();scene.fog.near=100;scene.fog.far=330;
  rt.killZones.push({type:'belowY',y:-6,respawnSeconds:2,awardsKill:false});
  const plan=yukemuriBlueprint();
  const mat=(color,roughness=.85,extra={})=>{
    const m=new THREE.MeshStandardMaterial({color,roughness,...extra});
    m.color.convertSRGBToLinear();m.emissive.convertSRGBToLinear();
    rt.disposableMaterials.push(m);return m;
  };
  const m={
    stone:mat(0x666f78),plaster:mat(0xc4bda6),wood:mat(0x382b2c),
    roof:mat(0x263e50,.66),brass:mat(0xb39158,.48,{metalness:.58}),
    pipe:mat(0x263b40,.43,{metalness:.55}),
    glow:mat(0xffd28e,.55,{emissive:0xffa545,emissiveIntensity:.85}),
    teal:mat(0x268d94,.62),coral:mat(0xc56548,.65),
    water:mat(0x70b6c0,.23,{metalness:.38,transparent:true,opacity:.84}),
    tree:mat(0x244e51),mountain:mat(0x45647a)
  };
  // Repeated trim, windows, roofs, lanterns and distant houses are instanced.
  const batches=new Map();
  const roofShape=new THREE.Shape();
  roofShape.moveTo(-.62,0);roofShape.lineTo(-.48,.14);roofShape.lineTo(0,.52);
  roofShape.lineTo(.48,.14);roofShape.lineTo(.62,0);roofShape.lineTo(.49,.02);
  roofShape.lineTo(0,.39);roofShape.lineTo(-.49,.02);roofShape.closePath();
  const roofGeo=new THREE.ExtrudeGeometry(roofShape,{depth:1.16,bevelEnabled:false,steps:1});
  roofGeo.translate(0,0,-.58);
  const geos={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(.5,.5,1,12),
    roof:roofGeo,rock:new THREE.DodecahedronGeometry(.5,0),cone:new THREE.ConeGeometry(.5,1,8)};
  function put(kind,material,x,y,z,w,h,d,yaw=0){
    const key=kind+':'+material.uuid;
    if(!batches.has(key))batches.set(key,{geometry:geos[kind],material,matrices:[]});
    const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw);
    batches.get(key).matrices.push(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),q,new THREE.Vector3(w,h,d)));
  }
  function box(material,x,y,z,w,h,d,yaw=0){put('box',material,x,y,z,w,h,d,yaw);}
  function deck(d){
    box(m.stone,d.x,(d.y-4.2)/2,d.z,d.w,d.y+4.2,d.d);
    box(m.brass,d.x,d.y-.18,d.z,d.w+.08,.16,d.d+.08);
    addPaintPlane(d.x,d.z,d.w,d.d,d.y+.018);
    registerGround({type:'rect',x:d.x,z:d.z,hw:d.w/2,hd:d.d/2,y:d.y,yaw:0,paintable:true,kind:d.kind});
    // Dry-laid stone foundations: inset mortar courses, batched, visual only.
    for(let yy=-2.6;yy<d.y-.5;yy+=1.3){
      box(m.wood,d.x,yy,d.z+d.d/2+.01,d.w,.05,.02);
      box(m.wood,d.x,yy,d.z-d.d/2-.01,d.w,.05,.02);
    }
  }
  plan.decks.forEach(deck);
  plan.ramps.forEach(r=>addRampBetween(r.a,r.b,r.w,r.from,r.to,{baseMat:m.stone,groundMargin:0}));
  const plinth=new THREE.Mesh(new THREE.CylinderGeometry(21,22,7.2,64),m.stone);
  plinth.position.y=-.6;plinth.receiveShadow=true;stageAdd(plinth);
  const plaza=new THREE.Mesh(new THREE.RingGeometry(4.3,21,96),floorMat);
  plaza.rotation.x=-Math.PI/2;plaza.position.y=3.018;stageAdd(plaza);mapWorldPaintUV(plaza);
  plaza.receiveShadow=true;rt.paintableMeshes.push(plaza);
  registerGround({type:'ring',x:0,z:0,inner:4.3,outer:21,y:3,paintable:true,kind:'plaza'});

  function rail(x1,z1,x2,z2,y){
    const length=Math.hypot(x2-x1,z2-z1),yaw=Math.atan2(x2-x1,z2-z1);
    for(const h of [.5,1.15])box(m.wood,(x1+x2)/2,y+h,(z1+z2)/2,.14,.14,length,yaw);
    const n=Math.ceil(length/3);
    for(let i=0;i<=n;i++)box(m.wood,x1+(x2-x1)*i/n,y+.6,z1+(z2-z1)*i/n,.22,1.4,.22);
  }
  function lantern(x,y,z){
    put('cylinder',m.glow,x,y,z,.72,1.05,.72);
    for(const dy of [-.56,.56])put('cylinder',m.wood,x,y+dy,z,.78,.13,.78);
    box(m.wood,x,y+.95,z,.06,.8,.06);
  }
  function house(x,z,w,d,base,h,yaw=0,distant=false){
    box(m.stone,x,base+.6,z,w+1,1.2,d+1,yaw);
    box(m.plaster,x,base+h/2,z,w,h,d,yaw);
    box(m.wood,x,base+h*.5,z,w+.08,.22,d+.08,yaw);
    put('roof',m.roof,x,base+h,z,w,Math.min(w*.72,7),d,yaw);
    put('roof',m.roof,x,base+h*.48,z,w*.99,1.1,d*1.03,yaw);
    // local front/back facade points, rotated together with the building.
    const point=(lx,lz)=>[x+lx*Math.cos(yaw)+lz*Math.sin(yaw),z-lx*Math.sin(yaw)+lz*Math.cos(yaw)];
    const count=Math.max(2,Math.floor(w/2.5));
    for(const side of [-1,1])for(let i=0;i<count;i++){
      const lx=(i-(count-1)/2)*(w/(count+1));
      const p=point(lx,side*(d/2+.025));
      for(const f of [.27,.73]){
        box(m.wood,p[0],base+h*f,p[1],w/(count+1)*.88,h*.25,.12,yaw);
        box(m.glow,p[0]+Math.sin(yaw)*side*.08,base+h*f,p[1]+Math.cos(yaw)*side*.08,w/(count+1)*.72,h*.2,.04,yaw);
        box(m.wood,p[0]+Math.sin(yaw)*side*.11,base+h*f,p[1]+Math.cos(yaw)*side*.11,.07,h*.22,.04,yaw);
      }
      if(!distant){const l=point(lx,side*(d/2+.8));lantern(l[0],base+h*.47-1,l[1]);}
    }
    if(!distant){
      addSolidCollider(x,z,w,d,base,base+h+3,null,{ry:yaw,paintable:false});
      for(const lx of [-w/2,0,w/2])for(const side of [-1,1]){
        const p=point(lx,side*(d/2+.1));box(m.wood,p[0],base+h/2,p[1],.26,h,.26,yaw);
      }
    }
  }

  // The landmark stays inside the fountain collider below player height.
  // Upper eaves are well above the chase camera; nothing crosses a route.
  const fountain=new THREE.Mesh(new THREE.CylinderGeometry(4.3,4.3,1.5,32),m.stone);
  fountain.position.y=3.75;stageAdd(fountain);
  addSolidCollider(0,0,8.6,8.6,3,22,fountain,{paintable:false});
  const bathWater=new THREE.Mesh(new THREE.CircleGeometry(3.7,40),m.water);
  bathWater.rotation.x=-Math.PI/2;bathWater.position.y=4.52;stageAdd(bathWater);
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6;put('rock',m.stone,Math.cos(a)*3.9,4.65,Math.sin(a)*3.9,1.7,1.2,1.4,a);
  }
  put('cylinder',m.wood,0,8.2,0,5.8,8,5.8);
  put('cylinder',m.plaster,0,13.2,0,11,4.2,11);
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6;
    box(m.glow,Math.sin(a)*5.47,13.3,Math.cos(a)*5.47,2.1,2.4,.16,a);
    box(m.wood,Math.sin(a)*5.63,13.3,Math.cos(a)*5.63,.14,4.3,.22,a);
    lantern(Math.sin(a)*6.7,10.6,Math.cos(a)*6.7);
  }
  for(const [y,top,bottom,h] of [[15.3,4.8,8.8,1.8],[17.2,1.8,6.5,2.8],[19.2,.2,3.2,1.9]]){
    const roof=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,h,12),m.roof);
    roof.position.y=y;roof.castShadow=true;stageAdd(roof);
    const edge=new THREE.Mesh(new THREE.TorusGeometry(bottom,.12,6,48),m.brass);
    edge.rotation.x=Math.PI/2;edge.position.y=y-h/2;stageAdd(edge);
  }
  put('cylinder',m.brass,0,20.7,0,.25,2,.25);

  for(const s of [1,-1]){
    // Broad spawn veranda and wooden skyline gate, with clear exits.
    rail(-11,58*s,11,58*s,1.6);
    rail(-38,44*s,-13,44*s,1.6);rail(13,44*s,38,44*s,1.6);
    for(const x of [-9,9]){
      box(m.wood,x,5.3,60*s,.65,7.4,.65);lantern(x,7,59*s);
    }
    box(m.wood,0,8.6,60*s,21,.65,1.2);
    put('roof',m.roof,0,8.85,60*s,20,2,2.4);
    for(const x of [-32,32]){
      rail((x-9)*s,18*s,(x-9)*s,28*s,x===-32?5.8:1.2);
      rail((x+9)*s,18*s,(x+9)*s,28*s,x===-32?5.8:1.2);
    }
    house(-49*s,23*s,12,18,-3.8,16,0);
    house(49*s,23*s,12,18,-3.8,12,0);
    house(-20*s,52*s,10,12,-3.8,12,0);
    house(20*s,52*s,10,12,-3.8,10,0);
    // A low alley lined with hot-water service pipes and brass couplings.
    for(const y of [2.05,2.75]){
      put('cylinder',m.pipe,41*s,y,23*s,.38,10,.38); // rotated below, not upright
      const batch=batches.get('cylinder:'+m.pipe.uuid);
      const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2);
      batch.matrices[batch.matrices.length-1].compose(new THREE.Vector3(41*s,y,23*s),q,new THREE.Vector3(.38,10,.38));
      for(const z of [19,23,27]){
        const ring=new THREE.Mesh(new THREE.TorusGeometry(.24,.065,6,12),m.brass);
        ring.position.set(41*s,y,z*s);stageAdd(ring);
      }
    }
    // Vending machine, towel curtain and shop awning outside movement lines.
    box(m.teal,39*s,2.9,30*s,2.4,3.4,1.4);
    box(m.glow,39*s,3.25,30*s+s*.73,1.7,1.8,.05);
    for(let row=0;row<3;row++)for(let col=0;col<4;col++)box(m.coral,(38.4+col*.4)*s,2.7+row*.5,30*s+s*.79,.2,.3,.06);
    box(m.wood,39*s,1.8,30*s+s*.79,1,.3,.08);
    box(m.teal,46*s,6,23*s,1.6,.2,16);
    for(const z of [17,20,23,26,29]){box(m.teal,45.4*s,5.35,z*s,.12,1.3,2.7);lantern(43.9*s,5.3,z*s);}
    const light=new THREE.PointLight(0xffbc6d,.85,28,2);
    light.position.set(0,9,20*s);stageAdd(light);
    spawnPad(0,50*s,1.6,s===1?'A':'B');
  }
  for(const [x,z,w,d] of plan.covers){
    const y=Math.abs(x)>30?5.8:3;
    addBox(x,z,w,1.5,d,m.stone,true,0,{baseY:y,paintable:true});
    // Thin wooden hoops read as stacked onsen crates without covering the top.
    for(const dy of [.25,1.15])box(m.wood,x,y+dy,z,w+.06,.12,d+.06);
  }

  // Sign atlas: original town graphics, one texture/material for all signs.
  const atlas=document.createElement('canvas');atlas.width=1024;atlas.height=512;
  const ctx=atlas.getContext('2d');
  const labels=[['湯','YUKEMURI'],['屋根道','ROOFTOPS  ↑'],['温泉通り','BATH STREET  ↑'],['ゆ','JUNCTION  03']];
  function drawSigns(){labels.forEach(([title,sub],i)=>{
    const x=(i%2)*512,y=Math.floor(i/2)*256;
    ctx.fillStyle=i===0||i===3?'#f0d9aa':'#236b74';ctx.fillRect(x,y,512,256);
    ctx.strokeStyle='#ad8256';ctx.lineWidth=12;ctx.strokeRect(x+9,y+9,494,238);
    ctx.fillStyle=i===0||i===3?'#352b34':'#fff0c5';ctx.textAlign='center';
    ctx.font='bold 105px "Noto Sans JP", sans-serif';ctx.fillText(title,x+256,y+145);
    ctx.font='bold 27px "Noto Sans JP", sans-serif';ctx.fillText(sub,x+256,y+207);
  });}
  drawSigns();
  const signTex=new THREE.CanvasTexture(atlas);signTex.encoding=THREE.sRGBEncoding;
  document.fonts?.ready.then(()=>{
    if(activeStage===rt){drawSigns();signTex.needsUpdate=true;}
  });
  rt.disposableTextures.push(signTex);
  const signMat=new THREE.MeshBasicMaterial({map:signTex});rt.disposableMaterials.push(signMat);
  function sign(x,y,z,w,h,index,yaw=0){
    const g=new THREE.PlaneGeometry(w,h),uv=g.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setXY(i,(index%2+uv.getX(i))/2,(1-Math.floor(index/2)+uv.getY(i))/2);
    const mesh=new THREE.Mesh(g,signMat);mesh.position.set(x,y,z);mesh.rotation.y=yaw;stageAdd(mesh);
  }
  for(const s of [1,-1]){
    sign(0,8.3,3.02*s,4.1,2.8,0,s===1?0:Math.PI);
    sign(0,7.55,59.3*s,7.2,2,3,s===1?Math.PI:0);
    sign(-20*s,3.7,42*s,5,1.7,1,s===1?0:Math.PI);
    sign(20*s,3.7,42*s,5,1.7,2,s===1?0:Math.PI);
  }

  // Mountain ravine: non-playable scenery is outside arena extents.
  const water=new THREE.Mesh(new THREE.PlaneGeometry(520,520),m.water);
  water.rotation.x=-Math.PI/2;water.position.y=-4.2;stageAdd(water);
  const hash=n=>{const v=Math.sin(n*91.71+17)*43758.5453;return v-Math.floor(v);};
  for(let i=0;i<32;i++){
    const angle=i*Math.PI*2/32,r=105+hash(i)*36;
    const x=Math.cos(angle)*r,z=Math.sin(angle)*r,h=32+hash(i+3)*55;
    put('rock',m.mountain,x,h*.19-9,z,55+hash(i+4)*30,h,60,angle);
    if(i%2===0)house(x*.72,z*.72,8+hash(i+9)*9,10,hash(i+7)*15,9+hash(i+5)*9,angle,true);
    for(let j=0;j<3;j++){
      const tx=x*.65+j*4,tz=z*.65+hash(i+j)*8;
      put('cone',m.tree,tx,9+hash(i+12)*12,tz,7,15,7);
    }
  }
  for(const s of [-1,1]){
    // Cascades beyond the alleys, below the village terraces.
    box(m.stone,72*s,4,-20*s,18,20,18);
    box(m.water,63*s,4,-20*s,.15,20,8);
  }
  for(const batch of batches.values()){
    const mesh=new THREE.InstancedMesh(batch.geometry,batch.material,batch.matrices.length);
    batch.matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
    mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=!isTouch&&batch.material!==m.glow;
    mesh.receiveShadow=true;stageAdd(mesh);
  }
  addYukemuriSteam(rt,plan.vents);
  rt.botGraph.routes=plan.routes;
  rt.botGraph.patrol=true;
  rt.botGraph.validation=validateStageRoutes(plan.routes);
  return rt;
}

function yukemuriSteamEnvelope(matchElapsed){
  const phase=((matchElapsed%14)+14)%14;
  if(phase<8)return 0;
  if(phase<9)return phase-8;
  if(phase<12)return 1;
  return (14-phase)/2;
}

function pickYukemuriBotTarget(b,routes){
  if(b.routeIndex<0)b.routeIndex=Math.floor(Math.random()*routes.length);
  if(b.routeStep<0){
    b.routeDirection=b.team==='A'?1:-1;
    b.routeStep=b.routeDirection===1?1:routes[b.routeIndex].length-2;
  }else{
    b.routeStep+=b.routeDirection;
    if(b.routeStep<0||b.routeStep>=routes[b.routeIndex].length){
      // At either spawn, turn around on another connected route. Never aim
      // straight across the whole arena to the opposite route's first point.
      b.routeDirection*=-1;b.routeIndex=(b.routeIndex+1)%routes.length;
      b.routeStep=b.routeDirection===1?1:routes[b.routeIndex].length-2;
    }
  }
  b.target.copy(projectBotWaypoint(routes[b.routeIndex][b.routeStep],b.routeIndex));
  b.retarget=12;
  // A turn can have almost zero net displacement over the stuck detector's
  // time window despite healthy movement. Start a fresh window per waypoint.
  b.lastProgressPos.copy(b.pos);b.stuckT=0;
}

function addYukemuriSteam(rt,vents){
  const cv=document.createElement('canvas');cv.width=cv.height=64;
  const ctx=cv.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(235,249,255,.7)');g.addColorStop(.4,'rgba(225,243,251,.35)');g.addColorStop(1,'rgba(225,243,251,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
  const texture=new THREE.CanvasTexture(cv);rt.disposableTextures.push(texture);
  const count=isTouch?24:48,sprites=[];
  const material=new THREE.SpriteMaterial({map:texture,transparent:true,opacity:.2,depthWrite:false,color:0xe5f5ff});
  rt.disposableMaterials.push(material);
  for(let i=0;i<count;i++){
    const sprite=new THREE.Sprite(material);sprite.renderOrder=2;stageAdd(sprite);sprites.push(sprite);
  }
  // Cosmetic steam only. Low opacity preserves player/Bot visibility parity;
  // no random timers, collision or damage and no allocations in this loop.
  rt.animators.push((dt,visualTime)=>{
    const elapsed=MATCH_TIME-timeLeft,envelope=yukemuriSteamEnvelope(elapsed);
    material.opacity=.08+envelope*.18;
    for(let i=0;i<count;i++){
      const vent=vents[i%vents.length],phase=(visualTime*.16+i*.61803398875)%1;
      const size=1.3+phase*2.8;
      sprites[i].position.set(vent[0]+Math.sin(i*2.4+phase*4)*phase,3.1+phase*5.5,vent[1]+Math.cos(i*1.7+phase*3)*phase);
      sprites[i].scale.set(size,size*1.35,1);
    }
  });
}

if(typeof module!=='undefined'&&module.exports){module.exports={yukemuriBlueprint,yukemuriSteamEnvelope};}
