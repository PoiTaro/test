/* Reusable surface detail and prefiltered reflection lighting; no per-frame captures. */
const InkGraphics = (() => {
  const reflections=new Map(),surfaces=new Map();
  function environment(THREE,renderer,dusk){
    const key=dusk?'dusk':'day';
    if(reflections.has(key))return reflections.get(key).texture;
    const studio=new THREE.Scene();
    const geometries=[],materials=[];
    const add=(geometry,color,position)=>{
      const material=new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide});
      const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);studio.add(mesh);
      geometries.push(geometry);materials.push(material);return mesh;
    };
    const dome=add(new THREE.SphereGeometry(100,24,12),dusk?0x526b8f:0xbdd8ef,[0,0,0]);
    dome.material.side=THREE.BackSide;
    const ground=add(new THREE.PlaneGeometry(190,190),dusk?0x252435:0x60534a,[0,-12,0]);ground.rotation.x=-Math.PI/2;
    const keyLight=add(new THREE.PlaneGeometry(24,40),dusk?0xe6edff:0xffefd5,[35,48,25]);keyLight.lookAt(0,0,0);
    keyLight.material.color.multiplyScalar(dusk?2:3);
    const fill=add(new THREE.PlaneGeometry(35,18),dusk?0xffaf65:0xe3f6ff,[-35,12,-30]);fill.lookAt(0,0,0);
    const generator=new THREE.PMREMGenerator(renderer);
    try{const target=generator.fromScene(studio,.08,.1,240);reflections.set(key,target);return target.texture;}
    finally{generator.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
  }
  function surface(THREE,renderer,kind){
    if(surfaces.has(kind))return surfaces.get(kind);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    const ctx=canvas.getContext('2d');
    let seed=731;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const pixels=ctx.createImageData(256,256);
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){
      let v=216+(random()-.5)*22;
      if(kind==='wood')v=190+Math.sin(x*.31+Math.sin(y*.027)*1.8)*16+Math.sin(x*1.7+y*.014)*8+(random()-.5)*12;
      if(kind==='roof')v=182+Math.cos(x*Math.PI/16)*30+(random()-.5)*6;
      if(kind==='stone')v=203+Math.sin(x*.07)*Math.sin(y*.08)*12+(random()-.5)*25;
      const i=(y*256+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;
    }
    ctx.putImageData(pixels,0,0);
    if(kind==='stone'||kind==='roof'){
      ctx.strokeStyle=kind==='roof'?'#676767':'#828282';ctx.lineWidth=2;
      for(let y=0;y<256;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();
        if(kind==='stone')for(let x=(y/64%2)*64;x<256;x+=128){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+64);ctx.stroke();}}
    }
    const map=new THREE.CanvasTexture(canvas);map.wrapS=map.wrapT=THREE.RepeatWrapping;
    map.repeat.set(kind==='plaster'?3:2,kind==='wood'?1:2);
    map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    // Color and height maps need separate color-space treatment in Three r128.
    const bump=map.clone();bump.needsUpdate=true;map.encoding=THREE.sRGBEncoding;
    const result={map,bump};surfaces.set(kind,result);return result;
  }
  return {environment,surface};
})();
