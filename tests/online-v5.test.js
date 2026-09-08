const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const roomMarkup=html.slice(html.indexOf('<div class="overlay" id="roomOnline"'),html.indexOf('<div class="overlay" id="mapPanel"'));
const nodes=new Map();
for(const m of roomMarkup.matchAll(/\bid="([^"]+)"/g)){
 assert(!nodes.has(m[1]),'Duplicate room ID '+m[1]);
 nodes.set(m[1],{style:{display:['roomCreatePanel','roomJoinPanel','roomLobby'].includes(m[1])?'none':'block'},textContent:'',className:'',addEventListener(type,fn){this[type]=fn;}});
}
const teams={A:[],B:[]};
const context=vm.createContext({document:{getElementById:id=>{assert(nodes.has(id),'Missing room control '+id);return nodes.get(id);},querySelector:selector=>{
 const team=selector.includes('TeamA')?'A':'B';return {set innerHTML(value){teams[team]=[];},appendChild(slot){teams[team].push(slot);}};
}},roomPanels:['roomHome','roomCreatePanel','roomJoinPanel','roomLobby'],roomSession:{room:null,playerId:'guest'},isHost:true,net:{ready:true},settingLabel:(value,map)=>map[value]||value,makeLobbySlot:(player,bot)=>({player,bot}),refreshPublicRooms:()=>events.push('refresh'),leaveRoom:()=>events.push('leave')});
const events=[];
vm.runInContext(html.slice(html.indexOf('function setRoomPanel('),html.indexOf('function openRoomOnline(')),context);
vm.runInContext(html.slice(html.indexOf("document.getElementById('roomTopBack').addEventListener"),html.indexOf("document.getElementById('roomCreateOpen').addEventListener")),context);
for(const screen of ['roomCreatePanel','roomJoinPanel']){
 vm.runInContext(`setRoomPanel('${screen}')`,context);nodes.get('roomTopBack').click();
 assert.equal(nodes.get('roomHome').style.display,'block');assert(!events.includes('leave'));
}
vm.runInContext("setRoomPanel('roomLobby')",context);nodes.get('roomTopBack').click();assert.equal(events.at(-1),'leave');
vm.runInContext(html.slice(html.indexOf('function renderWaitingLobby('),html.indexOf('function attachLobbyChannel(')),context);
const host={name:'Host',team:'A',host:true,ready:true,connected:true};
const guest={name:'Guest',team:'B',ready:true,connected:true};
const room={settings:{teamSize:4,botFill:true},players:{host,guest}};context.roomSession.room=room;
vm.runInContext('renderWaitingLobby()',context);
assert.equal(teams.A.length,4);assert.equal(teams.B.length,4);assert.equal(teams.A.filter(p=>p.bot).length,3);assert.equal(nodes.get('lobbyStart').disabled,false);
// The visual refresh must not weaken the readiness / balance / connection gates.
for(const change of [()=>guest.ready=false,()=>guest.connected=false,()=>guest.team='A',()=>context.net.ready=false,()=>room.settings.botFill=false]){
 guest.ready=true;guest.connected=true;guest.team='B';context.net.ready=true;room.settings.botFill=true;change();
 vm.runInContext('renderWaitingLobby()',context);assert.equal(nodes.get('lobbyStart').disabled,true);
}
room.settings.botFill=true;guest.ready=true;guest.connected=true;guest.team='B';context.net.ready=true;context.isHost=false;
vm.runInContext('renderWaitingLobby()',context);assert.equal(nodes.get('lobbyStart').disabled,true);assert.equal(nodes.get('lobbyReady').textContent,'準備を取り消す');
guest.ready=false;vm.runInContext('renderWaitingLobby()',context);assert.equal(nodes.get('lobbyReady').textContent,'準備OK');
assert(!roomMarkup.includes('Lv.12'));assert(!roomMarkup.includes('GAS MATCHING'));assert(!roomMarkup.includes('WebRTC'));
console.log('Online v5 passed: back navigation, roster fill, host/guest readiness, connection and team balance gates.');
