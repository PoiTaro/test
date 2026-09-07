const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('assets/result-v3.css','utf8');
const nodes=new Map();
for(const match of html.matchAll(/\bid="([^"]+)"/g))nodes.set(match[1],{textContent:'',dataset:{},style:{setProperty(k,v){this[k]=v;}}});
const scores={};
const context=vm.createContext({document:{getElementById:id=>{assert(nodes.has(id),id);return nodes.get(id);},querySelector:selector=>scores[selector]||(scores[selector]={}),querySelectorAll:()=>[]},window:{}});
vm.runInContext(fs.readFileSync('assets/result-v3.js','utf8'),context);
for(const [team,a,b,outcome,winner,title,points] of [
  ['A',43.6,28.7,'win','A','勝利！','4360p'],
  ['B',43.6,28.7,'lose','A','敗北','2870p'],
  ['B',28.7,43.6,'win','B','勝利！','4360p'],
  ['A',28.7,43.6,'lose','B','敗北','2870p'],
  ['A',40,40,'draw','draw','引き分け','4000p'],
  ['B',0,0,'draw','draw','引き分け','0p']
]) {
  const data={team,a,b,name:'<テスト>',kills:14,specials:1,distance:988.4,weapon:'インクシューター',weaponImage:'weapon.png'};
  vm.runInContext(`InkResult.render(${JSON.stringify(data)})`,context);
  assert.equal(nodes.get('result').dataset.outcome,outcome);
  assert.equal(nodes.get('result').dataset.winner,winner);
  assert.equal(nodes.get('resultTitle').textContent,title);
  assert.equal(nodes.get('resultPaintPoints').textContent,points);
  assert.equal(nodes.get('resultPlayerName').textContent,'<テスト>');
  assert.equal(nodes.get('resultDistance').textContent,'988m');
  assert.equal(nodes.get('resultSpecials').textContent,'1回');
  assert.equal(nodes.get('resultWeaponImage').src,'weapon.png');
  assert.equal(nodes.get('resultRanking').hidden,true);
}
const markup=html.match(/<div class="overlay" id="result"[\s\S]*?<\/details>\s*<\/div>\s*<\/div>/)[0];
assert(!/resultClock|resultBattleBar|resultExitBtn|ベストライバル|チームトップ/.test(markup));
for(const id of ['resultPaintPoints','resultKills','resultSpecials','retryBtn','resultLobbyBtn'])assert.equal((markup.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
assert.match(html,/InkResult\.render\(\{a,b,team:player\.team/);
assert.match(html,/disabled = \(mode === 'online' && !isHost\)/);
assert.match(css,/prefers-reduced-motion/);
console.log('Result v3 passed: both teams, win/lose/draw, live stats, weapon, safe names, no duplicate HUD, online retry preserved.');
