/* Presentation only: gameplay input and state remain owned by index.html. */
'use strict';
const InkHud = (() => {
  const paths = {
    fire:'<path d="M30 7c6-2 4 12 10 13s11-13 15-7-10 10-7 15 15-1 14 6-14 1-17 6 7 15 1 17-7-12-13-12-6 15-12 12 5-12 1-17S5 43 4 36s14-3 17-9S12 14 18 12s7 12 12 10-5-13 0-15Z"/>',
    squid:'<path d="M32 6C27 8 11 22 9 36l11-3-3 13 10-5 5 12 5-12 10 5-3-13 11 3C53 22 37 8 32 6Z"/><ellipse cx="27" cy="30" rx="5" ry="7" fill="#152133"/><ellipse cx="38" cy="30" rx="5" ry="7" fill="#152133"/>',
    swim:'<path d="M27 16h-15m9 9H4m18 25H8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M43 9C29 13 21 25 23 38l9-4-5 12 10-4 1 11 8-9 8 6-1-14 9 1C58 25 49 13 43 9Z"/><ellipse cx="40" cy="31" rx="4" ry="6" fill="#152133"/><ellipse cx="49" cy="29" rx="4" ry="6" fill="#152133"/>',
    bomb:'<circle cx="29" cy="40" r="19"/><path d="m31 20 6-11 11 6-6 10Z"/><path d="m41 13 5-7 10 3" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
    jump:'<path d="m32 5 18 23H38v24H26V28H14Z"/><path d="M20 47C0 56 24 62 42 57c12-3 13-7 4-11" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
    drop:'<path d="M32 5C29 20 15 29 15 41a17 17 0 0 0 34 0C49 29 35 16 32 5Z"/><path d="M22 42q0 9 8 10" fill="none" stroke="#fff" stroke-width="3" opacity=".55" stroke-linecap="round"/>',
    skull:'<path d="M12 30a20 20 0 1 1 40 0c0 8-4 12-10 15v10H22V45c-6-3-10-7-10-15Z"/><circle cx="24" cy="30" r="6" fill="#152133"/><circle cx="40" cy="30" r="6" fill="#152133"/><path d="m32 37-4 6h8Z" fill="#152133"/><path d="M28 49v7m8-7v7" stroke="#152133" stroke-width="3"/>',
    pin:'<path d="M32 4a21 21 0 0 0-21 21c0 15 21 35 21 35s21-20 21-35A21 21 0 0 0 32 4Zm0 12a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z" fill-rule="evenodd"/>',
    gear:'<path d="m26 5-2 8-7 4-8-2-5 10 6 6v8l-5 6 7 9 8-3 7 4 3 7 11-2 1-8 6-5 8 1 4-11-6-5-1-8 4-7-8-8-7 4-8-2-3-7Z"/><circle cx="32" cy="33" r="12" fill="#152133"/><circle cx="32" cy="33" r="6"/>',
    anchor:'<circle cx="32" cy="11" r="6" fill="none" stroke="currentColor" stroke-width="4"/><path d="M32 17v36M21 25h22M10 36c0 25 44 25 44 0M6 42l4-8 8 3m28 0 8-3 4 8" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
    curling:'<path d="M9 39h46v15H9Z"/><path d="M21 36V22h25v6H28v8Z"/><path d="M4 28h11M2 35h10" fill="none" stroke="currentColor" stroke-width="3"/>',
    sprinkler:'<path d="M16 46h32l6 9H10Zm11-24h10v24H27Zm-8-8h26v8H19Z"/><path d="M14 14 5 8m45 6 9-6M32 7V2" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>'
  };
  function icon(name) {
    return `<svg class="hudIcon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${paths[name]||paths.squid}</svg>`;
  }
  for (const [id,name,label] of [
    ['btnFire','fire','射撃（長押し）'],['btnSwim','swim','潜る（長押し）'],
    ['btnJump','jump','ジャンプ'],['btnSub','bomb','インクボム'],
    ['btnSettings','gear','操作設定'],['btnMap','pin','マップを開く']
  ]) {
    const el=document.getElementById(id);
    el.innerHTML=icon(name)+(id==='btnMap'?'<span>MAP</span>':'');
    el.setAttribute('aria-label',label);
  }
  document.querySelector('#kills .splatMark').innerHTML=icon('skull');
  document.getElementById('midBadge').innerHTML=icon('anchor');
  document.querySelectorAll('.playerChip i').forEach(el=>{el.innerHTML=icon('squid');});
  document.getElementById('weaponHud').setAttribute('aria-hidden','true');
  const resources=document.getElementById('resourceHud');
  const inkSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  inkSvg.id='inkArc';
  inkSvg.setAttribute('viewBox','0 0 330 95');
  inkSvg.setAttribute('role','meter');
  inkSvg.setAttribute('aria-label','インク残量');
  inkSvg.setAttribute('aria-valuemin','0');
  inkSvg.setAttribute('aria-valuemax','100');
  inkSvg.innerHTML=`<defs>
    <linearGradient id="hudInkGradient"><stop stop-color="#fff269"/><stop offset="1" stop-color="#ff8638"/></linearGradient>
    <clipPath id="hudInkClip"><rect id="hudInkClipRect" x="61" y="0" width="246" height="95"/></clipPath>
  </defs>
  <path class="inkArcFrame" d="M73 49Q184 82 302 37"/>
  <path class="inkArcTrack" d="M73 49Q184 82 302 37"/>
  <path class="inkArcFill" clip-path="url(#hudInkClip)" pathLength="100" stroke-dasharray="10.5 2" d="M73 49Q184 82 302 37"/>
  <circle cx="33" cy="43" r="28" fill="#17212dde"/>
  <svg x="15" y="23" width="36" height="40" viewBox="0 0 64 64" fill="#ffd253">${paths.drop}</svg>`;
  resources.appendChild(inkSvg);
  const charge=document.getElementById('specialCharge');
  charge.setAttribute('role','meter');
  charge.setAttribute('aria-valuemin','0');
  charge.setAttribute('aria-valuemax','100');
  charge.querySelector('span').innerHTML='<i class="specialOrb"></i><b>SP</b>';
  const ring=document.createElementNS('http://www.w3.org/2000/svg','svg');
  ring.classList.add('specialRing');
  ring.setAttribute('viewBox','0 0 100 100');
  ring.setAttribute('aria-hidden','true');
  ring.innerHTML='<circle class="specialRingTrack" cx="50" cy="50" r="43"/><circle id="hudSpecialProgress" cx="50" cy="50" r="43" pathLength="100"/>';
  charge.appendChild(ring);
  const clip=document.getElementById('hudInkClipRect');
  const progress=document.getElementById('hudSpecialProgress');
  let lastInk=-1,lastTeam='',lastSpecial=-1,lastReady=null;
  function updateInk(value,team) {
    const pct=Math.round(Math.max(0,Math.min(1,Number(value)||0))*100);
    if(pct!==lastInk){
      clip.setAttribute('width',String(246*pct/100));
      inkSvg.setAttribute('aria-valuenow',String(pct));
      resources.classList.toggle('low-ink',pct<25);
      lastInk=pct;
    }
    if(team!==lastTeam){
      resources.dataset.team=team;
      lastTeam=team;
    }
  }
  function updateSpecial(value,ready) {
    const pct=Math.round(Math.max(0,Math.min(1,Number(value)||0))*100);
    if(pct!==lastSpecial){
      progress.style.strokeDashoffset=String(100-pct);
      charge.setAttribute('aria-valuenow',String(pct));
      lastSpecial=pct;
    }
    if(ready!==lastReady){
      resources.classList.toggle('special-ready',!!ready);
      lastReady=ready;
    }
  }
  updateInk(1,'A');updateSpecial(0,false);
  return {icon,updateInk,updateSpecial};
})();
