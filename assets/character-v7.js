/* Ink runner v7. Procedural, articulated model; +Z forward, Y up, feet at Y=0.
 * Geometry is baked once and shared between actors. Materials are actor-local so
 * team changes and squid stealth never affect another player or the human form.
 */
const InkCharacter = (() => {
  let template = null, lib = null;
  function build(T) {
    const root = new T.Group(); root.name = 'InkRunner';
    const materials = {};
    function mat(name, color, roughness, extra={}) {
      const m = new T.MeshPhysicalMaterial({color,roughness,metalness:0,...extra});
      m.color.convertSRGBToLinear(); m.name=name; materials[name]=m; return m;
    }
    const skin=mat('skin',0xffb273,.63), inner=mat('ear-inner',0xe99159,.72);
    const ink=mat('team-main',0xff7416,.24,{clearcoat:1,clearcoatRoughness:.2});
    const spot=mat('team-light',0xffc64a,.3,{clearcoat:.7});
    const under=mat('tentacle-underside',0xffd5b2,.45);
    const cloth=mat('fabric',0x242b39,.92), seam=mat('seams',0x414a5b,.83);
    const black=mat('rubber',0x111621,.68), white=mat('ivory',0xf3f1e8,.5);
    const eyeWhite=mat('eye-white',0xfffcf6,.24), iris=mat('iris',0x8b35dd,.29), pupil=mat('pupil',0x120c25,.25);
    const glass=mat('tank-shell',0xe2f4ff,.15,{transparent:true,opacity:.24,depthWrite:false,clearcoat:1});
    const unitSphere=new T.SphereGeometry(1,20,14), unitBox=new T.BoxGeometry(1,1,1);
    function group(parent,name,x=0,y=0,z=0) {const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;}
    function mesh(parent,name,geo,m,p=[0,0,0],s=[1,1,1],r=[0,0,0]) {const o=new T.Mesh(geo,m);o.name=name;o.position.set(...p);o.scale.set(...s);o.rotation.set(...r);o.castShadow=true;o.receiveShadow=false;parent.add(o);return o;}
    const ell=(p,n,m,pos,s,r)=>mesh(p,n,unitSphere,m,pos,s,r);
    const box=(p,n,m,pos,s,r)=>mesh(p,n,unitBox,m,pos,s,r);
    function tube(parent,name,points,radius,m,segments=16) {
      const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
      return mesh(parent,name,new T.TubeGeometry(curve,segments,radius,7,false),m);
    }
    // Elliptical section loft; controls define the soft taper instead of cones.
    function ribbon(parent,name,points,widths,depths,m,steps=24) {
      const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
      const pos=[],uv=[],idx=[],sides=16;
      for(let i=0;i<=steps;i++) {const t=i/steps,q=t*(widths.length-1),j=Math.min(widths.length-2,Math.floor(q)),u=q-j;
        const w=T.MathUtils.lerp(widths[j],widths[j+1],u),d=T.MathUtils.lerp(depths[j],depths[j+1],u),c=curve.getPointAt(t);
        const tangent=curve.getTangentAt(t),reference=Math.abs(tangent.z)>.92?new T.Vector3(0,1,0):new T.Vector3(0,0,1),normal=reference.cross(tangent).normalize(),binormal=tangent.clone().cross(normal).normalize();
        for(let k=0;k<=sides;k++){const a=k/sides*Math.PI*2,v=c.clone().addScaledVector(normal,Math.cos(a)*w).addScaledVector(binormal,Math.sin(a)*d);pos.push(v.x,v.y,v.z);uv.push(k/sides,t);}
      }
      for(let i=0;i<steps;i++)for(let k=0;k<sides;k++){const a=i*(sides+1)+k,b=a+sides+1;idx.push(a,a+1,b,b,a+1,b+1);}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
      return mesh(parent,name,g,m);
    }
    const human=group(root,'human'),pelvis=group(human,'pelvis',0,.83,0);
    ell(pelvis,'shorts',cloth,[0,.035,0],[.26,.12,.19]);
    const torso=group(human,'torso',0,1.12,0);
    mesh(torso,'shirt',new T.CylinderGeometry(.245,.285,.48,20),cloth,[0,0,0],[1,1,.76]);
    ell(torso,'shoulder-yoke',cloth,[0,.18,0],[.32,.105,.19]);
    mesh(torso,'hem',new T.CylinderGeometry(.287,.29,.035,20),seam,[0,-.24,0],[1,1,.76]);
    ell(torso,'neck',skin,[0,.29,0],[.105,.14,.10]);
    mesh(torso,'collar',new T.TorusGeometry(.115,.027,6,20),black,[0,.23,.01],[1,1,.8],[Math.PI/2,0,0]);
    for(let i=0;i<3;i++)box(torso,'chest-stripe',white,[-.072+i*.064,.07,.197],[.036,.09,.013],[0,0,-.42]);
    for(const s of [-1,1]) {
      tube(torso,'shoulder-strap',[[s*.20,-.19,.173],[s*.21,.15,.18],[s*.20,.235,.02],[s*.18,.15,-.20],[s*.18,-.19,-.20]],.024,black);
      box(torso,'strap-color',ink,[s*.211,.05,.185],[.037,.18,.027]);
      box(torso,'strap-buckle',seam,[s*.211,-.07,.198],[.056,.05,.018]);
      box(pelvis,'short-stripe',ink,[s*.255,-.07,.04],[.025,.21,.18],[0,0,s*.10]);
    }
    const head=group(human,'head',0,1.75,0);
    ell(head,'face',skin,[0,0,0],[.414,.384,.328]);
    // The face is one continuous ellipsoid; avoid a separate muzzle-like chin.

    for(const s of [-1,1]) {
      ribbon(head,'ear',[[s*.33,-.02,-.01],[s*.48,.015,-.045],[s*.61,.07,-.085]], [.13,.105,.002],[.07,.06,.002],skin,12);
      ell(head,'ear-inner',inner,[s*.435,.01,.001],[.10,.046,.012],[0,s*.5,s*.25]);
      const eye=group(head,'eye-'+s,s*.174,-.008,.275);eye.rotation.y=s*.14;
      ell(eye,'mask',black,[0,0,0],[.174,.134,.030],[0,0,-s*.13]);
      ell(eye,'white',eyeWhite,[0,.002,.027],[.144,.104,.022],[0,0,-s*.13]);
      ell(eye,'iris',iris,[-s*.012,-.002,.052],[.073,.087,.012]);
      ell(eye,'pupil',pupil,[-s*.01,.003,.066],[.034,.060,.007]);
      ell(eye,'glint',eyeWhite,[-.026,.045,.076],[.019,.022,.006]);
      ell(eye,'small-glint',eyeWhite,[.027,-.042,.075],[.008,.009,.004]);
      ell(head,'brow',ink,[s*.194,.133,.31],[.108,.027,.025],[0,0,s*.35]);
    }
    ell(head,'nose',skin,[0,-.113,.329],[.047,.037,.036]);
    tube(head,'smile',[[-.085,-.211,.277],[0,-.231,.274],[.085,-.203,.282]],.009,inner,12);
    // Close-fitting cap leaves the face clear. Directional scallops form a crown.
    mesh(head,'hair-cap',new T.SphereGeometry(1,28,16,0,Math.PI*2,0,1.78),ink,[0,.075,-.047],[.441,.377,.345]);
    for(const s of [-1,1]) {
      ribbon(head,'back-hair',[[s*.14,.13,-.29],[s*.18,-.08,-.345],[s*.14,-.30,-.22]], [.17,.17,.003],[.08,.07,.002],ink,22);
      ribbon(head,'fringe',[[s*.04,.21,.275],[s*.10,.165,.292],[s*.14,.10,.290]], [.075,.055,.002],[.026,.025,.002],ink,16);
      const lock=group(head,'tentacle-'+s,s*.32,.20,-.02);
      ribbon(lock,'long-tentacle',[[0,0,0],[s*.075,-.32,.005],[s*.14,-.58,-.06],[s*.28,-.79,-.13],[s*.22,-1.03,-.03]], [.105,.09,.125,.175,.008],[.07,.065,.073,.09,.006],ink,30);
      ribbon(lock,'underside',[[s*.125,-.59,-.009],[s*.245,-.78,-.035],[s*.22,-.99,.018]], [.055,.113,.004],[.016,.019,.003],under,14);
      for(let j=0;j<3;j++) {
        const y=-.68-j*.105,x=s*(.18+(j===1?.05:.035));
        mesh(lock,'sucker',new T.TorusGeometry(.043-j*.005,.012,6,12),under,[x,y,.005],[1,1,.6],[.15,s*.25,0]);
      }
      for(let j=0;j<4;j++)ell(lock,'ink-freckle',spot,[s*(.12+j*.023),-.42-j*.108,-.12-j*.018],[.023+j*.007,.032+j*.008,.008],[0,s*-.4,-s*.4]);
    }
    // White cloth headband follows the ellipsoid rather than a floating torus.
    const bandPos=[],bandUV=[],bandIdx=[],steps=64;
    for(let i=0;i<=steps;i++){const a=i/steps*Math.PI*2;for(let k=0;k<2;k++){bandPos.push(Math.sin(a)*.45,.19+k*.105+Math.cos(a)*.015,Math.cos(a)*.347-.016);bandUV.push(i/steps,k);}}
    for(let i=0;i<steps;i++){let a=i*2;bandIdx.push(a,a+2,a+1,a+1,a+2,a+3);}
    const bandGeo=new T.BufferGeometry();bandGeo.setAttribute('position',new T.Float32BufferAttribute(bandPos,3));bandGeo.setAttribute('uv',new T.Float32BufferAttribute(bandUV,2));bandGeo.setIndex(bandIdx);bandGeo.computeVertexNormals();
    const bandMat=white.clone();bandMat.name='headband';bandMat.side=T.DoubleSide;
    mesh(head,'headband',bandGeo,bandMat);
    for(let i=0;i<3;i++)box(head,'band-logo',ink,[.205+i*.042,.255,.302-i*.023],[.026,.071,.013],[0,.5,-.36]);
    const arms=[],legs=[];
    for(const s of [-1,1]) {
      const side=s<0?'left':'right';
      const arm=group(human,side+'-upperArm',s*.31,1.30,.005);arm.rotation.z=s*.15;
      ell(arm,'sleeve',cloth,[0,-.065,0],[.136,.16,.135]);
      mesh(arm,'sleeve-edge',new T.CylinderGeometry(.12,.115,.025,16),seam,[0,-.16,0]);
      ell(arm,'upper-arm',skin,[0,-.21,0],[.092,.15,.092]);
      const fore=group(arm,side+'-forearm',0,-.32,0);
      ell(fore,'elbow',skin,[0,0,0],[.09,.09,.09]);
      ell(fore,'forearm',skin,[0,-.115,.015],[.079,.145,.081]);
      mesh(fore,'wristband',new T.CylinderGeometry(.087,.087,.062,14),black,[0,-.226,.018]);
      mesh(fore,'wrist-accent',new T.CylinderGeometry(.089,.089,.019,14),ink,[0,-.207,.018]);
      const hand=group(fore,side+'-hand',0,-.287,.03);
      ell(hand,'glove',black,[0,0,0],[.105,.097,.072]);
      ell(hand,'glove-patch',ink,[0,.023,-.068],[.046,.025,.008]);
      for(let j=0;j<3;j++)ell(hand,'finger',skin,[-.052+j*.048,-.067,.031],[.026,.056,.032]);
      ell(hand,'thumb',skin,[-s*.085,-.014,.05],[.038,.062,.036],[.3,0,-s*.3]);
      arms.push(arm);
      const thigh=group(human,side+'-thigh',s*.166,.81,0);
      mesh(thigh,'short-leg',new T.CylinderGeometry(.153,.144,.23,16),cloth,[0,-.06,0],[1,1,.90]);
      mesh(thigh,'short-hem',new T.CylinderGeometry(.146,.148,.026,16),seam,[0,-.172,0],[1,1,.90]);
      ell(thigh,'thigh',skin,[0,-.185,0],[.112,.158,.106]);
      const shin=group(thigh,side+'-shin',0,-.31,0);
      ell(shin,'knee',skin,[0,0,.01],[.096,.096,.096]);
      ell(shin,'calf',skin,[0,-.105,0],[.081,.13,.081]);
      mesh(shin,'sock',new T.CylinderGeometry(.082,.084,.09,14),white,[0,-.188,0]);
      const foot=group(shin,side+'-shoe',0,-.245,.058);foot.scale.set(1.08,1,1.08);
      ell(foot,'outsole',black,[0,-.05,.05],[.151,.058,.246]);
      ell(foot,'midsole',white,[0,-.022,.047],[.155,.062,.249]);
      ell(foot,'upper',white,[0,.035,.038],[.144,.104,.223]);
      ell(foot,'toe-cap',ink,[0,.047,.181],[.133,.079,.087]);
      ell(foot,'heel',ink,[0,.045,-.145],[.13,.083,.061]);
      ell(foot,'collar',black,[0,.114,-.039],[.114,.047,.113]);
      ell(foot,'tongue',white,[0,.116,.034],[.081,.073,.072],[.42,0,0]);
      for(let j=0;j<3;j++)tube(foot,'lace',[[-.07,.098-j*.011,.065+j*.036],[0,.119-j*.012,.073+j*.036],[.07,.098-j*.011,.065+j*.036]],.012,white,6);
      box(foot,'tongue-logo',ink,[0,.168,.073],[.065,.025,.012],[.35,0,-.15]);
      for(let j=0;j<3;j++)box(foot,'sole-groove',seam,[s*.141,-.02,-.035+j*.075],[.012,.023,.029]);
      legs.push(thigh);
    }
    const tank=group(torso,'tank',0,-.025,-.295);
    box(tank,'backplate',black,[0,0,.065],[.27,.50,.07]);
    const fill=group(tank,'inkFill',0,-.215,-.015);
    mesh(fill,'liquid',new T.CylinderGeometry(.142,.142,.42,20),ink,[0,.21,-.03]);
    mesh(tank,'shell',new T.CylinderGeometry(.163,.163,.46,24,1,true),glass,[0,0,-.04]);
    for(const y of [-.27,.27])mesh(tank,'cap',new T.CylinderGeometry(.182,.182,.065,20),black,[0,y,-.023]);
    for(const s of [-1,1])box(tank,'rail',seam,[s*.154,0,-.075],[.029,.49,.046]);
    for(let j=0;j<5;j++)box(tank,'level-mark',white,[-.037,-.15+j*.078,-.198],[j%2?.027:.05,.012,.008]);
    tube(torso,'hose',[[0,-.32,-.32],[-.18,-.40,-.37],[-.35,-.31,-.20],[-.28,-.18,.08]],.033,black,20);
    // Squid materials are intentionally separate from the human palette.
    const squid=group(root,'squid',0,.3,0); squid.visible=false;
    const sqInk=ink.clone();sqInk.name='squid-main';const sqUnder=under.clone();sqUnder.name='squid-under';
    const sqWhite=eyeWhite.clone(),sqMask=black.clone(),sqIris=iris.clone(),sqPupil=pupil.clone();
    sqWhite.name='squid-white';sqMask.name='squid-mask';sqIris.name='squid-iris';sqPupil.name='squid-pupil';
    const mantle=new T.Shape();mantle.moveTo(0,.66);mantle.bezierCurveTo(.15,.58,.38,.24,.66,-.12);mantle.bezierCurveTo(.73,-.28,.40,-.29,.25,-.20);mantle.quadraticCurveTo(0,-.44,-.25,-.20);mantle.bezierCurveTo(-.40,-.29,-.73,-.28,-.66,-.12);mantle.bezierCurveTo(-.38,.24,-.15,.58,0,.66);
    const outline=mantle.getPoints(48),mp=[],mi=[],mu=[],N=outline.length-1,rings=12;
    // A rounded mantle with a domed upper surface and a shallow underside.
    for(let j=0;j<=rings;j++){const a=j/rings*Math.PI,radius=Math.sin(a),height=Math.cos(a)*.16+.03;
      for(let i=0;i<=N;i++){const q=outline[i%N];mp.push(q.x*radius,height,q.y*radius);mu.push(i/N,j/rings);}}
    for(let j=0;j<rings;j++)for(let i=0;i<N;i++){const a=j*(N+1)+i,b=a+N+1;mi.push(a,b,a+1,b,b+1,a+1);}
    const mantleGeo=new T.BufferGeometry();mantleGeo.setAttribute('position',new T.Float32BufferAttribute(mp,3));mantleGeo.setAttribute('uv',new T.Float32BufferAttribute(mu,2));mantleGeo.setIndex(mi);mantleGeo.computeVertexNormals();
    mesh(squid,'mantle',mantleGeo,sqInk);
    ell(squid,'belly',sqUnder,[0,-.05,-.035],[.28,.10,.38]);
    for(const s of [-1,1]) {
      const fin=group(squid,'squid-fin-'+s,s*.35,0,-.20);
      ribbon(fin,'fin',[[0,0,0],[s*.19,-.015,-.13],[s*.32,-.02,-.27]], [.15,.13,.005],[.06,.044,.005],sqInk,18);
      for(let j=0;j<2;j++)ribbon(squid,'squid-arm',[[s*(.1+j*.17),0,-.26],[s*(.13+j*.23),-.01,-.50],[s*(.06+j*.32),.02,-.71+j*.06]], [.085,.069,.003],[.06,.047,.003],sqInk,18);
      const eye=group(squid,'squid-eye-'+s,s*.16,.24,.045);eye.rotation.x=-Math.PI/3;
      ell(eye,'mask',sqMask,[0,0,0],[.163,.171,.055]);ell(eye,'white',sqWhite,[0,0,.045],[.128,.139,.04]);ell(eye,'iris',sqIris,[-s*.008,0,.08],[.072,.10,.019]);ell(eye,'pupil',sqPupil,[-s*.008,.005,.099],[.034,.065,.011]);ell(eye,'glint',sqWhite,[-.025,.055,.109],[.02,.022,.006]);
    }
    const ringMat=mat('ring-team-light',0xffc64a,.48,{emissive:0xff7416,emissiveIntensity:.15});
    const ring=mesh(root,'ring',new T.TorusGeometry(.62,.027,6,40),ringMat,[0,.025,0],[1,1,1],[Math.PI/2,0,0]);ring.castShadow=false;
    const marker=mesh(root,'marker',new T.ConeGeometry(.13,.22,4),white,[0,2.40,0],[1,1,1],[Math.PI,Math.PI/4,0]);marker.castShadow=false;
    group(root,'gun',.49,.98,.28);
    // Merge rigid surfaces by material inside each joint (no skinned draw-call explosion).
    function bake(parent) {
      for(const child of [...parent.children])if(!child.isMesh)bake(child);
      const buckets=new Map();
      for(const o of parent.children)if(o.isMesh&&!['marker','ring'].includes(o.name)) {
        if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material).push(o);
      }
      for(const [m,parts] of buckets){if(parts.length<2)continue;const ps=[],ns=[],uvs=[];
        for(const o of parts){o.updateMatrix();const g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone());g.applyMatrix4(o.matrix);ps.push(...g.attributes.position.array);ns.push(...g.attributes.normal.array);uvs.push(...g.attributes.uv.array);g.dispose();parent.remove(o);}
        const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(ps,3));g.setAttribute('normal',new T.Float32BufferAttribute(ns,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));mesh(parent,parent.name+'-'+m.name,g,m);
      }
    }
    bake(root); root.updateMatrixWorld(true);return root;
  }
  function create(T,palette,role='bot') {
    if(!template||lib!==T){lib=T;template=build(T);}
    const g=template.clone(true),mats=new Map(),teamMaterials=[];
    g.traverse(o=>{if(!o.isMesh)return;if(!mats.has(o.material)){const m=o.material.clone();mats.set(o.material,m);const n=m.name;
      if(n==='team-main'||n==='squid-main')teamMaterials.push({material:m,color:'main'});
      if(n==='team-light')teamMaterials.push({material:m,color:'light'});
      if(n==='ring-team-light')teamMaterials.push({material:m,color:'light',emissive:'main'});
    }o.material=mats.get(o.material);});
    const get=n=>g.getObjectByName(n),marker=get('marker');marker.material=marker.material.clone();marker.material.color.setHex(role==='self'?0xffffff:palette.light).convertSRGBToLinear();
    if(role!=='self')teamMaterials.push({material:marker.material,color:'light'});
    for(const e of teamMaterials){e.linearColor=true;e.material.color.setHex(palette[e.color]).convertSRGBToLinear();if(e.emissive)e.material.emissive.setHex(palette[e.emissive]);}
    const rig={head:get('head'),torso:get('torso'),pelvis:get('pelvis'),inkFill:get('inkFill'),arms:[],forearms:[],legs:[],shins:[],tentacles:[get('tentacle--1'),get('tentacle-1')],fins:[get('squid-fin--1'),get('squid-fin-1')]};
    for(const side of ['left','right']){rig.arms.push(get(side+'-upperArm'));rig.forearms.push(get(side+'-forearm'));rig.legs.push(get(side+'-thigh'));rig.shins.push(get(side+'-shin'));}
    return {group:g,kid:[get('human')],gun:get('gun'),squid:get('squid'),ring:get('ring'),marker,teamMaterials,humanParts:[get('human'),get('gun')],rig,modelVersion:7};
  }
  function update(entity,dt,moveAmount=0,time=0) {
    if(!entity.rig||entity.dead)return;
    const T=lib,r=entity.rig;
    dt=Math.min(.05,Math.max(0,dt||0));
    r.speed=T.MathUtils.lerp(r.speed||0,Math.min(1,Math.max(0,moveAmount)),1-Math.exp(-dt*12));
    r.phase=(r.phase||0)+dt*(2+r.speed*10);
    const stride=Math.sin(r.phase)*r.speed,air=entity.vy!==undefined&&Math.abs(entity.vy)>.3;
    for(let i=0;i<2;i++){
      const s=i===0?-1:1;r.legs[i].rotation.x=air?-.30+s*.10:stride*s*.48;
      r.shins[i].rotation.x=air?.65:Math.max(0,-stride*s)*.64;
      r.tentacles[i].rotation.x=Math.sin(r.phase*.7+i*.5)*(.022+r.speed*.09);
      r.tentacles[i].rotation.z=s*(Math.sin(r.phase*.5)*.018+r.speed*.075);
      r.fins[i].rotation.z=s*Math.sin(r.phase*1.5)*(.06+r.speed*.12);
    }
    r.head.rotation.z=Math.sin(time*1.5)*.012*(1-r.speed);
    r.torso.rotation.x=r.speed*.045;
    r.torso.scale.y=1+Math.sin(time*2.2)*.008;
    if(Number.isFinite(entity.ink))r.inkFill.scale.y=Math.max(.035,T.MathUtils.clamp(entity.ink,0,1));
    entity.squid.scale.set(1-Math.sin(r.phase*1.6)*r.speed*.05,1,1+Math.sin(r.phase*1.6)*r.speed*.08);
    // Two-bone arms target the equipped model, retaining the game's weapon placement.
    // Coordinates are in actor space; solving analytically keeps elbows outside torso.
    entity.group.updateMatrixWorld(true);
    const inv=new T.Matrix4().copy(entity.group.matrixWorld).invert();
    for(let i=0;i<2;i++){
      const side=i===0?-1:1,arm=r.arms[i],fore=r.forearms[i],gun=(i===0&&entity.gunExtra)?entity.gunExtra:entity.gun;
      if(!gun||!gun.userData.weaponKey){arm.rotation.set(-.10-stride*side*.30,0,side*.16);fore.rotation.set(-.12,0,0);continue;}
      const key=gun.userData.weaponKey;
      const target=new T.Vector3(i===0&&key!=='dualies'?-.10:0,-.17,i===0&&key!=='dualies'?.38:0);
      if(key==='roller')target.set(i===0?-.10:0,-.10,i===0?.30:0);
      if(key==='slosher')target.set(i===0?-.17:.10,.02,.01);
      gun.localToWorld(target);target.applyMatrix4(inv);
      const start=arm.position.clone(),dir=target.clone().sub(start),len=T.MathUtils.clamp(dir.length(),.07,.59);dir.normalize();
      const upper=.32,lower=.287,along=(upper*upper-lower*lower+len*len)/(2*len),height=Math.sqrt(Math.max(0,upper*upper-along*along));
      const pole=new T.Vector3(side,-.45,-.45);pole.addScaledVector(dir,-pole.dot(dir)).normalize();
      const elbow=start.clone().addScaledVector(dir,along).addScaledVector(pole,height);
      arm.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),elbow.clone().sub(start).normalize());
      const localDir=target.clone().sub(elbow).normalize().applyQuaternion(arm.quaternion.clone().invert());
      fore.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),localDir);
    }
  }
  return {create,update};
})();
if(typeof module!=='undefined')module.exports=InkCharacter;
