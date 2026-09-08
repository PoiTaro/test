/* Home presentation shares the game's models and stage renderer. */
const InkHome=(()=>{
  const paths={
    globe:'<circle cx="32" cy="32" r="25"/><ellipse cx="32" cy="32" rx="11" ry="25"/><path d="M8 23h48M8 41h48M7 32h50"/>',
    friends:'<circle cx="22" cy="21" r="10"/><circle cx="46" cy="18" r="8"/><path d="M5 55V43a17 17 0 0 1 34 0v12Zm37 0V42c0-7-2-12-6-16 11-5 23 2 23 14v15Z"/>',
    bot:'<rect x="10" y="20" width="44" height="34" rx="10"/><path d="M32 20V8M4 30v13m56-13v13"/><circle cx="24" cy="35" r="3"/><circle cx="40" cy="35" r="3"/><path d="M25 46h14"/>',
    weapon:'<path d="M5 17h43v6h11v12H45l-4 10H28l4-10H16V29H5Z"/><path d="M12 11h23v6M21 23h16"/>'
  };
  function icons(){
    document.querySelectorAll('[data-home-icon]').forEach(el=>{
      const name=el.dataset.homeIcon;
      el.innerHTML=name==='gear'?InkHud.icon('gear'):`<svg viewBox="0 0 64 64" aria-hidden="true" fill="${name==='friends'?'currentColor':'none'}" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
    });
  }
  function create({THREE,renderer,scene,createKid,simplifyKidForMobile,applyWeaponVisual,loadStage,getStage,getWeapon,weaponImage}){
    icons();
    const title=document.getElementById('title'),view=document.getElementById('homeAvatarView');
    const stageCanvas=document.getElementById('homeStageCanvas');
    const stageContext=stageCanvas.getContext('2d');
    const stageCamera=new THREE.PerspectiveCamera(55,1,.1,800);
    stageCamera.position.set(48,34,56);stageCamera.lookAt(0,3,0);
    let avatarRenderer=null,avatarScene=null,avatarCamera=null,avatar=null;
    let lastStage=null,lastWeapon=null,lastFrame=-1,thumbnailDirty=true,avatarFailed=false,width=0,height=0;
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
    const visible=()=>title.style.display!=='none'&&!document.hidden;
    function initAvatar(){
      if(avatarRenderer||avatarFailed)return;
      try{
        avatarRenderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
        avatarRenderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
        avatarRenderer.outputEncoding=THREE.sRGBEncoding;
        avatarRenderer.toneMapping=THREE.ACESFilmicToneMapping;
        avatarRenderer.setClearColor(0x000000,0);
        avatarScene=new THREE.Scene();
        avatarCamera=new THREE.PerspectiveCamera(36,1,.1,30);
        avatarCamera.position.set(2.5,2.05,5.5);avatarCamera.lookAt(0,1.05,0);
        avatarScene.add(new THREE.HemisphereLight(0xe0edff,0x283049,1.7));
        const light=new THREE.DirectionalLight(0xffead2,2);light.position.set(3,5,4);avatarScene.add(light);
        avatar={...createKid('A','self'),team:'A'};
        simplifyKidForMobile(avatar,'A');avatar.marker.visible=false;
        avatarScene.add(avatar.group);view.appendChild(avatarRenderer.domElement);
        avatarRenderer.domElement.setAttribute('aria-hidden','true');
        avatarRenderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();avatarFailed=true;fallback();});
        avatarRenderer.domElement.addEventListener('webglcontextrestored',()=>{avatarFailed=false;document.getElementById('homeAvatarFallback').hidden=true;avatarRenderer.domElement.hidden=false;});
      }catch(error){
        avatarFailed=true;
        if(avatarRenderer){avatarRenderer.dispose();avatarRenderer=null;}
        fallback();
      }
    }
    function fallback(){
      const img=document.getElementById('homeAvatarFallback');img.src=weaponImage();img.hidden=false;
      if(avatarRenderer)avatarRenderer.domElement.hidden=true;
    }
    function render(dt,time){
      // Only the title uses this view; do not add a second background animation loop.
      if(!visible()||time-lastFrame<1/30)return;
      lastFrame=time;
      if(getStage()!==lastStage){loadStage(getStage());lastStage=getStage();thumbnailDirty=true;}
      stageCamera.aspect=renderer.domElement.clientWidth/Math.max(1,renderer.domElement.clientHeight);
      stageCamera.updateProjectionMatrix();renderer.render(scene,stageCamera);
      if(thumbnailDirty&&stageContext){
        stageContext.drawImage(renderer.domElement,0,0,stageCanvas.width,stageCanvas.height);
        stageCanvas.parentElement.classList.add('hasLivePreview');thumbnailDirty=false;
      }
      initAvatar();
      if(avatarFailed){if(lastWeapon!==getWeapon()){lastWeapon=getWeapon();fallback();}return;}
      if(lastWeapon!==getWeapon()){applyWeaponVisual(avatar,getWeapon());lastWeapon=getWeapon();}
      const w=Math.round(view.clientWidth),h=Math.round(view.clientHeight);
      if(!w||!h)return;
      if(w!==width||h!==height){
        width=w;height=h;avatarRenderer.setSize(w,h);avatarCamera.aspect=w/h;
        avatarCamera.position.set(2.5,2.05,5.5).multiplyScalar(Math.max(1,.65/avatarCamera.aspect));
        avatarCamera.lookAt(0,1.05,0);avatarCamera.updateProjectionMatrix();
      }
      avatar.group.rotation.y=reducedMotion.matches?-.2:-.2+Math.sin(time*.6)*.1;
      avatar.group.position.y=reducedMotion.matches?0:Math.sin(time*1.8)*.025;
      avatarRenderer.render(avatarScene,avatarCamera);
    }
    return {visible,render};
  }
  return {create};
})();
