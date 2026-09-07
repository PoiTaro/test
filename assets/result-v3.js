/* Result presentation only; match scoring and online replay remain in the game. */
const InkResult = (() => {
  const teams={A:{name:'オレンジチーム',color:'#ff922b'},B:{name:'パープルチーム',color:'#a13dff'}};
  function state({a,b,team}) {
    const mine=team==='A'?a:b, foe=team==='A'?b:a;
    const outcome=mine>foe?'win':mine<foe?'lose':'draw';
    return {outcome,winner:a>b?'A':b>a?'B':'draw',
      title:{win:'勝利！',lose:'敗北',draw:'引き分け'}[outcome],
      teamName:teams[team].name,color:teams[team].color,
      a:a.toFixed(1)+'%',b:b.toFixed(1)+'%',points:Math.round(mine*100)+'p'};
  }
  function render(data) {
    const s=state(data), root=document.getElementById('result');
    const set=(id,text)=>{document.getElementById(id).textContent=text;};
    root.dataset.outcome=s.outcome;root.dataset.winner=s.winner;root.dataset.team=data.team;
    root.style.setProperty('--result-accent',s.color);
    root.style.setProperty('--result-hero',s.outcome==='draw'?'#abb8cf':s.color);
    document.querySelector('#resultScore span.a').textContent=s.a;
    document.querySelector('#resultScore span.b').textContent=s.b;
    set('resultTitle',s.title);
    set('resultRibbon',s.outcome==='draw'?'互角のバトル':s.teamName);
    set('resultMsg',s.outcome==='draw'?'両チーム同点です。':s.outcome==='win'?'あなたのチームの勝利！':'相手チームの勝利。次のバトルでリベンジ！');
    set('resultPlayerName',data.name);set('resultMeTag',s.teamName);
    set('resultPaintPoints',s.points);set('resultKills',data.kills);
    set('resultSpecials',data.specials+'回');set('resultDistance',Math.round(data.distance)+'m');
    set('resultWeapon',data.weapon);
    document.getElementById('resultWeaponImage').src=data.weaponImage;
    document.querySelectorAll('[data-result-icon]').forEach(el=>{el.innerHTML=InkHud.icon(el.dataset.resultIcon);});
    const ranking=document.getElementById('resultRanking');
    ranking.open=false;ranking.hidden=!window.storage;
    root.scrollTop=0;
  }
  return {state,render};
})();
