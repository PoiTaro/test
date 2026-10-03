/* Character v8: sculpted parametric surfaces, continuous skinned limbs,
 * face-conforming eye surfaces, articulated hair, separate material palettes.
 * +Z forward, +Y up; every actor owns its skeleton and materials.
 */
const InkCharacter=(()=>{
  let template,lib;
  function build(T){
    const root=new T.Group();root.name='InkRunnerV2';
    const human=new T.Group();human.name='human';root.add(human);
    const mats={};
    function material(name,color,roughness=.5,extra={}){const m=new T.MeshPhysicalMaterial({color,roughness,metalness:0,...extra});m.color.convertSRGBToLinear();m.name=name;mats[name]=m;return m;}
    const skin=material('skin',0xffae86,.47,{clearcoat:.18,clearcoatRoughness:.4}),skinShade=material('skin-shadow',0xdb8558,.65);
    const skinBones=skin.clone();skinBones.name='skin-skinned';skinBones.skinning=true;
    const orange=material('team-main',0xff6810,.25,{clearcoat:1,clearcoatRoughness:.19});
    const light=material('team-light',0xffc336,.36,{clearcoat:.5});
    const underside=material('underside',0xffd4b6,.43),cupShade=material('cup-inner',0xd99b79,.58);
    const fabric=material('fabric',0x202633,.87),stitch=material('seam',0x3b4251,.86);
    const rubber=material('rubber',0x151924,.76),mask=material('mask',0x10111a,.45),ivory=material('white',0xf5f1ed,.52);
    const eyeWhite=material('eye-white',0xfffcf7,.4,{clearcoat:.6}),iris=material('iris',0x9850e8,.18,{clearcoat:1});
    const metal=material('frame-metal',0x343c49,.43,{metalness:.15});
    const glass=material('tank-glass',0xffffff,.13,{clearcoat:1,clearcoatRoughness:.08,transparent:true,opacity:.20,depthWrite:false});
    const sphere=new T.SphereGeometry(1,32,20);
    const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=T.MathUtils.clamp;
    function group(parent,name,x=0,y=0,z=0,bone=false){const g=bone?new T.Bone():new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;}
    function geo(pos,indices,uv=[]){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));if(uv.length)g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();const sums=new Map(),keys=[],na=g.attributes.normal;for(let i=0;i<pos.length/3;i++){const k=[pos[i*3],pos[i*3+1],pos[i*3+2]].map(x=>Math.round(x*1e5)).join(',');keys.push(k);if(!sums.has(k))sums.set(k,new T.Vector3());sums.get(k).add(new T.Vector3().fromBufferAttribute(na,i));}for(const n of sums.values())n.normalize();for(let i=0;i<keys.length;i++){const n=sums.get(keys[i]);na.setXYZ(i,n.x,n.y,n.z);}return g;}
    function mesh(parent,name,g,m){const o=new T.Mesh(g,m);o.name=name;o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
    function ell(parent,name,m,p,r,rot=[0,0,0]){const o=mesh(parent,name,sphere,m);o.position.set(...p);o.scale.set(...r);o.rotation.set(...rot);return o;}
    function grid(fn,nu=48,nv=24,flip=false,materialAt=null){
      const p=[],uv=[],idx=[],buckets=new Map();
      for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){const v=fn(i/nu,j/nv);p.push(v.x,v.y,v.z);uv.push(i/nu,j/nv);}
      for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+nu+1,tris=flip?[a,a+1,b,b,a+1,b+1]:[a,b,a+1,b,b+1,a+1];
        if(materialAt){const m=materialAt((i+.5)/nu,(j+.5)/nv);if(!buckets.has(m))buckets.set(m,[]);buckets.get(m).push(...tris);}else idx.push(...tris);}
      const groups=[];for(const [m,list] of buckets){groups.push([idx.length,list.length,m]);for(const v of list)idx.push(v);}
      const g=geo(p,idx,uv);for(const q of groups)g.addGroup(...q);return g;
    }
    function smooth(t){t=clamp(t,0,1);return t*t*(3-2*t);}
    // Monotone cubic profiles preserve volume without horizontal ridges.
    function cubicProfile(rows,x){
      const n=rows.length;let j=0;while(j<n-2&&x>rows[j+1][0])j++;
      const a=rows[j],b=rows[j+1],h=b[0]-a[0],u=clamp((x-a[0])/h,0,1);
      return a.slice(1).map((_,k)=>{k++;const d=(i)=>(rows[i+1][k]-rows[i][k])/(rows[i+1][0]-rows[i][0]);
        const slope=(i)=>{if(i===0)return d(0);if(i===n-1)return d(n-2);const l=d(i-1),r=d(i);if(l*r<=0)return 0;const hl=rows[i][0]-rows[i-1][0],hr=rows[i+1][0]-rows[i][0],w1=2*hr+hl,w2=hr+2*hl;return (w1+w2)/(w1/l+w2/r);};
        return (2*u*u*u-3*u*u+1)*a[k]+(u*u*u-2*u*u+u)*h*slope(j)+(-2*u*u*u+3*u*u)*b[k]+(u*u*u-u*u)*h*slope(j+1);
      });
    }
    function interp(rows,t){return cubicProfile(rows.map((v,i)=>[i/(rows.length-1),v]),clamp(t,0,1))[0];}
    function profile(rows,y){return cubicProfile(rows,y);}
    function tube(parent,name,points,r,m,steps=32){const c=new T.CatmullRomCurve3(points.map(p=>Array.isArray(p)?V(...p):p));return mesh(parent,name,new T.TubeGeometry(c,steps,r,9,false),m);}
    function loft(parent,name,points,widths,depths,m,opts={}){
      const c=new T.CatmullRomCurve3(points.map(p=>V(...p))),n=opts.steps||40,r=opts.sides||32,up=opts.up||false;
      const frame=t=>{const p=c.getPointAt(t),tan=c.getTangentAt(t),N=V(1,0,0).addScaledVector(tan,-tan.x).normalize(),B=N.clone().cross(tan).normalize().multiplyScalar(-1);return {p,tan,N,B,w:interp(widths,t),d:interp(depths,t)};};
      const at=(a,t)=>{const f=frame(t);return f.p.clone().addScaledVector(f.N,Math.cos(a)*f.w).addScaledVector(f.B,Math.sin(a)*f.d);};
      const g=grid((u,t)=>at(u*Math.PI*2,t),r,n,!up,opts.materialAt);const o=mesh(parent,name,g,m);o.userData.loft={at,frame};return o;
    }
    function diskPatch(parent,name,m,center,rx,ry,zAt,angle=0,cut=0,side=1,capY=null){const co=Math.cos(angle),si=Math.sin(angle);return mesh(parent,name,grid((u,r)=>{const a=u*Math.PI*2,dx=Math.cos(a)*rx*r,dy=(Math.sin(a)*ry-cut*Math.max(0,Math.sin(a))**.75*(1-side*Math.cos(a))*.5)*r,x=center[0]+dx*co-dy*si;let y=center[1]+dx*si+dy*co;if(capY){const top=capY(x);y=.5*(y+top-Math.sqrt((y-top)**2+.000025));}return V(x,y,zAt(x,y,r));},64,18),m);}
    function roundedBox(parent,name,m,p,size,r=.025){const shape=new T.Shape(),x=-size[0]/2,y=-size[1]/2,w=size[0],h=size[1],s=Math.min(r,w/2,h/2);shape.moveTo(x+s,y);shape.lineTo(x+w-s,y);shape.quadraticCurveTo(x+w,y,x+w,y+s);shape.lineTo(x+w,y+h-s);shape.quadraticCurveTo(x+w,y+h,x+w-s,y+h);shape.lineTo(x+s,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-s);shape.lineTo(x,y+s);shape.quadraticCurveTo(x,y,x+s,y);const g=new T.ExtrudeGeometry(shape,{depth:size[2],bevelEnabled:true,bevelThickness:.006,bevelSize:.006,bevelSegments:2,steps:1,curveSegments:6});g.translate(0,0,-size[2]/2);const o=mesh(parent,name,g,m);o.position.set(...p);return o;}
    // Head silhouette uses an authored chin / cheek / brow / skull profile.
    const head=group(human,'head',0,1.690,0);
    const hp=[[-.33,.015,.08,.075],[-.305,.12,.145,.055],[-.25,.25,.225,.02],[-.14,.325,.278,0],[.0,.355,.302,-.008],[.13,.354,.294,-.018],[.26,.295,.25,-.025],[.35,.10,.105,-.03],[.365,.002,.002,-.03]];
    function faceZ(x,y){const [w,d,z]=profile(hp,clamp(y,-.329,.364));let zz=z+d*Math.sqrt(Math.max(.001,1-(x/w)**2));zz+=.028*Math.exp(-((x/.046)**2+((y+.14)/.040)**2));zz+=.009*(Math.exp(-(((x-.21)/.10)**2+((y+.15)/.08)**2))+Math.exp(-(((x+.21)/.10)**2+((y+.15)/.08)**2)));return zz;}
    mesh(head,'sculpted-head',grid((u,v)=>{const a=u*2*Math.PI,y=T.MathUtils.lerp(hp[0][0],hp[hp.length-1][0],v),[w,d,z]=profile(hp,y),x=Math.cos(a)*w;let zz=z+Math.sin(a)*d;if(Math.sin(a)>0)zz=faceZ(x,y);return V(x,y,zz);},80,72),skin);
    const neck=group(human,'neck',0,1.345,0);
    loft(neck,'neck-surface',[[0,-.08,0],[0,0,0],[0,.08,0]],[.09,.084,.09],[.073,.074,.08],skin,{steps:16,up:true});
    for(const s of [-1,1]){
      mesh(head,'ear-'+s,grid((u,v)=>{const a=u*Math.PI*2,r=(1-v)**.76;return V(s*(.301+.239*v),.008+.055*v+Math.sin(a)*.088*r,-.017-.13*v+Math.cos(a)*.066*r);},40,30,s>0),skin);
    }
    // Conforming eye mask and shallow almond sclera; no separate protruding eyeballs.
    const bridge=grid((u,v)=>{const x=(u-.5)*.080,y=-.079+(v*.029);return V(x,y,faceZ(x,y)+.010);},24,12,true);mesh(head,'mask-bridge',bridge,mask);
    const irisTexture=(()=>{if(typeof document==='undefined')return null;const c=document.createElement('canvas');c.width=c.height=256;const cx=c.getContext('2d');const gr=cx.createRadialGradient(128,128,32,128,128,127);gr.addColorStop(0,'#321148');gr.addColorStop(.38,'#7f2dc7');gr.addColorStop(.76,'#b662f5');gr.addColorStop(1,'#29143a');cx.fillStyle=gr;cx.fillRect(0,0,256,256);for(let i=0;i<120;i++){const a=i/120*Math.PI*2,r=74+(i%7)*3;cx.strokeStyle=i%3?'#5d228f80':'#d098fb90';cx.lineWidth=i%3?1:2;cx.beginPath();cx.moveTo(128+Math.cos(a)*55,128+Math.sin(a)*55);cx.lineTo(128+Math.cos(a)*r,128+Math.sin(a)*r);cx.stroke();}cx.fillStyle='#110a22';cx.beginPath();cx.ellipse(128,124,49,65,0,0,2*Math.PI);cx.fill();cx.fillStyle='white';cx.beginPath();cx.ellipse(99,75,18,22,-.2,0,2*Math.PI);cx.fill();cx.fillStyle='#ffffffb0';cx.beginPath();cx.ellipse(164,164,7,9,0,0,2*Math.PI);cx.fill();const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;return t;})();
    if(irisTexture){iris.map=irisTexture;iris.color.setHex(0xffffff);}
    function eyeSurface(parent,s,center,depthFn,scale=1,tag=''){
      const ang=0,cx=center[0],cy=center[1],rz=depthFn;
      const lid=(x,h)=>cy+h*scale+s*.31*(x-cx)+.006*scale*(1-((x-cx)/(.128*scale))**2);
      diskPatch(parent,tag+'mask-'+s,mask,[cx,cy],.147*scale,.111*scale,(x,y,r)=>rz(x,y)+.008+(.005*(1-r*r)),ang,0,s,(x)=>lid(x,.082));
      diskPatch(parent,tag+'sclera-'+s,eyeWhite,[cx,cy],.128*scale,.090*scale,(x,y,r)=>rz(x,y)+.012+(.007*(1-r*r)),ang,0,s,(x)=>lid(x,.063));
      const ir=diskPatch(parent,tag+'iris-'+s,iris,[cx-s*.018*scale,cy-.004*scale],.061*scale,.068*scale,(x,y,r)=>rz(x,y)+.023+.002*(1-r*r),0,0,s,(x)=>lid(x,.059));
      // Radial patch UVs converted to Cartesian texture coordinates.
      const p=ir.geometry.attributes.position,uv=ir.geometry.attributes.uv;for(let i=0;i<p.count;i++){uv.setXY(i,(p.getX(i)-(cx-s*.018*scale))/(.122*scale)+.5,(p.getY(i)-(cy-.004*scale))/(.136*scale)+.5);}uv.needsUpdate=true;
    }
    for(const s of [-1,1]){
      eyeSurface(head,s,[s*.143,-.051],faceZ,.90);
      const pts=[];for(let i=0;i<7;i++){const t=i/6,x=s*(.085+t*.16),y=.049+t*.045-.008*Math.sin(Math.PI*t);pts.push([x,y,faceZ(x,y)+.023]);}
      loft(head,'brow-'+s,pts,[.002,.019,.024,.024,.021,.012,.002],[.002,.016,.017,.018,.014,.008,.002],orange,{steps:28});
    }
    const nose=ell(head,'nose',skin,[0,-.156,faceZ(0,-.156)+.003],[.029,.021,.017]);
    const smilePts=[];for(let i=0;i<12;i++){const x=(i/11-.5)*.165,y=-.223+.022*(Math.abs(x)/.083)**1.5;smilePts.push([x,y,faceZ(x,y)+.003]);}tube(head,'smile',smilePts,.0035,skinShade,24);
    // Crown is a contiguous domed shell with subtle authored lobe grooves.
    const crownFn=(u,v)=>{const a=u*2*Math.PI,theta=v*(1.50+.68*Math.max(0,-Math.sin(a))),rr=1+.018*Math.cos(a*5)*Math.sin(theta)**2;return V(Math.cos(a)*.382*Math.sin(theta)*rr,.063+.347*Math.cos(theta),-.03+Math.sin(a)*.327*Math.sin(theta)*rr);};
    mesh(head,'crown',grid(crownFn,96,40,true),orange);
    for(const s of [-1,1]){
      loft(head,'back-crown-'+s,[[s*.16,.24,-.256],[s*.185,-.015,-.334],[s*.135,-.252,-.213]],[.090,.120,.003],[.04,.050,.003],orange,{steps:36});
      loft(head,'cheek-strand-'+s,[[s*.28,.23,.17],[s*.308,.06,.23],[s*.31,-.15,.21],[s*.285,-.26,.15]],[.053,.05,.035,.002],[.038,.038,.028,.002],orange);
    }
    loft(head,'back-crown-center',[[0,.285,-.23],[0,-.035,-.335],[0,-.25,-.222]],[.055,.103,.002],[.035,.052,.002],orange,{steps:40});
    for(const s of [-1,1])loft(head,'crown-fold-'+s,[[s*.065,.397,-.027],[s*.255,.317,-.045],[s*.344,.135,-.083]],[.004,.068,.004],[.011,.054,.004],orange,{steps:40});
    loft(head,'swept-crown-lock',[[.075,.397,-.042],[-.155,.367,-.015],[-.315,.281,-.020],[-.362,.139,-.060]],[.005,.071,.071,.006],[.006,.049,.060,.006],orange,{steps:44,sides:40});
    // Beveled, thick bangs: visible front planes, softly rounded lower corners.
    const bang=roundedBox(head,'center-bang',orange,[-.012,.161,.321],[.194,.082,.013],.008);bang.rotation.z=-.04;bang.rotation.x=.13;
    for(const s of [-1,1]){const q=roundedBox(head,'bang-side-'+s,orange,[s*.215,.149,.265],[.034,.082,.014],.009);q.rotation.z=s*.18;q.rotation.y=s*.43;}
    // Thick side locks use a smoothly varying ellipse with an integrated pale side.
    for(const s of [-1,1]){
      const lock=group(head,'tentacle-'+s,s*.285,.205,-.145);
      const points=[[0,0,0],[s*.075,-.34,-.052],[s*.20,-.65,-.07],[s*.315,-.895,.016],[s*.365,-1.13,.084]];
      const surface=loft(lock,'fleshy-lock',points,[.055,.061,.115,.164,.002],[.043,.049,.077,.083,.002],[orange,underside],{steps:64,sides:48,materialAt:(u)=>{const a=u*2*Math.PI;return (s>0?(a>Math.PI*.48&&a<Math.PI*.98):(a>Math.PI*.02&&a<Math.PI*.52))?1:0;}});
      const at=surface.userData.loft.at,frame=surface.userData.loft.frame;
      function normalAt(a,t){const f=frame(t);return f.N.clone().multiplyScalar(Math.cos(a)/Math.max(.01,f.w)).addScaledVector(f.B,Math.sin(a)/Math.max(.01,f.d)).normalize();}
      const cupAngle=s>0?.74*Math.PI:.26*Math.PI;
      for(let j=0;j<3;j++){
        const t=.59+j*.135,a=cupAngle,cupR=[.042,.047,.036][j],p=at(a,t),n=normalAt(a,t);
        const cupGeo=new T.LatheGeometry([[0,-.006],[cupR*.40,-.004],[cupR*.70,.000],[cupR*.90,.008],[cupR,.014],[cupR*.88,.020],[cupR*.69,.012],[cupR*.52,-.001],[0,-.006]].map(p=>new T.Vector2(...p)),28);
        const cup=mesh(lock,'sucker-'+j,cupGeo,underside);cup.position.copy(p).addScaledVector(n,.0005);cup.quaternion.setFromUnitVectors(V(0,1,0),n);
        const dark=ell(lock,'cup-recess-'+j,cupShade,[0,0,0],[cupR*.46,.003,cupR*.46]);dark.position.copy(p).addScaledVector(n,.001);dark.quaternion.copy(cup.quaternion);
      }
      const spots=[[.43,s>0?.12:.88,.025],[.52,s>0?.31:.69,.035],[.60,s>0?.10:.90,.037],[.66,s>0?.32:.68,.032],[.72,s>0?.07:.93,.040],[.80,s>0?.30:.70,.028],[.88,s>0?.09:.91,.025],[.47,1.32,.024],[.56,1.72,.032],[.63,1.31,.034],[.72,1.65,.029],[.80,1.24,.039],[.88,1.61,.026]];
      for(let j=0;j<spots.length;j++){const [t,u,rad]=spots[j],a=u*Math.PI,p=at(a,t),n=normalAt(a,t);const f=frame(t);const d=mesh(lock,'spot-'+j,grid((uu,v)=>{const aa=a+Math.cos(uu*2*Math.PI)*v*rad/Math.max(.05,f.w),tt=clamp(t+Math.sin(uu*2*Math.PI)*v*rad/.88,0,1);return at(aa,tt).addScaledVector(normalAt(aa,tt),.0008);},28,6),light);}
    }
    // Headband shell includes inner surface and top/bottom closure.
    const bandFn=(u,v)=>{const a=u*2*Math.PI,th=.004,rx=.392,rz=.341;return V(Math.cos(a)*rx,.196+v*.106+.022*Math.sin(a),-.03+Math.sin(a)*rz);};
    const band=mesh(head,'headband',grid(bandFn,96,8,true),ivory);band.material=ivory.clone();band.material.side=T.DoubleSide;band.material.name='headband';
    for(const v of [0,1])tube(head,'band-binding',Array.from({length:65},(_,i)=>bandFn(i/64,v)),.006,ivory,64);
    for(let j=0;j<3;j++){
      const gx=.18+j*.036;mesh(head,'headband-mark-'+j,grid((u,v)=>{const x=gx+(u-.5)*.024+(v-.5)*.028,y=.225+v*.065,z=-.03+.341*Math.sqrt(1-(x/.392)**2);return V(x,y,z+.0015);},10,8,true),orange);
    }
    // Shirt is a sculpted shaped shell with a waist and subtle hem folds.
    const torso=group(human,'torso',0,1.06,0),pelvis=group(human,'pelvis',0,.765,0);
    const tp=[[-.30,.213,.159],[-.245,.218,.168],[-.12,.195,.157],[.02,.201,.167],[.14,.220,.174],[.225,.225,.159],[.275,.091,.08]];
    function shirtAt(a,y,offset=0){const [w,d]=profile(tp,y),fold=.004*Math.sin(a*5+y*14)*(1-smooth((y+.1)/.3));return V(Math.cos(a)*(w+offset+fold),y,Math.sin(a)*(d+offset+fold));}
    mesh(torso,'shirt',grid((u,v)=>shirtAt(u*2*Math.PI,T.MathUtils.lerp(-.30,.275,v)),64,40),fabric);
    for(const y of [-.295,-.272])tube(torso,'hem-seam',Array.from({length:65},(_,i)=>shirtAt(i/64*2*Math.PI,y,.002)),.003,stitch,64);
    tube(torso,'collar',Array.from({length:33},(_,i)=>{const a=i/32*2*Math.PI;return V(Math.cos(a)*.092,.275,Math.sin(a)*.081);}),.012,rubber,32);
    for(let j=0;j<3;j++){
      const x=-.066+j*.058;mesh(torso,'shirt-logo-'+j,grid((u,v)=>{const xx=x+(u-.5)*.024+(v-.5)*.045,y=.025+v*.067,[w,d]=profile(tp,y);return V(xx,y,d*Math.sqrt(1-(xx/w)**2)+.008);},10,8,true),ivory);
    }
    for(const s of [-1,1]){
      const ar=roundedBox(torso,'shirt-corner-'+s,orange,[s*.211,-.253,.103],[.061,.064,.009],.007);ar.rotation.z=-s*.24;
      const points=[[s*.19,-.22,.174],[s*.19,.04,.179],[s*.205,.20,.13],[s*.184,.256,-.01],[s*.172,.18,-.19],[s*.163,-.19,-.17]];
      const c=new T.CatmullRomCurve3(points.map(p=>V(...p)));const strap=mesh(torso,'orange-strap-'+s,grid((u,v)=>{const p=c.getPointAt(v);p.x+=(u-.5)*.034;return p;},8,40,true),orange);strap.material=orange.clone();strap.material.side=T.DoubleSide;strap.material.name='team-main';
      for(const xx of [-.018,.018])tube(torso,'strap-binding',points.map(p=>[p[0]+xx,p[1],p[2]]),.004,rubber,36);
      roundedBox(torso,'strap-buckle-'+s,rubber,[s*.19,-.12,.183],[.049,.053,.012],.004);
    }
    // Bone chains and genuinely continuous skinned arm/leg surfaces.
    const chains=[];
    function limb(s,kind){const arm=kind==='arm',side=s<0?'left':'right',upperLen=arm?.26:.300,lowerLen=arm?.22:.230;
      const base=group(human,side+(arm?'-upperArm':'-thigh'),s*(arm?.225:.145),arm?1.230:.775,arm?0:-.008,true);
      base.rotation.z=s*(arm?.23:.025);base.userData.restZ=base.rotation.z;
      const lower=group(base,side+(arm?'-forearm':'-shin'),0,-upperLen,0,true);
      const end=group(lower,side+(arm?'-hand':'-shoe'),0,-lowerLen,arm?.018:.05,true);
      chains.push({base,lower,end,arm,upperLen,lowerLen,s});human.updateMatrixWorld(true);
      const length=upperLen+lowerLen,start=arm?.10:.075;
      const p=[],uv=[],indices=[],si=[],sw=[],rows=48,radial=32;
      for(let j=0;j<=rows;j++){const d=T.MathUtils.lerp(start,length+.008,j/rows),r=arm?interp([.069,.074,.069,.060,.066,.058,.048],j/rows):interp([.104,.106,.093,.072,.079,.071,.052],j/rows),depth=r*(arm?.94:.89);
        for(let i=0;i<=radial;i++){const a=i/radial*Math.PI*2,v=V(Math.cos(a)*r,-d,Math.sin(a)*depth);v.applyMatrix4(base.matrixWorld);p.push(v.x,v.y,v.z);uv.push(i/radial,j/rows);
          const w=smooth((d-(upperLen-.065))/.13);si.push(0,1,0,0);sw.push(1-w,w,0,0);
        }}
      for(let j=0;j<rows;j++)for(let i=0;i<radial;i++){const a=j*(radial+1)+i,b=a+radial+1;indices.push(a,a+1,b,b,a+1,b+1);}
      const g=geo(p,indices,uv);g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));
      const o=new T.SkinnedMesh(g,skinBones);o.name=side+'-'+kind+'-continuous';o.castShadow=o.receiveShadow=true;human.add(o);o.bind(new T.Skeleton([base,lower,end]));
      if(arm){
        loft(base,'sleeve',[[0,.025,0],[0,-.05,0],[0,-.16,0]],[.094,.100,.092],[.096,.102,.094],fabric,{steps:26});
        tube(base,'sleeve-rim',Array.from({length:33},(_,i)=>{const a=i/32*2*Math.PI;return [Math.cos(a)*.093,-.16,Math.sin(a)*.095];}),.007,stitch,32);
        const cuff=mesh(end,'wrist-cuff',new T.CylinderGeometry(.064,.068,.071,32),rubber);cuff.position.y=.025;
        const band=mesh(end,'wrist-orange',new T.CylinderGeometry(.069,.069,.014,32),orange);band.position.y=.019;
        // Sculpted palm and four fingers plus a side thumb; glove follows palm volume.
        loft(end,'glove-palm',[[0,.015,0],[0,-.055,.003],[0,-.13,.014]],[.068,.090,.073],[.047,.046,.032],rubber,{steps:28});
        for(let k=0;k<4;k++){
          const xx=-.058+k*.038,len=[.046,.057,.052,.043][k];
          loft(end,'finger-'+k,[[xx,-.107,.01],[xx,-.135,.014],[xx,-.135-len,.031],[xx,-.139-len,.044]],[.020,.020,.016,.004],[.023,.022,.018,.004],skin,{steps:18,sides:16});
          loft(end,'finger-glove-'+k,[[xx,-.10,.011],[xx,-.125,.015],[xx,-.142,.019]],[.022,.021,.020],[.026,.024,.023],rubber,{steps:12,sides:16});
        }
        loft(end,'thumb',[[s*.065,-.024,.007],[s*.10,-.065,.015],[s*.087,-.12,.061]],[.026,.029,.001],[.026,.027,.001],skin,{steps:24,sides:20});
        roundedBox(end,'glove-pad',orange,[0,-.049,-.046],[.058,.031,.007],.012);
      }else{
        loft(base,'short-leg',[[0,.037,0],[0,-.066,0],[0,-.167,0]],[.121,.123,.114],[.119,.113,.101],fabric,{steps:26});
        tube(base,'short-seam',Array.from({length:33},(_,i)=>{const a=i/32*2*Math.PI;return [Math.cos(a)*.115,-.166,Math.sin(a)*.102];}),.005,stitch,32);
        const stripe=roundedBox(base,'short-orange-trim',orange,[s*.115,-.066,0],[.016,.175,.090],.005);
        const sock=mesh(end,'sock',new T.CylinderGeometry(.056,.059,.08,28),rubber);sock.position.set(0,.032,-.05);
      }
      return {base,lower,end};
    }
    const arms=[limb(-1,'arm'),limb(1,'arm')],legs=[limb(-1,'leg'),limb(1,'leg')];
    // Shorts waist and crotch are a shaped continuous shell above leg panels.
    loft(pelvis,'shorts-waist',[[0,.03,0],[0,-.055,0],[0,-.13,0]],[.202,.206,.166],[.155,.164,.133],fabric,{steps:26});
    tube(pelvis,'waistband',Array.from({length:49},(_,i)=>{const a=i/48*Math.PI*2;return [Math.cos(a)*.203,.017,Math.sin(a)*.157];}),.007,rubber,48);
    // Sneakers are dedicated shaped surfaces: sole, upper, panels, tongue and laces.
    for(let i=0;i<2;i++){
      const foot=legs[i].end,s=i===0?-1:1,shoe=group(foot,'sneaker-'+s,0,-.093,.014);
      const soleRows=[[-.139,.139,.222,.037],[-.123,.162,.246,.040],[-.083,.164,.247,.040],[-.035,.156,.238,.035],[-.016,.147,.228,.032]];
      function soleAt(a,y){const [w,d,z]=profile(soleRows,y),xx=Math.sign(Math.cos(a))*Math.abs(Math.cos(a))**.82*w,zz=Math.sign(Math.sin(a))*Math.abs(Math.sin(a))**.90*d+z;return V(xx,y+.009*Math.cos(a*4)*(1-smooth((y+.14)/.06)),zz);}
      mesh(shoe,'sculpted-midsole',grid((u,v)=>soleAt(u*2*Math.PI,T.MathUtils.lerp(-.122,-.020,v)),64,24),ivory);
      mesh(shoe,'outsole',grid((u,v)=>soleAt(u*2*Math.PI,T.MathUtils.lerp(-.139,-.122,v)),64,8),rubber);
      tube(shoe,'sole-top-binding',Array.from({length:65},(_,j)=>soleAt(j/64*2*Math.PI,-.019)),.004,ivory,64);
      const upperProfile=[[-.196,0,0],[-.155,.096,.075],[-.095,.134,.155],[-.025,.137,.167],[.05,.146,.121],[.145,.146,.094],[.235,.103,.068],[.279,0,0]];
      function shoeAt(a,z,offset=0){const [w,h]=profile(upperProfile,z);return V(Math.cos(a)*(w+offset),-.025+Math.sin(a)*(h+offset),z);}
      function ankleOpening(g){const a=g.attributes.position,idx=g.index.array,list=[];for(let i=0;i<idx.length;i+=3){const x=(a.getX(idx[i])+a.getX(idx[i+1])+a.getX(idx[i+2]))/3,y=(a.getY(idx[i])+a.getY(idx[i+1])+a.getY(idx[i+2]))/3,z=(a.getZ(idx[i])+a.getZ(idx[i+1])+a.getZ(idx[i+2]))/3;if(y>.068&&(x/.081)**2+((z+.074)/.084)**2<1)continue;list.push(idx[i],idx[i+1],idx[i+2]);}g.setIndex(list);return g;}
      const upper=mesh(shoe,'shoe-upper',ankleOpening(grid((u,v)=>shoeAt(u*Math.PI,T.MathUtils.lerp(-.195,.278,v)),48,72,true)),ivory);
      // Color panels are surface-conforming, so no colored blobs intersect the upper.
      mesh(shoe,'orange-toe',grid((u,v)=>shoeAt(.17*Math.PI+u*.66*Math.PI,.148+v*.122,.002),32,24,true),orange);
      for(const a of [.17*Math.PI,.83*Math.PI])tube(shoe,'toe-stitch',Array.from({length:17},(_,j)=>shoeAt(a,.145+j/16*.119,.003)),.003,ivory,16);
      const outA=s>0?.10*Math.PI:.90*Math.PI;
      mesh(shoe,'side-panel',grid((u,v)=>shoeAt(outA+(u-.5)*.15*Math.PI,-.06+v*.173,.003),12,24,true),orange);
      tube(shoe,'side-panel-binding',[-.061,-.02,.05,.11].map(z=>shoeAt(outA,.0+z,.005)),.004,ivory,24);
      mesh(shoe,'heel-color',grid((u,v)=>shoeAt(.24*Math.PI+u*.52*Math.PI,-.193+v*.057,.003),24,16,true),orange);
      // Padded collar encircles a visible dark ankle opening.
      const collarCenter=[0,.123,-.074];
      tube(shoe,'ankle-collar',Array.from({length:49},(_,j)=>{const a=j/48*2*Math.PI;return [Math.cos(a)*.087,.124+.013*Math.sin(a),-.074+Math.sin(a)*.089];}),.018,rubber,48);
      mesh(shoe,'tongue',grid((u,v)=>{const x=(u-.5)*.11,z=.006+v*.085,[w,h]=profile(upperProfile,z);return V(x,-.025+h*Math.sqrt(1-(x/w)**2)+.026+.024*(1-v),z);},16,16,true),ivory);
      for(let j=0;j<4;j++){
        const z=.016+j*.034,pts=[];for(let k=0;k<7;k++){const x=(k/6-.5)*.155,[w,h]=profile(upperProfile,z);pts.push([x,-.025+h*Math.sqrt(1-(x/w)**2)+.026+.014*(1-j/3),z+(k/6-.5)*(j%2?-.020:.020)]);}tube(shoe,'lace-'+j,pts,.009,ivory,20);
      }
      const label=roundedBox(shoe,'tongue-label',ivory,[0,.174,.054],[.099,.070,.012],.012);label.rotation.x=-.25;
      for(let j=0;j<3;j++){const q=roundedBox(shoe,'tongue-mark-'+j,orange,[-.020+j*.020,.174,.063],[.012,.034,.003],.002);q.rotation.z=-.25;}
      for(let j=0;j<4;j++){
        const q=roundedBox(shoe,'sole-flex-cut-'+j,rubber,[s*.162,-.098,-.055+j*.068],[.004,.022,.014],.002);q.rotation.z=-s*.2;
      }
    }
    // Ink tank: shaped cap rings, central transparent sleeve and independent fill.
    const tank=group(torso,'tank',0,-.035,-.295),inkFill=group(tank,'inkFill',0,-.219,-.030);
    const capProfile=[[.13,-.040],[.165,-.030],[.172,-.011],[.16,.018],[.143,.030]].map(p=>new T.Vector2(...p));
    for(const y of [-.267,.268]){const q=mesh(tank,'tank-cap',new T.LatheGeometry(capProfile,40),rubber);q.position.set(0,y,-.032);}
    const fill=mesh(inkFill,'ink-core',new T.CylinderGeometry(.133,.133,.426,40),orange);fill.position.y=.213;
    const shell=mesh(tank,'clear-shell',new T.CylinderGeometry(.153,.153,.460,48,1,true),glass);shell.position.z=-.030;
    for(const s of [-1,1])roundedBox(tank,'tank-frame-'+s,metal,[s*.146,0,-.037],[.029,.491,.060],.011);
    for(const y of [-.208,.207]){const q=mesh(tank,'tank-seal',new T.TorusGeometry(.152,.012,9,40),rubber);q.rotation.x=Math.PI/2;q.position.set(0,y,-.03);}
    for(let j=0;j<5;j++)roundedBox(tank,'tank-level-'+j,ivory,[-.028,-.152+j*.074,-.185],[j%2?.021:.043,.008,.003],.002);
    roundedBox(tank,'frame-backplate',rubber,[0,0,.048],[.27,.47,.035],.027);
    tube(torso,'tank-hose',[[0,-.334,-.325],[-.16,-.399,-.370],[-.291,-.376,-.274],[-.292,-.247,-.130],[-.230,-.188,.080]],.031,rubber,48);
    // Squid form: sculpted dome, integrated face, large paired fins and four arms.
    const squid=group(root,'squid',0,.3,0);squid.visible=false;
    const sqOrange=orange.clone();sqOrange.name='squid-main';const sqUnder=underside.clone();sqUnder.name='squid-under';const sqMask=mask.clone();sqMask.name='squid-mask';const sqWhite=eyeWhite.clone();sqWhite.name='squid-white';const sqIris=iris.clone();sqIris.name='squid-iris';
    // Squid built upright for sculpting, rotated forward into the gameplay swim pose.
    const sqBody=group(squid,'squid-body');sqBody.rotation.x=-Math.PI/2;
    const mantleRows=[[-.29,.045,.055,.11],[-.24,.175,.128,.08],[-.13,.32,.250,.033],[.02,.375,.290,0],[.155,.585,.223,-.003],[.30,.49,.190,-.007],[.47,.30,.145,-.012],[.62,.055,.043,-.009],[.65,0,0,-.008]];
    const sqFaceZ=(x,y)=>{const [w,d,z]=profile(mantleRows,clamp(y,-.285,.649));return z+d*Math.sqrt(Math.max(.001,1-(x/w)**2));};
    const mantle=mesh(sqBody,'rounded-mantle',grid((u,v)=>{const a=u*2*Math.PI,y=T.MathUtils.lerp(-.29,.65,v),[w,d,z]=profile(mantleRows,y);return V(Math.cos(a)*w,y,z+Math.sin(a)*d);},96,88),sqOrange);
    for(const s of [-1,1]){
      // Reuse eye patch construction with actor-local squid material clones.
      const n0=sqBody.children.length;eyeSurface(sqBody,s,[s*.128,-.048],sqFaceZ,1.03,'squid-');for(const o of sqBody.children.slice(n0)){if(o.material===mask)o.material=sqMask;if(o.material===eyeWhite)o.material=sqWhite;if(o.material===iris)o.material=sqIris;}
      const fin=group(sqBody,'squid-fin-'+s,s*.27,-.13,-.014);
      const finSurface=loft(fin,'squid-lateral-fin',[[0,0,0],[s*.15,-.11,0],[s*.34,-.20,.022],[s*.41,-.235,.035]],[.10,.12,.071,.001],[.062,.070,.049,.001],sqOrange,{steps:36});
      for(let j=0;j<3;j++){const t=[.33,.57,.73][j],angle=[1.15,1.82,1.25][j],rad=[.028,.037,.020][j],f=finSurface.userData.loft.frame(t),at=finSurface.userData.loft.at;
        const spot=mesh(fin,'fin-spot-'+j,grid((u,v)=>{const a=angle+Math.cos(u*2*Math.PI)*v*rad/Math.max(.05,f.w),tt=clamp(t+Math.sin(u*2*Math.PI)*v*rad/.51,0,1),ff=finSurface.userData.loft.frame(tt),n=ff.N.clone().multiplyScalar(Math.cos(a)/Math.max(.01,ff.w)).addScaledVector(ff.B,Math.sin(a)/Math.max(.01,ff.d)).normalize();return at(a,tt).addScaledVector(n,.001);},28,8),light);spot.material=light.clone();spot.material.name='squid-light';
      }
      for(let j=0;j<2;j++){
        const a=group(sqBody,'squid-arm-'+s+'-'+j,s*(.068+j*.102),-.232,.10);
        loft(a,'short-tentacle',[[0,0,0],[s*.008,-.12,.055],[s*(j?.065:.040),j?-.20:-.255,j?.10:.028]],[.054,.060,.003],[.049,.048,.003],sqOrange,{steps:30,sides:24});
      }
    }
    // Squid mask bridge sits on the face, not above it.
    mesh(sqBody,'squid-mask-bridge',grid((u,v)=>{const x=(u-.5)*.10,y=-.074+v*.068;return V(x,y,sqFaceZ(x,y)+.013);},16,12,true),sqMask);
    const mantleSpots=[[-.03,.552,.020,.013],[.11,.490,.018,.029],[-.145,.438,.022,.032],[.055,.361,.039,.023],[.245,.338,.019,.025],[-.299,.270,.037,.026],[.372,.222,.026,.039],[-.406,.177,.030,.017],[.118,.282,.013,.020],[-.090,.213,.018,.013],[.27,.155,.036,.025],[-.020,.457,.014,.021]];
    for(let j=0;j<mantleSpots.length;j++){
      const [x,y,rx,ry]=mantleSpots[j];const q=diskPatch(sqBody,'mantle-spot-'+j,light,[x,y],rx,ry,(xx,yy)=>sqFaceZ(xx,yy)+.0011);q.material=light.clone();q.material.name='squid-light';
    }
    for(const s of [-1,1])mesh(sqBody,'mantle-lip-'+s,grid((u,v)=>{const x=s*(.317+u*.259),y=.107+u*.035+v*.024*Math.sin(u*Math.PI);return V(x,y,sqFaceZ(x,y)+.0018);},40,10,s>0),sqUnder);
    const ringMat=material('ring-team-light',0xffba39,.5,{emissive:0xff6810,emissiveIntensity:.1});
    const ring=mesh(root,'ring',new T.TorusGeometry(.64,.023,8,48),ringMat);ring.rotation.x=Math.PI/2;ring.position.y=.027;ring.castShadow=false;
    const marker=mesh(root,'marker',new T.ConeGeometry(.12,.21,4),ivory);marker.position.y=2.36;marker.rotation.set(Math.PI,Math.PI/4,0);marker.castShadow=false;
    group(root,'gun',.49,.98,.28);
    root.updateMatrixWorld(true);
    return root;
  }
  function create(T,palette,role='bot'){
    if(!template||lib!==T){lib=T;template=build(T);}
    const g=template.clone(true),mats=new Map(),teamMaterials=[];
    g.traverse(o=>{if(!o.isMesh)return;
      const original=o.material;
      const cloneMat=m=>{if(!mats.has(m)){const q=m.clone();mats.set(m,q);if(['team-main','squid-main'].includes(q.name))teamMaterials.push({material:q,color:'main',linearColor:true});if(['team-light','squid-light'].includes(q.name))teamMaterials.push({material:q,color:'light',linearColor:true});if(q.name==='ring-team-light')teamMaterials.push({material:q,color:'light',emissive:'main',linearColor:true});}return mats.get(m);};
      o.material=Array.isArray(original)?original.map(cloneMat):cloneMat(original);
      if(o.isSkinnedMesh){const old=template.getObjectByName(o.name);o.skeleton=new T.Skeleton(old.skeleton.bones.map(b=>g.getObjectByName(b.name)),old.skeleton.boneInverses.map(m=>m.clone()));o.bind(o.skeleton,old.bindMatrix.clone());}
    });
    const get=n=>g.getObjectByName(n),marker=get('marker');marker.material=marker.material.clone();marker.material.color.setHex(role==='self'?0xffffff:palette.light).convertSRGBToLinear();if(role!=='self')teamMaterials.push({material:marker.material,color:'light',linearColor:true});
    for(const e of teamMaterials){e.material.color.setHex(palette[e.color]).convertSRGBToLinear();if(e.emissive)e.material.emissive.setHex(palette[e.emissive]);}
    const rig={head:get('head'),torso:get('torso'),pelvis:get('pelvis'),inkFill:get('inkFill'),arms:[],forearms:[],hands:[],legs:[],shins:[],shoes:[],tentacles:[get('tentacle--1'),get('tentacle-1')],fins:[get('squid-fin--1'),get('squid-fin-1')]};
    for(const s of ['left','right']){rig.arms.push(get(s+'-upperArm'));rig.forearms.push(get(s+'-forearm'));rig.hands.push(get(s+'-hand'));rig.legs.push(get(s+'-thigh'));rig.shins.push(get(s+'-shin'));rig.shoes.push(get(s+'-shoe'));}
    return {group:g,kid:[get('human')],gun:get('gun'),squid:get('squid'),ring:get('ring'),marker,teamMaterials,humanParts:[get('human'),get('gun')],rig,modelVersion:8};
  }
  function update(entity,dt,moveAmount=0,time=0){
    if(!entity.rig||entity.dead)return;const T=lib,r=entity.rig;dt=Math.min(.05,Math.max(0,dt||0));
    r.speed=T.MathUtils.lerp(r.speed||0,Math.min(1,Math.max(0,moveAmount)),1-Math.exp(-dt*12));r.phase=(r.phase||0)+dt*(2+r.speed*10);
    const stride=Math.sin(r.phase)*r.speed,air=entity.vy!==undefined&&Math.abs(entity.vy)>.3;
    for(let i=0;i<2;i++){const s=i===0?-1:1;r.legs[i].rotation.z=s*(entity.gun?.userData.weaponKey?.10:.025);r.legs[i].rotation.x=air?-.26+s*.08:stride*s*.46;r.shins[i].rotation.x=air?.59:Math.max(0,-stride*s)*.58;r.shoes[i].rotation.z=-r.legs[i].rotation.z;r.tentacles[i].rotation.x=Math.sin(r.phase*.7+i*.5)*(.015+r.speed*.07);r.tentacles[i].rotation.z=s*(Math.sin(r.phase*.5)*.013+r.speed*.055);r.fins[i].rotation.z=s*Math.sin(r.phase*1.5)*(.035+r.speed*.10);}
    r.head.rotation.z=Math.sin(time*1.5)*.009*(1-r.speed);r.torso.rotation.x=r.speed*.036;r.torso.scale.y=1+Math.sin(time*2.2)*.005;
    if(Number.isFinite(entity.ink))r.inkFill.scale.y=Math.max(.035,T.MathUtils.clamp(entity.ink,0,1));
    entity.squid.scale.set(1-Math.sin(r.phase*1.6)*r.speed*.04,1,1+Math.sin(r.phase*1.6)*r.speed*.06);
    entity.group.updateMatrixWorld(true);const inv=new T.Matrix4().copy(entity.group.matrixWorld).invert();
    for(let i=0;i<2;i++){const side=i===0?-1:1,arm=r.arms[i],fore=r.forearms[i],gun=(i===0&&entity.gunExtra)?entity.gunExtra:entity.gun;
      if(!gun||!gun.userData.weaponKey){arm.rotation.set(-.015-stride*side*.28,0,side*.23);fore.rotation.set(-.06,0,0);r.hands[i].rotation.set(0,0,0);continue;}
      const key=gun.userData.weaponKey,target=new T.Vector3(i===0&&key!=='dualies'?-.12:0,-.14,i===0&&key!=='dualies'?.24:0);
      if(key==='roller')target.set(i===0?-.10:0,-.10,i===0?.30:0);if(key==='slosher')target.set(i===0?-.17:.10,.02,.01);
      gun.localToWorld(target);target.applyMatrix4(inv);const start=arm.position.clone(),dir=target.clone().sub(start),len=T.MathUtils.clamp(dir.length(),.075,.475);dir.normalize();
      const upper=.26,lower=.220,along=(upper*upper-lower*lower+len*len)/(2*len),height=Math.sqrt(Math.max(0,upper*upper-along*along)),pole=new T.Vector3(side,-.45,-.45);pole.addScaledVector(dir,-pole.dot(dir)).normalize();
      const elbow=start.clone().addScaledVector(dir,along).addScaledVector(pole,height);arm.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),elbow.clone().sub(start).normalize());const localDir=target.clone().sub(elbow).normalize().applyQuaternion(arm.quaternion.clone().invert());fore.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),localDir);r.hands[i].rotation.set(i===0?-1.0:-.20,0,0);
    }
  }
  function createShooter(T,palette){
    const g=new T.Group();g.name='weapon-shooter-sculpt';const teamMaterials=[];
    function mat(name,c,r,extra={}){const m=new T.MeshPhysicalMaterial({color:c,roughness:r,metalness:0,envMapIntensity:.20,...extra});m.color.convertSRGBToLinear();m.name=name;return m;}
    const white=mat('weapon-white',0xf8f3ed,.40,{clearcoat:.6}),black=mat('weapon-rubber',0x252835,.66),orange=mat('weapon-team-main',palette.main,.22,{clearcoat:1}),chrome=mat('weapon-metal',0xb8c0c8,.29,{metalness:.5}),glass=mat('weapon-clear',0xffffff,.08,{clearcoat:1,transparent:true,opacity:.16,depthWrite:false});
    teamMaterials.push({material:orange,color:'main',linearColor:true});
    const add=(name,geo,m,p=[0,0,0],r=[0,0,0])=>{const o=new T.Mesh(geo,m);o.name=name;o.position.set(...p);o.rotation.set(...r);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;};
    const cylinder=(name,r,h,m,y,z,open=false)=>add(name,new T.CylinderGeometry(r,r,h,48,1,open),m,[0,y,z],[Math.PI/2,0,0]);
    const ring=(name,r,t,m,y,z)=>add(name,new T.TorusGeometry(r,t,12,56),m,[0,y,z]);
    function shaped(name,rows,m,p){return add(name,new T.LatheGeometry(rows.map(r=>new T.Vector2(...r)),56),m,p,[Math.PI/2,0,0]);}
    function bevelBox(name,size,m,p,rx=0){const sh=new T.Shape(),w=size[0]/2,h=size[1]/2,r=.018;sh.moveTo(-w+r,-h);sh.lineTo(w-r,-h);sh.quadraticCurveTo(w,-h,w,-h+r);sh.lineTo(w,h-r);sh.quadraticCurveTo(w,h,w-r,h);sh.lineTo(-w+r,h);sh.quadraticCurveTo(-w,h,-w,h-r);sh.lineTo(-w,-h+r);sh.quadraticCurveTo(-w,-h,-w+r,-h);const geo=new T.ExtrudeGeometry(sh,{depth:size[2],bevelEnabled:true,bevelThickness:.006,bevelSize:.006,bevelSegments:3,curveSegments:8,steps:1});geo.translate(0,0,-size[2]/2);return add(name,geo,m,p,[rx,0,0]);}
    const body=bevelBox('lower-white-cradle',[.27,.125,.62],white,[0,-.055,.18]);
    cylinder('orange-ink-chamber',.117,.44,orange,.075,.205);
    cylinder('transparent-chamber-cover',.129,.45,glass,.075,.205,true);
    shaped('rear-white-collar',[[.122,-.039],[.151,-.032],[.155,.008],[.145,.035],[.122,.035]],white,[0,.075,-.055]);
    shaped('front-white-housing',[[.104,-.080],[.141,-.080],[.162,-.05],[.165,.008],[.146,.068],[.112,.075]],white,[0,.075,.484]);
    cylinder('muzzle-dark-bore',.108,.075,black,.075,.55,true);
    cylinder('orange-inner-nozzle',.074,.079,orange,.075,.591,true);
    cylinder('clear-flared-nozzle',.111,.172,glass,.075,.698,true);
    ring('nozzle-glass-edge',.111,.005,glass,.075,.784);
    ring('front-white-seal',.132,.014,white,.075,.562);
    ring('inner-nozzle-seal',.077,.007,orange,.075,.622);
    cylinder('rear-hose-socket',.060,.117,black,.047,-.178);
    ring('rear-socket-collar',.070,.012,white,.047,-.137);
    const grip=bevelBox('trigger-grip',[.12,.235,.123],black,[0,-.198,-.045],-.18);
    for(let j=0;j<4;j++)bevelBox('grip-rib-'+j,[.128,.007,.133],black,[0,-.127-j*.032,-.052],-.18);
    const guard=add('trigger-guard',new T.TorusGeometry(.081,.011,9,40,Math.PI*1.72),white,[0,-.168,.09],[0,Math.PI/2,.35]);guard.scale.set(.90,1.10,1);
    bevelBox('trigger',[.022,.058,.012],black,[0,-.135,.058],-.12);
    bevelBox('front-support-grip',[.22,.094,.16],black,[0,-.126,.307],.03);
    for(const x of [-.13,.13]){const o=bevelBox('chamber-side-rail',[.018,.032,.407],white,[x,.10,.211]);}
    for(const z of [.017,.403])for(const x of [-.143,.143]){const q=add('housing-screw',new T.CylinderGeometry(.013,.013,.006,20),chrome,[x,.018,z],[0,0,Math.PI/2]);}
    g.userData.parts={body,grip};g.userData.teamMaterials=teamMaterials;g.userData.weaponKey='shooter';g.userData.side=1;return g;
  }
  return {create,update,createShooter};

})();
if(typeof module!=='undefined')module.exports=InkCharacter;
