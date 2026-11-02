'use strict';
(()=>{
const $=id=>document.getElementById(id);
const heroInfo={
 natsu:{name:'나츠',role:'🔥 화염 근거리',desc:'돌진·화염 브레스·광역 폭발',color:'#ff7759',hp:125,mana:100,skill:['주먹 공격','화염 돌진','화룡의 포효','화염 폭발','용왕의 일격']},
 lucy:{name:'루시',role:'✨ 성령 마법사',desc:'마법탄·회복·원거리 제압',color:'#f5d07d',hp:103,mana:115,skill:['별빛 탄환','아쿠에리아스','버고의 가호','레오의 빛','성령의 축제']},
 erza:{name:'엘자',role:'⚔ 검술·방어형',desc:'검술 돌진·보호막·연속 참격',color:'#f183a4',hp:140,mana:100,skill:['기본 검격','천륜 돌진','금강의 갑옷','검의 폭풍','천륜의 검무']},
 gray:{name:'그레이',role:'❄ 빙결 제어형',desc:'얼음 창·둔화·광역 빙결',color:'#97e5ff',hp:113,mana:110,skill:['얼음 탄환','아이스 랜스','빙결진','빙화','절대영도']}
};
const modeInfo={duel:'1 VS 1 결투',chaos:'1 VS 1 VS 1 개인전',teams:'2 VS 2 팀전'};
const modes={duel:2,chaos:3,teams:4};
let ws=null,myId=null,room=null,snap=null,hero='natsu',mode='duel',view='home',animTime=0,mouseAim=null,connected=false,toastTimeout,aliveSince=0;
let input={up:false,down:false,left:false,right:false};
const canvas=$('arena'),ctx=canvas.getContext('2d');
const colors={team1:'#ff907c',team2:'#83b8ff',team3:'#e7adf9'};
function renderCards(){ $('heroCards').innerHTML=Object.entries(heroInfo).map(([id,h])=>`<button class="hero-card ${id===hero?'selected':''}" data-hero="${id}" style="--hero:${h.color}"><span class="sel">${id===hero?'✦ SELECTED':''}</span><img class="charart" alt="${h.name} 캐릭터 일러스트" src="/assets/heroes/${id}.svg"><h4>${h.name}</h4><span class="role">${h.role}</span><p>${h.desc}</p></button>`).join('');
 document.querySelectorAll('[data-hero]').forEach(b=>b.addEventListener('click',()=>{hero=b.dataset.hero;renderCards();$('chosen').textContent=heroInfo[hero].role+' · '+heroInfo[hero].name;if(room?.status==='lobby')send({type:'hero',hero});}));}
function show(name){view=name;for(const v of ['home','lobby','battle'])$(v).classList.toggle('hidden',v!==name);if(name!=='battle')stopMusic();}
function toast(msg){$('toast').textContent=msg;$('toast').classList.remove('hidden');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').classList.add('hidden'),3700);}
function connect(){
 const proto=location.protocol==='https:'?'wss:':'ws:';
 ws=new WebSocket(proto+'//'+location.host+'/ws');
 ws.addEventListener('open',()=>{connected=true;$('net').innerHTML='<i class="dot"></i> 온라인 연결됨';
  const search=new URLSearchParams(location.search),from=search.get('room');if(from&&/^[0-9a-fA-F]{6}$/.test(from)){$('joincode').value=from.toUpperCase();toast('초대 코드가 입력되었습니다. 닉네임을 정하고 참가하세요.');}
 });
 ws.addEventListener('close',()=>{connected=false;room=null;snap=null;myId=null;$('net').innerHTML='<span class="connection">● 연결 끊김</span>';toast('서버와의 연결이 끊겼습니다. 페이지를 새로고침 해주세요.');stopMusic();});
 ws.addEventListener('error',()=>toast('서버 접속에 문제가 발생했습니다.'));
 ws.addEventListener('message',ev=>{let data;try{data=JSON.parse(ev.data)}catch{return};handle(data);});
}
function send(payload){if(ws&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(payload));else toast('서버에 연결 중입니다.');}
function readName(){const name=$('name').value.trim().slice(0,16)||'마도사';try{localStorage.setItem('magic_arena_name',name)}catch{}return name;}
function handle(m){
 if(m.type==='error'){toast(m.message);return;}
 if(m.type==='joined'){myId=m.id;room=m.room;snap=null;show('lobby');renderLobby();history.replaceState(null,'',location.pathname+'?room='+room.code);return;}
 if(m.type==='left'){myId=null;room=null;snap=null;show('home');history.replaceState(null,'',location.pathname);return;}
 if(m.type==='lobby'){room=m.room;if(room.status==='lobby'){show('lobby');renderLobby();}return;}
 if(m.type==='start'){room=m.room;snap=null;$('resultoverlay').classList.add('hidden');show('battle');
 $('roomName').textContent='#'+room.code;$('battleMode').textContent=modeInfo[room.mode];renderSkills();addChat('SYSTEM','대전 시작! 상대를 쓰러뜨리세요.');startMusic();return;}
 if(m.type==='snapshot'){snap=m;if(room)room.status=m.status;refreshHUD();return;}
 if(m.type==='chat'){addChat(m.name,m.text);return;}
 if(m.type==='notice'){addChat('SYSTEM',m.message);return;}
 if(m.type==='cast'){playCast(m);return;}
 if(m.type==='ended'){room=m.room;$('resultoverlay').classList.remove('hidden');
  const mine=snap?.players.find(p=>p.id===myId);const won=room.mode==='teams'?m.outcome.winner===mine?.team:m.outcome.winner===myId;
  $('resulttitle').textContent=m.outcome.winner===null?'무승부':won?'승리! ✦':'패배';$('resultdetails').textContent=m.outcome.message;
  const leader=room.leader===myId;$('again').textContent=leader?'재대결 준비':'방장이 재대결을 준비하는 중';$('again').disabled=!leader;stopMusic();sfx('win');return;
 }
}
function renderLobby(){if(!room)return;
 $('roomcode').textContent=room.code;$('lobbymode').textContent=modeInfo[room.mode]+' · '+room.players.length+' / '+room.max+'명';
 $('roomplayers').innerHTML=Array.from({length:room.max},(_,i)=>{
 const p=room.players[i];if(!p)return `<div class="playercard empty"><div style="font-size:35px">✧</div><strong>대기 중...</strong><span style="font-size:11px">친구의 참가를 기다립니다</span></div>`;
 const self=p.id===myId;let opt=self?`<select aria-label="캐릭터 선택" class="pickHero" style="background:#1d3656;color:white;border:1px solid #53718d;border-radius:7px;font-size:11px;padding:3px">${Object.entries(heroInfo).map(([id,h])=>`<option value="${id}" ${p.hero===id?'selected':''}>${h.name}</option>`).join('')}</select>`:`<span class="heroName">${heroInfo[p.hero]?.name||p.hero}</span>`;
 return `<div class="playercard"><img src="/assets/heroes/${p.hero}.svg" alt="${heroInfo[p.hero]?.name||''}"><strong style="font-size:13px">${escapeHTML(p.name)} ${self?'(나)':''}</strong>${opt}<span class="teamtag ${p.team===2?'t2':''}">${room.mode==='teams'?(p.team===1?'RED TEAM':'BLUE TEAM'):'PLAYER '+(i+1)}</span>${i===0?'<span style="font-size:10px;color:#ffda9f">👑 방장</span>':''}</div>`;
 }).join('');
 document.querySelectorAll('.pickHero').forEach(el=>el.addEventListener('change',e=>{hero=e.target.value;send({type:'hero',hero});}));
 const leader=room.leader===myId,ready=room.players.length===room.max,teamOK=room.mode!=='teams'||room.players.filter(p=>p.team===1).length===2;
 $('switchTeam').classList.toggle('hidden',room.mode!=='teams');$('start').classList.toggle('hidden',!leader);$('start').disabled=!ready||!teamOK;
 $('leaderNote').textContent=leader?'👑 당신은 방장입니다. 정원이 모두 차면 대전을 시작하세요.':'방장이 전투를 시작할 때까지 기다려주세요.';
 $('lobbynote').textContent=room.mode==='teams'?'2명씩 RED / BLUE 팀으로 구성하세요. 팀 변경 버튼으로 조정할 수 있습니다.':'정확히 '+room.max+'명이 모이면 전투를 시작할 수 있습니다.';
}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderSkills(){const p=room?.players.find(x=>x.id===myId);const c=heroInfo[p?.hero||hero];$('skills').innerHTML=c.skill.map((name,i)=>`<button class="skill" data-slot="${i}"><b>${['J','Q','E','R','F'][i]}</b><span>${name}</span><em class="hidden"></em></button>`).join('');document.querySelectorAll('.skill').forEach(el=>el.addEventListener('click',()=>send({type:'action',slot:+el.dataset.slot})));}
function refreshHUD(){if(!snap||view!=='battle')return;const p=snap.players.find(x=>x.id===myId);if(!p)return;
 const c=heroInfo[p.hero];$('myPortrait').src='/assets/heroes/'+p.hero+'.svg';$('myName').textContent=c.name+' · '+p.name;$('myState').textContent=room?.mode==='teams'?(p.team===1?'RED TEAM':'BLUE TEAM'):'개인전';
 const perc=(v,max)=>Math.max(0,Math.min(100,Math.round(v/max*100)))+'%';
 $('hpfill').style.width=perc(p.hp,c.hp);$('mpfill').style.width=perc(p.mana,c.mana);$('ultfill').style.width=p.ult+'%';
 $('hptext').textContent=p.hp+' / '+c.hp;$('mptext').textContent=p.mana+' / '+c.mana;$('ulttext').textContent=p.ult+'%';$('time').textContent=String(Math.floor(snap.time/60)).padStart(2,'0')+':'+String(snap.time%60).padStart(2,'0');
 document.querySelectorAll('.skill').forEach(el=>{const index=Number(el.dataset.slot),em=el.querySelector('em'),sec=p.cooldowns[index];
  const unavailable=index===4?p.ult<100:index===0?false:p.mana<(room?({natsu:[0,18,18,26],lucy:[0,20,25,26],erza:[0,18,22,24],gray:[0,16,24,25]}[p.hero]?.[index]):0);
  if(sec>0){em.textContent=sec.toFixed(1);em.classList.remove('hidden');}else if(unavailable){em.textContent=index===4?'충전중':'MP';em.classList.remove('hidden');}else em.classList.add('hidden');
  el.classList.toggle('ult-ready',index===4&&p.ult>=100);
 });
}
function addChat(name,msg){const log=$('chatlog'),p=document.createElement('p'),b=document.createElement('b');b.textContent=name+': ';p.appendChild(b);p.appendChild(document.createTextNode(msg));log.appendChild(p);while(log.children.length>65)log.firstChild.remove();log.scrollTop=log.scrollHeight;}
function chat(){const m=$('chatinput').value.trim();if(m){send({type:'chat',text:m});$('chatinput').value='';}}
function quit(){send({type:'leave'});stopMusic();}
function invite(){if(!room)return;const url=new URL(location.href);url.searchParams.set('room',room.code);if(navigator.clipboard?.writeText){navigator.clipboard.writeText(url.href).then(()=>toast('초대 링크를 복사했어요!')).catch(()=>toast('초대 코드: '+room.code));}else toast('초대 코드: '+room.code);}
// Visuals -- all original procedural canvas illustration, no anime footage or external sprites.
let sparks=[];
const grass=[];let rng=30416;const rand=()=>{rng=(rng*1664525+1013904223)>>>0;return rng/4294967296;};
for(let i=0;i<140;i++)grass.push({x:rand()*1280,y:rand()*720,sz:2+rand()*7,alpha:.1+rand()*.27});
function circle(x,y,r,color,alpha=1){ctx.globalAlpha=alpha;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.globalAlpha=1;}
function line(x,y,x2,y2,color,w=2){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();}
function drawArena(t){
 const bg=ctx.createLinearGradient(0,0,1280,720);bg.addColorStop(0,'#1b3046');bg.addColorStop(.52,'#1d344a');bg.addColorStop(1,'#122239');ctx.fillStyle=bg;ctx.fillRect(0,0,1280,720);
 ctx.strokeStyle='#ffffff08';ctx.lineWidth=1;for(let x=0;x<1280;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,720);ctx.stroke();}for(let y=0;y<720;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1280,y);ctx.stroke();}
 const rad=ctx.createRadialGradient(640,360,30,640,360,480);rad.addColorStop(0,'#3c50602f');rad.addColorStop(1,'#00000000');ctx.fillStyle=rad;ctx.fillRect(0,0,1280,720);
 ctx.save();ctx.translate(640,360);ctx.strokeStyle='#a8d4df25';ctx.lineWidth=4;for(const r of [118,185,250,320]){ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();}
 ctx.rotate(t*.035);for(let i=0;i<12;i++){let a=Math.PI*2*i/12;line(Math.cos(a)*118,Math.sin(a)*118,Math.cos(a)*318,Math.sin(a)*318,'#7cb0b122',2);circle(Math.cos(a)*281,Math.sin(a)*281,4,'#e3bd7f',.35);}ctx.restore();
 ctx.strokeStyle='#ba95be3d';ctx.lineWidth=12;ctx.strokeRect(20,20,1240,680);ctx.strokeStyle='#ffe0a04a';ctx.lineWidth=2;ctx.strokeRect(30,30,1220,660);
 for(const [x,y] of [[55,55],[1225,55],[55,665],[1225,665]]){circle(x,y,25,'#09192f');circle(x,y,15,'#b46c5c',.7);circle(x,y,7,'#ffc270',.9);circle(x,y,25+Math.sin(t*4)*3,'#ffb664',.04);}
 for(const g of grass){circle(g.x,g.y,g.sz,'#a7d1db',g.alpha*.27);}
 for(let i=0;i<4;i++){let x=150+i*330;circle(x,30,4,'#ffdba2',.38+Math.sin(t+i)*.22);circle(x,690,4,'#ffdba2',.38+Math.sin(t+i)*.22);}
}
function drawHero(p,t){const c=heroInfo[p.hero],mine=p.id===myId,shade=colors[p.team]||c.color;
 ctx.save();ctx.translate(p.x,p.y);if(!p.alive){ctx.globalAlpha=.35;ctx.rotate(Math.PI/2);}else{
  circle(0,8,37,shade,mine?.13:.07);circle(0,0,31,shade,.12);
  ctx.strokeStyle=mine?'#fadd8b':shade;ctx.lineWidth=mine?3:2;ctx.beginPath();ctx.ellipse(0,26,28,11,0,0,Math.PI*2);ctx.stroke();
 }
 // shadow and directional attack marker
 ctx.fillStyle='#030a1577';ctx.beginPath();ctx.ellipse(0,24,21,9,0,0,7);ctx.fill();
 ctx.rotate(p.face);
 // cloak/back body
 ctx.fillStyle=p.hero==='lucy'?'#f4d5a0':p.hero==='erza'?'#c9d2e0':p.hero==='gray'?'#263b61':'#242433';
 ctx.beginPath();ctx.moveTo(-13,-13);ctx.lineTo(-22,22);ctx.lineTo(22,22);ctx.lineTo(13,-13);ctx.fill();
 ctx.fillStyle=p.hero==='erza'?'#e4ebf1':p.hero==='lucy'?'#2c4c8b':p.hero==='natsu'?'#d6d4d0':'#4b638e';ctx.fillRect(1,-15,10,32);
 ctx.fillStyle='#efbf9d';ctx.beginPath();ctx.arc(0,-16,16,0,7);ctx.fill();
 // colored hair, stylized sprites not sourced anime art
 ctx.fillStyle=p.hero==='natsu'?'#f3a1a2':p.hero==='lucy'?'#f9d67d':p.hero==='erza'?'#cc4964':'#222b42';
 ctx.beginPath();ctx.moveTo(-17,-15);ctx.lineTo(-20,-34);ctx.lineTo(-9,-29);ctx.lineTo(-4,-39);ctx.lineTo(3,-32);ctx.lineTo(12,-39);ctx.lineTo(16,-26);ctx.lineTo(20,-20);ctx.lineTo(12,-10);ctx.lineTo(-14,-9);ctx.fill();
 if(p.hero==='lucy'||p.hero==='erza'){ctx.fillRect(-19,-12,6,21);ctx.fillRect(13,-12,6,21);}
 // eyes
 ctx.fillStyle='#28263a';ctx.fillRect(5,-21,3,3);ctx.fillRect(5,-12,3,3);
 // staff/sword/fist
 ctx.strokeStyle=p.hero==='gray'?'#9edfff':p.hero==='erza'?'#e8f7ff':p.hero==='lucy'?'#fbe2a6':'#ffa46f';ctx.lineWidth=p.hero==='erza'?5:4;
 ctx.beginPath();ctx.moveTo(12,4);ctx.lineTo(p.hero==='erza'?48:31,-4);ctx.stroke();
 if(p.hero==='lucy')circle(31,-4,7,'#ffe4a0');if(p.hero==='natsu')circle(31,-4,7,'#ff914c',.8);if(p.hero==='gray')circle(31,-4,6,'#93dfff');
 ctx.restore();
 if(!p.alive){ctx.fillStyle='#ffffffc1';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText('KO',p.x,p.y-54);return;}
 const hpFrac=Math.max(0,p.hp/c.hp);
 ctx.fillStyle='#060e1ece';ctx.fillRect(p.x-42,p.y-60,84,9);ctx.fillStyle=shade;ctx.fillRect(p.x-41,p.y-59,82*hpFrac,7);ctx.strokeStyle='#ffffff5d';ctx.lineWidth=1;ctx.strokeRect(p.x-42,p.y-60,84,9);
 ctx.fillStyle=mine?'#ffecad':'#e4effc';ctx.textAlign='center';ctx.font='bold 14px sans-serif';ctx.shadowColor='#061124';ctx.shadowBlur=5;ctx.fillText(p.name+(mine?' ◇':''),p.x,p.y-70);ctx.shadowBlur=0;
 if(p.shield>0){ctx.strokeStyle='#b8e3ffb0';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,34,0,7);ctx.stroke();}
 if(p.slow){circle(p.x,p.y,34,'#9ae5ff',.12);}
}
function drawFx(e,t){ctx.save();const alpha=Math.min(1,e.ttl/.45);ctx.globalAlpha=Math.max(.1,alpha);ctx.translate(e.x,e.y);
 if(e.kind==='hit'){ctx.fillStyle=e.color;ctx.font='bold 20px sans-serif';ctx.textAlign='center';ctx.fillText('-'+e.dmg,0,-35-(1-alpha)*26);circle(0,0,25+30*(1-alpha),e.color,.15);}
 else if(e.kind==='cast'){circle(0,0,26+(1-alpha)*36,e.color,.2);}
 else{
  const radius=e.r||70;const g=ctx.createRadialGradient(0,0,2,0,0,radius);g.addColorStop(0,e.color+'8c');g.addColorStop(.65,e.color+'25');g.addColorStop(1,e.color+'00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,radius,0,7);ctx.fill();
  ctx.strokeStyle=e.color;ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,radius*(1.17-alpha*.2),0,7);ctx.stroke();
  for(let i=0;i<13;i++){const a=Math.PI*2*i/13+t*.7;circle(Math.cos(a)*radius*.66,Math.sin(a)*radius*.66,3+alpha*5,e.color,.85);}
 }
 ctx.restore();}
function drawProjectile(p,t){ctx.save();ctx.translate(p.x,p.y);const r=p.r||18;ctx.shadowColor=p.color;ctx.shadowBlur=28;circle(0,0,r,p.color,.75);circle(0,0,r*.5,'#fff8df',.85);ctx.shadowBlur=0;for(let i=0;i<4;i++){let a=t*6+i*1.57;circle(Math.cos(a)*r*1.4,Math.sin(a)*r*1.4,3,p.color,.8);}ctx.restore();}
function draw(t){animTime=t;if(view==='battle'){
 ctx.clearRect(0,0,1280,720);drawArena(t);
 if(snap){for(const e of snap.effects||[])drawFx(e,t);for(const p of snap.projectiles||[])drawProjectile(p,t);for(const p of [...snap.players].sort((a,b)=>a.y-b.y))drawHero(p,t);
  if(snap.status==='playing'&&snap.players.find(x=>x.id===myId)?.alive===false){ctx.fillStyle='#0008';ctx.fillRect(0,0,1280,720);ctx.fillStyle='#fff0d7';ctx.font='bold 32px sans-serif';ctx.textAlign='center';ctx.fillText('전투 불능 · 결과를 기다리는 중',640,360);}
 }else{ctx.textAlign='center';ctx.font='bold 24px sans-serif';ctx.fillStyle='#ffdba1';ctx.fillText('마법사 소환 중...',640,360);}
 }requestAnimationFrame(q=>draw(q/1000));}
// Audio adapter; licensed tracks/voices can be inserted without rebuilding the client.
let audioContext=null,music=null,voices=[],audioUnlocked=false;
const audioPath='/assets/audio/';
function unlock(){audioUnlocked=true;try{audioContext||=new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();}catch{}}
function setMusicVolume(){if(music)music.volume=(+$('musicVol').value)/100;}
function startMusic(){stopMusic();if(!audioUnlocked)return;music=new Audio(audioPath+'battle-theme.mp3');music.loop=true;music.volume=(+$('musicVol').value)/100;music.play().catch(()=>{music=null;});}
function stopMusic(){if(music){music.pause();music.currentTime=0;music=null;}}
function sfx(type){if(!audioUnlocked||!audioContext||+$('sfxVol').value<=0)return;try{
 const o=audioContext.createOscillator(),g=audioContext.createGain();o.connect(g);g.connect(audioContext.destination);
 const now=audioContext.currentTime,base=type==='win'?600:type==='magic'?280:120;
 o.type=type==='magic'?'triangle':'sawtooth';o.frequency.setValueAtTime(base,now);o.frequency.exponentialRampToValueAtTime(type==='win'?900:85,now+.14);
 g.gain.setValueAtTime((+$('sfxVol').value)/100*.045,now);g.gain.exponentialRampToValueAtTime(.001,now+.17);o.start(now);o.stop(now+.18);
 }catch{}}
function playCast(m){sfx(m.slot===4?'win':'magic');
 if(!audioUnlocked)return;
 const key=['attack','skill-q','skill-e','skill-r','ultimate'][m.slot];
 const v=new Audio(audioPath+'voices/'+m.hero+'/'+key+'.mp3');v.volume=(+$('voiceVol').value)/100;
 v.play().catch(()=>{});voices.push(v);if(voices.length>12)voices.shift();
}
function sendMovement(){if(view!=='battle'||!room||room.status!=='playing')return;send({type:'input',keys:input,aim:mouseAim});}
function bind(){
 try{$('name').value=localStorage.getItem('magic_arena_name')||'';}catch{}
 document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('selected',x.dataset.mode===mode));}));
 $('create').addEventListener('click',()=>{unlock();send({type:'create',name:readName(),hero,mode});});
 $('join').addEventListener('click',()=>{unlock();const code=$('joincode').value.trim().toUpperCase();if(!/^[0-9A-F]{6}$/.test(code)){toast('6자리 방 코드를 입력하세요.');return;}send({type:'join',code,name:readName(),hero});});
 $('joincode').addEventListener('keydown',e=>{if(e.key==='Enter')$('join').click();});
 $('copyLink').addEventListener('click',invite);
 $('leaveLobby').addEventListener('click',quit);$('leaveBattle').addEventListener('click',()=>{if(confirm('진행 중인 대전을 나가시겠습니까?'))quit();});
 $('start').addEventListener('click',()=>{unlock();send({type:'start'});});$('switchTeam').addEventListener('click',()=>{const p=room?.players.find(x=>x.id===myId);if(p)send({type:'team',team:p.team===1?2:1});});
 $('again').addEventListener('click',()=>send({type:'again'}));$('exitResult').addEventListener('click',quit);
 $('chatinput').addEventListener('keydown',e=>{if(e.key==='Enter'){chat();e.preventDefault();}});$('sendchat').addEventListener('click',chat);
 $('settingsButton').addEventListener('click',()=>$('settings').classList.toggle('hidden'));$('closeSettings').addEventListener('click',()=>$('settings').classList.add('hidden'));
 $('musicVol').addEventListener('input',setMusicVolume);
 const dir={w:'up',arrowup:'up',s:'down',arrowdown:'down',a:'left',arrowleft:'left',d:'right',arrowright:'right'};
 window.addEventListener('keydown',e=>{
  if(document.activeElement?.tagName==='INPUT'||document.activeElement?.tagName==='SELECT')return;
  if(view!=='battle')return;
  const key=e.key.toLowerCase();if(dir[key]){e.preventDefault();input[dir[key]]=true;}const slot={j:0,q:1,e:2,r:3,f:4}[key];
  if(slot!==undefined&&!e.repeat){e.preventDefault();unlock();send({type:'action',slot});}
  if(key==='enter'){$('chatinput').focus();e.preventDefault();}
 });
 window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(dir[k])input[dir[k]]=false;});
 window.addEventListener('blur',()=>{input={up:false,down:false,left:false,right:false};});
 canvas.addEventListener('pointermove',e=>{const p=snap?.players?.find(x=>x.id===myId);if(!p)return;const r=canvas.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*1280,y=(e.clientY-r.top)/r.height*720;mouseAim=Math.atan2(y-p.y,x-p.x);});
 canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button===0){unlock();send({type:'action',slot:0});}});
 document.querySelectorAll('[data-dir]').forEach(b=>{const set=v=>{input[b.dataset.dir]=v;b.style.background=v?'#3c7798cc':'#122d4bba';};b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);set(true);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>set(false));});
 document.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();unlock();send({type:'action',slot:Number(b.dataset.act)});}));
 setInterval(sendMovement,65);
}
renderCards();bind();connect();requestAnimationFrame(t=>draw(t/1000));
})();
