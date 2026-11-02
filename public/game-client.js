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
const heroLore={
 natsu:{full:'나츠 드래그닐',title:'FIRE DRAGON SLAYER',intro:'주먹에 화염을 두르는 돌격형 마도사',attack:95,magic:72},
 lucy:{full:'루시 하트필리아',title:'CELESTIAL SPIRIT MAGE',intro:'성령 마법으로 전장을 장악하는 소환사',attack:62,magic:96},
 erza:{full:'엘자 스칼렛',title:'TITANIA · REQUIP MAGIC',intro:'갑옷과 검을 자유롭게 다루는 기사',attack:92,magic:79},
 gray:{full:'그레이 풀버스터',title:'ICE-MAKE WIZARD',intro:'얼음 조형으로 적의 움직임을 제어한다',attack:76,magic:93}
};
let cameraShake=0,comboUntil=0,visualPositions=new Map(),previousHp=new Map(),ultimateTimeout=null,stageFlash=0;
let difficulty='normal',opponent='gray',pingMs=null,inputSeq=0,lastCombatText='',lastCombatUntil=0;
let battleRound=1,roundBannerUntil=0,roundBannerText='',screenHitstopUntil=0;
const hitParticles=[],pingHistory=[],positionSamples=new Map();
const v6Sparks=[];let v6FX=true;
function v6Spawn(x,y,color,kind='burst',amount=28){for(let i=0;i<amount;i++){let a=Math.random()*Math.PI*2,spd=75+Math.random()*315;v6Sparks.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-(kind==='flame'?110:0),born:performance.now()/1000,ttl:.35+Math.random()*.65,size:2+Math.random()*5,color,kind});}if(v6Sparks.length>430)v6Sparks.splice(0,v6Sparks.length-430);}
function v6DrawSparks(t,dt){if(!v6FX)return;ctx.save();ctx.globalCompositeOperation='screen';for(let i=v6Sparks.length-1;i>=0;i--){const q=v6Sparks[i],age=t-q.born;if(age>q.ttl){v6Sparks.splice(i,1);continue;}q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=(q.kind==='flame'?-85:260)*dt;q.vx*=.99;let a=Math.max(0,1-age/q.ttl);ctx.globalAlpha=a*.9;ctx.fillStyle=q.color;ctx.shadowColor=q.color;ctx.shadowBlur=12;ctx.fillRect(q.x-q.size/2,q.y-q.size/2,q.size*a,q.size*a);if(i%4===0){ctx.strokeStyle='#fff8cf';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(q.x-q.vx*.025*a,q.y-q.vy*.025*a);ctx.stroke();}}ctx.restore();}

const WORLD_WIDTH=3600,WORLD_HEIGHT=1024,WORLD_FLOOR=852;let cameraX=0,cameraY=240,lastRenderedAt=0;
let dynamicMap=null,screenW=1280,screenH=720;

let ws=null,myId=null,room=null,snap=null,hero='natsu',mode='duel',view='home',animTime=0,mouseAim=null,connected=false,toastTimeout,aliveSince=0;
let input={up:false,down:false,left:false,right:false,dash:false};
const canvas=$('arena'),ctx=canvas.getContext('2d');
const colors={team1:'#ff907c',team2:'#83b8ff',team3:'#e7adf9'};
function updateSpotlight(){const l=heroLore[hero],h=heroInfo[hero],box=$('heroFocus');if(!box)return;box.style.borderColor=h.color;
 box.innerHTML=`<div class="spotlight-name">${l.full}</div><div class="spotlight-meta">${l.title}</div><div class="spotlight-desc">${l.intro}</div><div class="spotlight-stat"><span>ATTACK</span><i style="background:linear-gradient(90deg,#ffac5d ${l.attack}%,#292738 ${l.attack}%)"></i><span>MAGIC</span><i style="background:linear-gradient(90deg,#6dc4ec ${l.magic}%,#292738 ${l.magic}%)"></i></div>`;}
function renderCards(){ $('heroCards').innerHTML=Object.entries(heroInfo).map(([id,h])=>`<button class="hero-card ${id===hero?'selected':''}" data-hero="${id}" style="--hero:${h.color}"><span class="sel">${id===hero?'◆ SELECTED':'CHOOSE'}</span><div class="portrait-wrap"><img class="charart" alt="${h.name} 애니메이션 스타일 얼굴 초상화" src="/assets/portraits/${id}.webp"><img class="preview-sprite" src="/assets/sprites/${id}_idle1.png" alt=""></div><div class="charinfo"><h4>${h.name}</h4><span class="role">${h.role}</span><p>${h.desc}</p></div></button>`).join('');
 document.querySelectorAll('[data-hero]').forEach(b=>b.addEventListener('click',()=>{hero=b.dataset.hero;renderCards();$('chosen').textContent=heroInfo[hero].role+' · '+heroInfo[hero].name;if(room?.status==='lobby')send({type:'hero',hero});updateSpotlight();}));updateSpotlight();}
function show(name){view=name;for(const v of ['home','lobby','battle'])$(v).classList.toggle('hidden',v!==name);if(name!=='battle')stopMusic();}
function toast(msg){$('toast').textContent=msg;$('toast').classList.remove('hidden');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').classList.add('hidden'),3700);}
function connect(){
 const proto=location.protocol==='https:'?'wss:':'ws:';
 ws=new WebSocket(proto+'//'+location.host+'/ws');
 ws.addEventListener('open',()=>{connected=true;$('net').innerHTML='<i class="dot"></i> 온라인 연결됨 <small id="pingLabel">— ms</small>';
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
 if(m.type==='start'){room=m.room;snap=null;visualPositions.clear();positionSamples.clear();previousHp.clear();cameraX=0;cameraY=240;$('resultoverlay').classList.add('hidden');show('battle');
 $('roomName').textContent='#'+room.code;
 $('battleMode').textContent=room.practice?`AI ARENA · ${ {novice:'견습',normal:'정예',master:'S급'}[room.aiDifficulty]||'정예'}`:modeInfo[room.mode];
 $('roundStatus').textContent=room.practice?'ROUND 1 / BEST OF 3':'ONLINE GUILD WAR';
 battleRound=1;roundBannerText='';roundBannerUntil=0;battleStarted=performance.now()/1000;recentCasts.clear();renderSkills();addChat('SYSTEM','대전 시작! 상대를 쓰러뜨리세요.');startMusic();return;}
 if(m.type==='snapshot'){
  // Preserve server-authoritative world state; visual-only lerp and impact polish.
  const arrival=performance.now();
  for(const p of m.players){
    // Jitter buffer: render remote positions slightly behind the most recent server state.
    // This never changes server-side attack / hitbox decisions.
    const history=positionSamples.get(p.id)||[];
    if(!history.length||m.tick>history[history.length-1].tick){
      history.push({tick:m.tick??arrival,t:arrival,x:p.x,y:p.y});
      while(history.length>12||history.length>2&&history[1].t<arrival-450)history.shift();
      positionSamples.set(p.id,history);
    }
    const old=previousHp.get(p.id);if(old!==undefined&&old>p.hp){
    if(p.id===myId){cameraShake=Math.min(14,cameraShake+Math.max(4,(old-p.hp)*.40));sfx('hit');}
    stageFlash=Math.min(.36,stageFlash+.06);
  }previousHp.set(p.id,p.hp);}
  snap=m;if(m.world)dynamicMap=m.world;if(room)room.status=m.status;
  if(m.roundIndex)battleRound=m.roundIndex;
  if(m.status==='roundBreak'){$('roundStatus').textContent='다음 라운드 준비';}
  else $('roundStatus').textContent=room?.practice?`ROUND ${battleRound} / BEST OF 3`:'ONLINE GUILD WAR';
  refreshHUD();
  const me=m.players.find(p=>p.id===myId);
  const hits=me?.combo>=2?me.combo:0;
  if(hits>=2){const el=$('comboBanner');el.innerHTML=`${hits} HITS <b>ARCANE CHAIN</b>`;el.classList.remove('hidden');comboUntil=performance.now()+1000;}
  return;
 }
 if(m.type==='pong'){
   const n=performance.now()-m.sent; if(n>=0&&n<15000){pingHistory.push(n);if(pingHistory.length>6)pingHistory.shift();
     pingMs=Math.round(pingHistory.reduce((a,b)=>a+b,0)/pingHistory.length);const label=$('pingLabel');
     if(label){label.textContent=pingMs+'ms';label.style.color=pingMs>220?'#ff998a':pingMs>100?'#ffe59c':'#a8ffc4';}}
   return;
  }
  if(m.type==='roundEnd'){
   const mine=m.scores?.find(p=>p.id===myId),enemy=m.scores?.find(p=>p.id!==myId);
   roundBannerText=(m.winner===myId?'ROUND WIN':'ROUND END')+' · '+(mine?.roundWins||0)+' : '+(enemy?.roundWins||0);
   roundBannerUntil=performance.now()+2400;
   addChat('SYSTEM','라운드 '+m.round+' 종료 · '+m.message);
   sfx(m.winner===myId?'win':'hit');return;
  }
  if(m.type==='roundStart'){
   battleStarted=performance.now()/1000;battleRound=m.round;roundBannerText='';roundBannerUntil=0;
   visualPositions.clear();previousHp.clear();addChat('SYSTEM','라운드 '+m.round+' 시작!');return;
  }
  if(m.type==='combat'){
   const now=performance.now();
   if(m.event==='hit'||m.event==='guardbreak'){const victim=snap?.players?.find(q=>q.id===m.target);if(victim)v6Spawn(victim.x,victim.y-125,heroTint(snap?.players?.find(q=>q.id===m.by)?.hero||'natsu'),m.event==='guardbreak'?'spark':'burst',m.event==='guardbreak'?55:28);}if(m.by===myId&&m.event==='hit'&&m.combo>=2){
     lastCombatText=m.combo+' HIT COMBO';lastCombatUntil=now+1350;
   }
   if(m.event==='guardbreak'){lastCombatText='GUARD BREAK!';lastCombatUntil=now+1450;cameraShake=Math.max(cameraShake,10);sfx('hit');}
   if(m.event==='cancel'&&m.by===myId){lastCombatText='MAGIC CANCEL!';lastCombatUntil=now+850;}
   if(m.event==='hit'){if(m.target===myId)cameraShake=Math.max(cameraShake,5);screenHitstopUntil=now+48;}
   return;
  }
  if(m.type==='chat'){addChat(m.name,m.text);return;}
 if(m.type==='notice'){addChat('SYSTEM',m.message);return;}
 if(m.type==='cast'){recentCasts.set(m.player,{at:performance.now()/1000,slot:m.slot});const caster=snap?.players?.find(q=>q.id===m.player);if(caster)v6Spawn(caster.x,caster.y-135,heroTint(m.hero),m.hero==='natsu'?'flame':'burst',m.slot===4?100:35);playCast(m);if(m.slot===4)showUltimate(m.hero);return;}
 if(m.type==='ended'){room=m.room;$('resultoverlay').classList.remove('hidden');
  const mine=snap?.players.find(p=>p.id===myId);const won=room.mode==='teams'?m.outcome.winner===mine?.team:m.outcome.winner===myId;
  $('resulttitle').textContent=m.outcome.winner===null?'무승부':won?'승리! ✦':'패배';$('resultdetails').textContent=m.outcome.message;
  const scores=room.players.map(p=>p.roundWins||0);
  $('resultScore').textContent=room.practice?`AI 아레나 최종 스코어 ${scores[0]||0} : ${scores[1]||0}`:
    `획득 KO ${mine?.kills||0} · 누적 피해 ${mine?.damage||0}`;
  const leader=room.leader===myId;$('again').textContent=leader?'재대결 준비':'방장이 재대결을 준비하는 중';$('again').disabled=!leader;stopMusic();sfx('win');return;
 }
}
function renderLobby(){if(!room)return;
 $('roomcode').textContent=room.code;$('lobbymode').textContent=(room.practice?'AI ARENA · ':modeInfo[room.mode]+' · ')+room.players.length+' / '+room.max+'명';
 $('roomplayers').innerHTML=Array.from({length:room.max},(_,i)=>{
 const p=room.players[i];if(!p)return `<div class="playercard empty"><div style="font-size:35px">✧</div><strong>대기 중...</strong><span style="font-size:11px">친구의 참가를 기다립니다</span></div>`;
 const self=p.id===myId;let opt=self?`<select aria-label="캐릭터 선택" class="pickHero" style="background:#1d3656;color:white;border:1px solid #53718d;border-radius:7px;font-size:11px;padding:3px">${Object.entries(heroInfo).map(([id,h])=>`<option value="${id}" ${p.hero===id?'selected':''}>${h.name}</option>`).join('')}</select>`:`<span class="heroName">${heroInfo[p.hero]?.name||p.hero}</span>`;
 return `<div class="playercard"><img src="/assets/portraits/${p.hero}.webp" alt="${heroInfo[p.hero]?.name||''}"><strong style="font-size:13px">${escapeHTML(p.name)} ${self?'(나)':''}</strong>${opt}<span class="teamtag ${p.team===2?'t2':''}">${room.mode==='teams'?(p.team===1?'RED TEAM':'BLUE TEAM'):'PLAYER '+(i+1)}</span>${i===0?'<span style="font-size:10px;color:#ffda9f">👑 방장</span>':''}</div>`;
 }).join('');
 document.querySelectorAll('.pickHero').forEach(el=>el.addEventListener('change',e=>{hero=e.target.value;send({type:'hero',hero});}));
 const leader=room.leader===myId,ready=room.players.length===room.max,teamOK=room.mode!=='teams'||room.players.filter(p=>p.team===1).length===2;
 $('switchTeam').classList.toggle('hidden',room.mode!=='teams');$('start').classList.toggle('hidden',!leader);$('start').disabled=!ready||!teamOK;
 $('leaderNote').textContent=leader?'👑 당신은 방장입니다. 정원이 모두 차면 대전을 시작하세요.':'방장이 전투를 시작할 때까지 기다려주세요.';
 $('lobbynote').textContent=room.practice?'AI 훈련전입니다. 연습 후 전투 나가기를 누르면 온라인 대기실로 돌아갈 수 있습니다.':room.mode==='teams'?'2명씩 RED / BLUE 팀으로 구성하세요. 팀 변경 버튼으로 조정할 수 있습니다.':'정확히 '+room.max+'명이 모이면 전투를 시작할 수 있습니다.';
}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderSkills(){const p=room?.players.find(x=>x.id===myId);const c=heroInfo[p?.hero||hero];$('skills').innerHTML=c.skill.map((name,i)=>`<button class="skill" data-slot="${i}"><b>${['J','Q','E','R','F'][i]}</b><img src="/assets/v6/skill_${p?.hero||hero}_${i}.png" alt=""><span>${name}</span><em class="hidden"></em></button>`).join('');document.querySelectorAll('.skill').forEach(el=>el.addEventListener('click',()=>send({type:'action',slot:+el.dataset.slot})));}
function refreshHUD(){if(!snap||view!=='battle')return;const p=snap.players.find(x=>x.id===myId);if(!p)return;
 const c=heroInfo[p.hero];$('myPortrait').src='/assets/portraits/'+p.hero+'.webp';$('myName').textContent=c.name+' · '+p.name;$('myState').textContent=room?.mode==='teams'?(p.team===1?'RED TEAM':'BLUE TEAM'):'개인전';
 const perc=(v,max)=>Math.max(0,Math.min(100,Math.round(v/max*100)))+'%';
 $('hpfill').style.width=perc(p.hp,c.hp);$('mpfill').style.width=perc(p.mana,c.mana);$('ultfill').style.width=p.ult+'%';
 $('hptext').textContent=p.hp+' / '+c.hp;$('mptext').textContent=p.mana+' / '+c.mana;$('ulttext').textContent=p.ult+'%';
 $('guardFill').style.width=(p.guardMeter??100)+'%';
 $('guardText').textContent=p.guardBreak?'BREAK':(p.guardMeter??100)+'%';
 $('guardFill').classList.toggle('warning',p.guardMeter<30);if(p.haste){$('myState').textContent += ' · ⚡ 가속 효과';}
 $('chainLabel').textContent=p.chainStep?`연계 ${p.chainStep}/3 · ${p.chainWindow>0?'연결 가능':'종료'}`:'기본 공격 J ×3 → 스킬 연계';
 const a=snap.players.find(v=>v.id!==myId);
 const score=snap.scores||[];
 $('roundScore').textContent=room?.practice?`PLAYER ${score.find(v=>v.id===myId)?.roundWins||0} : ${score.find(v=>v.id!==myId)?.roundWins||0} AI`:'PVP';$('time').textContent=String(Math.floor(snap.time/60)).padStart(2,'0')+':'+String(snap.time%60).padStart(2,'0');
 document.querySelectorAll('.skill').forEach(el=>{const index=Number(el.dataset.slot),em=el.querySelector('em'),sec=p.cooldowns[index];
  const unavailable=index===4?p.ult<100:index===0?false:p.mana<(room?({natsu:[0,18,18,26],lucy:[0,20,25,26],erza:[0,18,22,24],gray:[0,16,24,25]}[p.hero]?.[index]):0);
  if(sec>0){em.textContent=sec.toFixed(1);em.classList.remove('hidden');}else if(unavailable){em.textContent=index===4?'충전중':'MP';em.classList.remove('hidden');}else em.classList.add('hidden');
  el.classList.toggle('ult-ready',index===4&&p.ult>=100);
 });
}
function showUltimate(h){const cut=$('ultimateCutin');if(!cut)return;
 cut.classList.remove('hidden');cut.dataset.hero=h;
 document.querySelector('.battlecanvas')?.classList.add('ultimate-active');
 stageFlash=Math.max(stageFlash,.52);screenHitstopUntil=performance.now()+85;cut.style.background=h==='gray'?'linear-gradient(90deg,#102e4bee,#3f93c6f0,#14253ced)':h==='lucy'?'linear-gradient(90deg,#3e244fed,#a46db4ee,#332343ed)':h==='erza'?'linear-gradient(90deg,#45152bea,#c15063eb,#3e172bea)':'linear-gradient(90deg,#3e1a23ec,#d15a32ec,#3c1923e8)';
 $('ultimatePortrait').src='/assets/portraits/'+h+'.webp';$('ultimateName').textContent=heroInfo[h]?.skill[4]||'ULTIMATE MAGIC';
 clearTimeout(ultimateTimeout);ultimateTimeout=setTimeout(()=>{
   cut.classList.add('hidden');document.querySelector('.battlecanvas')?.classList.remove('ultimate-active');
 },1450);cameraShake=Math.max(cameraShake,11);
}
function addChat(name,msg){const log=$('chatlog'),p=document.createElement('p'),b=document.createElement('b');b.textContent=name+': ';p.appendChild(b);p.appendChild(document.createTextNode(msg));log.appendChild(p);while(log.children.length>65)log.firstChild.remove();log.scrollTop=log.scrollHeight;}
function chat(){const m=$('chatinput').value.trim();if(m){send({type:'chat',text:m});$('chatinput').value='';}}
function quit(){send({type:'leave'});stopMusic();}
function invite(){if(!room)return;const url=new URL(location.href);url.searchParams.set('room',room.code);if(navigator.clipboard?.writeText){navigator.clipboard.writeText(url.href).then(()=>toast('초대 링크를 복사했어요!')).catch(()=>toast('초대 코드: '+room.code));}else toast('초대 코드: '+room.code);}
// Pixel-art arcade rendering. Combat state remains server authoritative.
const heroImages={}; const sprites={};const recentCasts=new Map();const lastMove=new Map();
const stageImage=new Image();stageImage.src='/assets/stages/magnolia_v5_world.webp';
const v6FloorImage=new Image();v6FloorImage.src='/assets/v6/cobble_floor.webp';
const v6PlatformImages={wood:new Image(),stone:new Image()};for(const [kind,im] of Object.entries(v6PlatformImages))im.src='/assets/v6/platform_'+kind+'.png';
const spritePoses=['idle1','idle2','idle3','idle4','run1','run2','run3','run4','attack','attack2','attack3','cast','cast2','jump','jump2','hurt','hurt2','victory'];
for(const id of Object.keys(heroInfo)){
  heroImages[id]=new Image();heroImages[id].src='/assets/portraits/'+id+'.webp';
  sprites[id]={};const atlas=new Image();atlas.src='/assets/spritesheets/'+id+'.png';for(let i=0;i<spritePoses.length;i++){sprites[id][spritePoses[i]]={atlas,sx:(i%6)*192,sy:Math.floor(i/6)*252};}
}
const uiColors={red:'#da655b',blue:'#75beee',gold:'#ffdda0',purple:'#cf85df'};
let battleStarted=0,shakeUntil=0;
function clamp(x,min,max){return Math.min(max,Math.max(min,x));}
function fillRect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function goldFrame(x,y,w,h){ctx.strokeStyle='#7b4333';ctx.lineWidth=6;ctx.strokeRect(x,y,w,h);ctx.strokeStyle='#ebbf78';ctx.lineWidth=2;ctx.strokeRect(x+3,y+3,w-6,h-6);}
function stroked(text,x,y,font,color='#fff4df',stroke='#2a1322',weight=4,align='center'){
 ctx.save();ctx.textAlign=align;ctx.font=font;ctx.lineWidth=weight;ctx.strokeStyle=stroke;ctx.lineJoin='round';ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);ctx.restore();
}
function drawPlatform(platform,t){
 const {x,y,w,h,style}=platform,stone=style==='stone';ctx.save();
 ctx.shadowColor='#0b101c9a';ctx.shadowBlur=14;ctx.shadowOffsetY=9;
 const timber=ctx.createLinearGradient(0,y-10,0,y+h+8);timber.addColorStop(0,stone?'#f7ebbd':'#f8c98b');timber.addColorStop(.18,stone?'#a5aabb':'#ad7658');timber.addColorStop(.65,stone?'#4a5774':'#594458');timber.addColorStop(1,'#292b43');
 fillRect(x,y,w,h,timber);ctx.shadowBlur=0;ctx.shadowOffsetY=0;const tile=v6PlatformImages[stone?'stone':'wood'];if(tile?.naturalWidth){ctx.imageSmoothingEnabled=false;for(let o=0;o<w;o+=256){const piece=Math.min(256,w-o);ctx.drawImage(tile,0,0,piece,85,x+o,y-12,piece,85);}}
 fillRect(x-9,y-12,w+18,14,stone?'#dadac5':'#e6b575');fillRect(x-9,y-12,w+18,3,'#fff4c3');fillRect(x-9,y-1,w+18,2,stone?'#76788d':'#7e443c');
 // cross-braced timber and polished gold corners, uniquely spaced per ledge
 for(let i=0;i<Math.floor(w/42);i++){
  const bx=x+10+i*42;ctx.strokeStyle=stone?'#cad2cc88':'#d8a2667d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(bx,y+9);ctx.lineTo(bx+26,y+9);ctx.stroke();
  fillRect(bx+16,y+h-6,2,4,stone?'#1d263a':'#341928');
 }
 for(const xx of [x+18,x+w-18]){
  fillRect(xx-9,y+h,18,21,stone?'#4b4b67':'#654151');fillRect(xx-11,y+h+19,22,4,'#b1876b');
  ctx.strokeStyle=stone?'#a5abb0':'#bd9169';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(xx-17,y+h);ctx.lineTo(xx+5,y+h+18);ctx.stroke();
 }
 // gold floral / rune endcaps and subtle magic torches, purely decorative
 for(const ex of [x+8,x+w-8]){ctx.fillStyle='#ffde89';ctx.beginPath();ctx.arc(ex,y-6,4,0,7);ctx.fill();}
 if(w>220){const mid=x+w/2;ctx.save();ctx.globalAlpha=.7+.2*Math.sin(t*3+mid);ctx.strokeStyle=stone?'#c6eeff':'#ffc67b';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(mid,y-8,11,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(mid,y-19);ctx.lineTo(mid+8,y-8);ctx.lineTo(mid,y+2);ctx.lineTo(mid-8,y-8);ctx.closePath();ctx.stroke();ctx.restore();}
 ctx.restore();
}
function drawStage(t){
 ctx.imageSmoothingEnabled=false;
 if(stageImage.complete&&stageImage.naturalWidth){const sx=Math.floor(cameraX),sy=Math.floor(cameraY);ctx.imageSmoothingEnabled=true;ctx.drawImage(stageImage,sx,sy,1280,720,sx,sy,1280,720);ctx.imageSmoothingEnabled=false;}
 else{const g=ctx.createLinearGradient(0,0,0,WORLD_HEIGHT);g.addColorStop(0,'#416b9d');g.addColorStop(1,'#a77e72');fillRect(0,0,WORLD_WIDTH,WORLD_HEIGHT,g);}
 for(const p of dynamicMap?.platforms||[])if(p.x+p.w>=cameraX-30&&p.x<=cameraX+1310&&p.y>=cameraY-50&&p.y<=cameraY+760)drawPlatform(p,t);
 // Seamless cobblestone paving, rather than a featureless brick wall under the battle.
 if(v6FloorImage.naturalWidth){ctx.imageSmoothingEnabled=true;ctx.drawImage(v6FloorImage,0,WORLD_FLOOR,WORLD_WIDTH,WORLD_HEIGHT-WORLD_FLOOR);ctx.imageSmoothingEnabled=false;}
 else{fillRect(0,WORLD_FLOOR,WORLD_WIDTH,WORLD_HEIGHT-WORLD_FLOOR,'#9f8e93');}
 fillRect(0,WORLD_FLOOR,WORLD_WIDTH,4,'#f9e3b3');fillRect(0,WORLD_FLOOR+4,WORLD_WIDTH,3,'#5b4656');
 // Distant windblown magical motes respond to scrolling, without obscuring fighters.
 for(let i=0;i<110;i++){
  const xx=(i*211.17+t*(i%4+1)*5)%WORLD_WIDTH,yy=120+(i*79)%610+Math.sin(t+i)*10;
  fillRect(Math.floor(xx),Math.floor(yy),i%5===0?3:2,2,i%4===0?'#ffeaa899':'#d5e7ff55');
 }
}
function drawPickups(t){if(!snap)return;
 for(const item of snap.pickups||[]){
  const x=item.x,y=item.y+Math.sin(t*3+item.x)*7;const itemColor=item.type==='mana'?'#7dbfff':item.type==='haste'?'#ffcf72':'#90ffc2';
  ctx.save();ctx.translate(x,y);const glow=ctx.createRadialGradient(0,0,4,0,0,65);
  glow.addColorStop(0,item.type==='mana'?'#87bfffa9':item.type==='haste'?'#ffe18ca9':'#bdffb7aa');glow.addColorStop(1,'#88ffbd00');fillRect(-70,-70,140,140,glow);
  ctx.rotate(Math.sin(t*2)*.15);
  ctx.fillStyle=item.type==='mana'?'#163f77':item.type==='haste'?'#8b5826':'#15472c';ctx.fillRect(-19,-23,38,46);ctx.fillStyle=itemColor;ctx.fillRect(-14,-18,28,36);
  ctx.fillStyle='#e4fff1';ctx.fillRect(-5,-12,10,24);ctx.fillRect(-11,-5,22,10);
  ctx.strokeStyle='#efffbb';ctx.lineWidth=3;ctx.strokeRect(-20,-24,40,48);
  ctx.restore();
  stroked(item.type==='mana'?'MP +38':item.type==='haste'?'HASTE ×7s':'HP +30',x,y-46,'bold 15px sans-serif',itemColor,'#20243b',4);
 }
}
function drawFields(t){if(!snap)return;for(const f of snap.fields||[]){
 ctx.save();ctx.translate(f.x,f.y);ctx.globalCompositeOperation='screen';ctx.globalAlpha=Math.min(.85,f.ttl*.4);
 const isFire=f.kind==='flame',isIce=f.kind==='frost',isBlade=f.kind==='blade';
 const col=isFire?'#ff9638':isIce?'#7dcffc':isBlade?'#fb87bc':'#ffe6a6';
 // Persistent ground seal -- distinct palette and motif per magician.
 ctx.strokeStyle=col;ctx.lineWidth=3;
 ctx.beginPath();ctx.ellipse(0,38,f.r,f.r*.27,0,0,Math.PI*2);ctx.stroke();
 ctx.beginPath();ctx.ellipse(0,38,f.r*.67,f.r*.18,0,0,Math.PI*2);ctx.stroke();
 for(let i=0;i<10;i++){
   const angle=i*Math.PI/5+t*(isBlade?2.2:.7),xx=Math.cos(angle)*f.r*.82,yy=38+Math.sin(angle)*f.r*.2;
   if(isFire){
     ctx.fillStyle=i%2?'#ffd166':'#ff572e';ctx.beginPath();ctx.moveTo(xx-11,yy+17);ctx.lineTo(xx+6,yy-23-14*Math.sin(t*7+i));ctx.lineTo(xx+15,yy+15);ctx.fill();
   }else if(isIce){
     ctx.fillStyle=i%2?'#c7f7ff':'#71bee8';ctx.beginPath();ctx.moveTo(xx-13,yy+10);ctx.lineTo(xx,yy-44+6*Math.sin(t*3+i));ctx.lineTo(xx+13,yy+10);ctx.closePath();ctx.fill();
     ctx.strokeStyle='#ecffff';ctx.stroke();
   }else if(isBlade){
     ctx.strokeStyle=i%2?'#fff0fb':'#fa86aa';ctx.lineWidth=7;ctx.beginPath();ctx.arc(xx,yy-12,18,(t*3+i)*.7,(t*3+i)*.7+1.4);ctx.stroke();
   }else{
     ctx.fillStyle=i%2?'#fff7c5':'#d4aaf9';ctx.beginPath();for(let j=0;j<8;j++){
       const a=j*Math.PI/4,rr=j%2?5:16;const px=xx+Math.cos(a)*rr,py=yy-19+Math.sin(a)*rr;
       if(j===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
     }ctx.closePath();ctx.fill();
   }
 }
 ctx.restore();
}}

function updateCamera(t,frameDt){
 const me=snap?.players?.find(p=>p.id===myId)||snap?.players?.[0];if(!me)return;
 const pos=fighterDisplayPosition(me);let wantedX=clamp(pos.x-640,0,WORLD_WIDTH-1280),wantedY=clamp(pos.y-495,0,WORLD_HEIGHT-720);
 // Ease camera position, with horizontal look-ahead for fast movement.
 wantedX=clamp(wantedX+clamp(me.vx||0,-250,250)*.24,0,WORLD_WIDTH-1280);
 const step=clamp(frameDt*5.7,0,1);cameraX+=(wantedX-cameraX)*step;cameraY+=(wantedY-cameraY)*step;
}
function drawMiniMap(){if(!snap)return;
 const x=978,y=604,w=280,h=77,scale=w/WORLD_WIDTH;
 ctx.save();fillRect(x-8,y-19,w+16,104,'#171321db');goldFrame(x-8,y-19,w+16,104);
 stroked('MAGNOLIA · BATTLEFIELD 3600m',x+5,y-3,'bold 11px sans-serif','#f9dc9d','#281a29',3,'left');
 fillRect(x,y+6,w,54,'#384259');fillRect(x,y+52,w,8,'#a8977e');
 for(const p of dynamicMap?.platforms||[]){fillRect(x+p.x*scale,y+8+(p.y/WORLD_HEIGHT)*43,p.w*scale,4,p.style==='stone'?'#ebd6a0':'#bc8d64');}
 for(const pk of snap.pickups||[]){ctx.fillStyle=pk.type==='mana'?'#71c5ff':pk.type==='haste'?'#ffd076':'#81ff98';ctx.fillRect(x+pk.x*scale-3,y+28,6,11);}
 for(const p of snap.players){ctx.fillStyle=p.id===myId?'#fff5a4':p.team===1?'#ff8d81':'#93caff';ctx.fillRect(x+p.x*scale-4,y+18+(p.y/WORLD_HEIGHT)*33,8,12);}
 ctx.strokeStyle='#fff5af';ctx.lineWidth=1;ctx.strokeRect(x+cameraX*scale,y+6,(1280*scale),54);
 ctx.restore();
 const count=Math.max(0,Math.ceil(snap.pickupClock??0));stroked('ARCANE ITEM  '+(snap.pickups?.length?'AVAILABLE':'IN '+count+'s'),1010,698,'bold 14px sans-serif','#baffd0','#193f2b',4,'left');
}

function heroTint(id){return heroInfo[id]?.color||'#e8c994';}
function fighterDisplayPosition(p){
 const samples=positionSamples.get(p.id);
 if(!samples?.length)return {x:p.x,y:p.y};
 const moment=performance.now()-87;
 const first=samples[0],last=samples[samples.length-1];
 if(moment<=first.t)return {x:first.x,y:first.y};
 for(let i=1;i<samples.length;i++){
   const prev=samples[i-1],next=samples[i];
   if(moment<=next.t){const a=clamp((moment-prev.t)/Math.max(1,next.t-prev.t),0,1);
     return {x:prev.x+(next.x-prev.x)*a,y:prev.y+(next.y-prev.y)*a};
   }
 }
 if(samples.length>1){
   const prev=samples[samples.length-2],delay=clamp((moment-last.t)/1000,0,.035);
   const vx=clamp((last.x-prev.x)/(Math.max(.025,(last.t-prev.t)/1000)),-330,330);
   return {x:clamp(last.x+vx*delay,70,WORLD_WIDTH-70),y:last.y};
 }
 return {x:last.x,y:last.y};
}
function v6DrawSpellSignature(p,t,elapsed,slot,x,y){
 if(elapsed>.52||!p.alive)return;
 const color=heroTint(p.hero),facing=p.face>Math.PI/2||p.face<-Math.PI/2?-1:1;
 const power=slot===4?1.5:slot===0?.65:1,progress=clamp(elapsed/(slot===4?.6:.38),0,1);
 const fade=Math.max(0,1-progress);ctx.save();ctx.translate(x+facing*76,y-135);ctx.globalCompositeOperation='screen';ctx.globalAlpha=fade*.95;ctx.shadowColor=color;ctx.shadowBlur=24;
 if(p.hero==='natsu'){
  for(let k=0;k<8+(slot===4?8:0);k++){const theta=(k/8)*Math.PI*2+t*7,radius=(34+(slot===4?90:35)*progress)+(k%4)*11;
   const fx=Math.cos(theta)*radius*.65+facing*60*progress,fy=Math.sin(theta)*radius*.8;
   ctx.fillStyle=k%3?'#ff7d29':'#ffe49c';ctx.beginPath();ctx.moveTo(fx-12,fy+20);ctx.quadraticCurveTo(fx+12,fy-10,fx+Math.sin(t*19+k)*16,fy-35-(k%3)*8);ctx.quadraticCurveTo(fx-25,fy-10,fx-12,fy+20);ctx.fill();}
  ctx.strokeStyle='#ffd88e';ctx.lineWidth=13*power;ctx.beginPath();ctx.arc(0,0,65+60*progress,-1.8,-1.8+progress*4.9);ctx.stroke();
 }else if(p.hero==='gray'){
  for(let k=0;k<13;k++){const angle=k*6.283/13+(t*.2),len=(45+80*progress)*(1+(k%3)*.12);
   const X=Math.cos(angle)*len,Y=Math.sin(angle)*len;ctx.fillStyle=k%2?'#c0f5ff':'#5aaae8';ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(X,Y);ctx.lineTo(X+Math.cos(angle+.6)*19,Y+Math.sin(angle+.6)*19);ctx.closePath();ctx.fill();ctx.stroke();}
  ctx.strokeStyle='#dffaff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,50+70*progress,0,6.283);ctx.stroke();
 }else if(p.hero==='erza'){
  for(let k=0;k<3+(slot===4?3:0);k++){ctx.save();ctx.rotate(k*.43+t*.25);ctx.strokeStyle=k%2?'#ffb2d6':'#fff1f3';ctx.lineWidth=7+k*2;ctx.beginPath();ctx.arc(0,0,55+k*19+progress*48,-2.2,-.4+progress*3.7);ctx.stroke();ctx.restore();}
  for(let j=0;j<7;j++){ctx.save();ctx.rotate(j*Math.PI/7);ctx.fillStyle='#ff8db1';ctx.fillRect(52+j*8,-2,27,4);ctx.restore();}
 }else{
  for(let k=0;k<10+(slot===4?8:0);k++){const ang=k*.61+t*.22,rad=26+(65+45*progress)*(k%3)/3;
   const X=Math.cos(ang)*rad,Y=Math.sin(ang)*rad;ctx.fillStyle=k%2?'#fff8cf':'#f6cfff';ctx.beginPath();for(let j=0;j<10;j++){const a=ang+j*Math.PI/5,r=j%2?4:14;const xx=X+Math.cos(a)*r,yy=Y+Math.sin(a)*r;if(!j)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);}ctx.closePath();ctx.fill();}
  ctx.strokeStyle='#fff3b1';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,75*power,-1.5,Math.PI*2.3);ctx.stroke();
 }
 ctx.restore();
}
function drawFighter(p,t){
 const mine=p.id===myId,c=heroInfo[p.hero];if(!c)return;
 const cast=recentCasts.get(p.id);const elapsed=cast?t-cast.at:999;
 let pose='idle1';
 if(!p.onGround)pose=p.vy>0?'jump2':'jump';
 else if(elapsed<.35){pose=cast.slot===0?(['attack','attack2','attack3'][Math.min(2,Math.floor(elapsed*11))]):(['cast','cast2'][Math.floor(elapsed*10)%2]);}
 else if(p.attackPose>.12)pose=p.animation==='hurt'?Math.floor(t*9)%2?'hurt':'hurt2':p.animation||'attack';
 else if(p.moving)pose=['run1','run3','run2','run4'][Math.floor(t*11*(.7+Math.min(1,Math.abs(p.vx||0)/330)*.6))%4];
 else pose=['idle1','idle3','idle2','idle4'][Math.floor(t*3)%4];
 if(p.guardBreak)pose='hurt2';
 else if(p.hitstun||p.animation==='hurt'&&p.attackPose>.05)pose='hurt';
 else if(p.chainStep===3&&p.attackPose>.06)pose='attack3';
 else if(p.chainStep===2&&p.attackPose>.06)pose='attack2';
 if(!p.alive)pose='hurt';
 const smooth=fighterDisplayPosition(p);let x=smooth.x,y=smooth.y;
 const float=!!p.onGround&&p.alive?Math.sin(t*3.8+(x*.003))*1.8:0;
 const landSquash=Math.min(.12,(p.landPulse||0)*.6);
 ctx.save();
 // Landing shadows and element-coloured magic ring.
 ctx.fillStyle='#160e1f7c';ctx.beginPath();ctx.ellipse(x,y+2,65,14,0,0,Math.PI*2);ctx.fill();
 if(mine){ctx.strokeStyle='#ffe39b';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(x,y+1,69,19,0,0,Math.PI*2);ctx.stroke();}
 if(p.guard){ctx.strokeStyle='#fff1c5cc';ctx.lineWidth=5;ctx.beginPath();ctx.arc(x,y-120,80,p.face===0?-1.35:1.55,p.face===0?1.35:4.75);ctx.stroke();}
 if(p.shield){ctx.strokeStyle='#bceafeaa';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(x,y-120,80,120,0,0,Math.PI*2);ctx.stroke();}
 if(p.slow){fillRect(x-37,y-12,75,6,'#a4f2ffbb');}
 if(p.onGround&&(Math.abs(p.vx||0)>100||p.landPulse>.04)){
  for(let j=0;j<5;j++){const drift=j*13+Math.abs(p.vx||0)*.055;const dx=(p.vx>0?-1:1)*drift;
    const r=2+j%3;fillRect(x+dx,y-8-(j*9+t*20)%22,r*2,r,'#dcd1b483');}
 }
 if(!p.onGround&&Math.abs(p.vy||0)>280){for(let j=0;j<4;j++){const trail=(j+1)*9;fillRect(x-17+j*10,y+trail*(p.vy<0?1:-1),3,12,'#f9e0bc66');}}
 ctx.translate(Math.round(x),Math.round(y+float));
 if(landSquash>0){ctx.scale(1+landSquash,1-landSquash);}
 // Procedural in-between posing: lean with velocity, stretch slightly in air.
 const lean=clamp((p.vx||0)/420,-1,1)*.075;ctx.rotate(lean);
 if(!p.onGround){const stretch=clamp(-(p.vy||0)/1800,-.07,.10);ctx.scale(1-stretch*.45,1+stretch);}
 if(p.face>Math.PI/2||p.face<-Math.PI/2)ctx.scale(-1,1);
 if(!p.alive)ctx.globalAlpha=.45;
 if(p.guard){ctx.filter='brightness(1.2) saturate(.75)';}
 const frame=sprites[p.hero]?.[pose],im=frame?.atlas;
 if(im&&im.complete&&im.naturalWidth){
   if((p.moving&&p.onGround&&Math.sin(t*12)>.35)||p.dashCooldown>1.38){ctx.save();ctx.globalAlpha=.21;ctx.drawImage(im,frame.sx,frame.sy,192,252,(p.face===0?-119:-79),-260,198,260);ctx.restore();}
   ctx.shadowColor=c.color;ctx.shadowBlur=mine?20:10;ctx.drawImage(im,frame.sx,frame.sy,192,252,-99,-260,198,260);ctx.shadowBlur=0;
   if((elapsed<.45||p.ult>=99)&&p.alive){ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.32;const aura=ctx.createRadialGradient(0,-128,15,0,-128,135);aura.addColorStop(0,c.color);aura.addColorStop(1,'#00000000');ctx.fillStyle=aura;ctx.fillRect(-125,-285,250,260);ctx.restore();}
 }

 else{ctx.fillStyle=c.color;ctx.fillRect(-30,-140,60,135);}
 ctx.restore();
 if(elapsed<.52&&cast)v6DrawSpellSignature(p,t,elapsed,cast.slot,x,y);
 if(!p.alive){stroked('K.O.',x,y-180,'900 25px Georgia','#fff','#652c37',6);return;}
 // compact individual overhead nameplate, needed for 4-player matches.
 const label=(mine?'◆ ':'')+p.name;
 ctx.save();ctx.font='bold 15px sans-serif';const w=clamp(ctx.measureText(label).width+34,100,210);
 fillRect(x-w/2,y-296,w,25,'#1a1425dc');ctx.strokeStyle=mine?'#f3d082':'#876457';ctx.lineWidth=1;ctx.strokeRect(x-w/2,y-296,w,25);
 stroked(label,x,y-278,'bold 13px sans-serif','#fff5df','#17101a',2);
 fillRect(x-44,y-266,88,7,'#1a1220e0');fillRect(x-43,y-265,86*clamp(p.hp/c.hp,0,1),5,mine?'#ffc575':p.team===1?'#ff7465':'#7ec6ff');
 ctx.restore();
}
function drawImpact(e,t){
 ctx.save();let ttl=Math.max(.05,e.ttl||.2);const phase=clamp(ttl/.55,0,1),r=e.r||55;const col=e.color||'#ffcb8e';
 if(['hit','guard-hit','guardbreak'].includes(e.kind)){
  ctx.globalCompositeOperation='screen';ctx.shadowColor=col;ctx.shadowBlur=21;

  const x=e.x,y=e.y-105;for(let i=0;i<14;i++){const a=i*6.283/14+t*.2;ctx.strokeStyle=i%2?'#fff2c6':col;ctx.lineWidth=i%3===0?6:3;ctx.beginPath();
      ctx.moveTo(x+Math.cos(a)*18,y+Math.sin(a)*18);ctx.lineTo(x+Math.cos(a)*((1-phase)*90+32),y+Math.sin(a)*((1-phase)*80+32));ctx.stroke();}
  if(e.kind==='guardbreak'){stroked('GUARD BREAK!',x,y-78,'900 23px Georgia','#fff2b9','#aa392e',6);}
  if(e.kind==='guard-hit'){stroked('BLOCK',x,y-60,'900 18px Georgia','#ccf4ff','#185683',5);}
  stroked('-'+e.dmg,x+12,y-42-(1-phase)*35,'900 27px Georgia','#fff0bb','#812b24',6);
 }else{
  const x=e.x,y=e.y;
  if(['slash','finisher'].includes(e.kind)){
    const angle=e.kind==='finisher'?-.65:-.36;
    ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=phase;
    const grad=ctx.createLinearGradient(-r,0,r,0);grad.addColorStop(0,'#ffffff00');grad.addColorStop(.4,'#fff4cb');grad.addColorStop(1,col);
    ctx.strokeStyle=grad;ctx.lineWidth=e.kind==='finisher'?26:15;ctx.lineCap='round';
    ctx.beginPath();ctx.arc(0,0,r*.9,Math.PI*.9,Math.PI*1.9);ctx.stroke();
    ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();
    for(let j=0;j<9;j++){const a=j*2.4;ctx.fillStyle=j%2?'#fff4c9':col;ctx.fillRect(Math.cos(a)*r*.8,Math.sin(a)*r*.8,5,5);}
    ctx.restore();return;
  }
  // Elemental glyphs are tied to server events; visual only.
  if(['fireburst','dragon','fire-dash','blizzard','freeze','icebloom','blade-storm','celestial','starlight'].includes(e.kind)){
   ctx.save();ctx.translate(x,y);ctx.rotate((1-phase)*1.5);ctx.strokeStyle=col;ctx.globalAlpha=phase*.72;ctx.lineWidth=3;
   for(let j=0;j<3;j++){ctx.rotate(Math.PI/3);ctx.beginPath();ctx.arc(0,0,r*(.6+j*.18),Math.PI/5,Math.PI*1.7);ctx.stroke();}
   for(let j=0;j<8;j++){const a=j*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.7,Math.sin(a)*r*.7);ctx.lineTo(Math.cos(a)*r*1.1,Math.sin(a)*r*1.1);ctx.stroke();}
   ctx.restore();
  }
const light=ctx.createRadialGradient(x,y,0,x,y,r);light.addColorStop(0,col+'99');light.addColorStop(.45,col+'44');light.addColorStop(1,col+'00');ctx.fillStyle=light;ctx.beginPath();ctx.arc(x,y,r,0,6.283);ctx.fill();
  ctx.strokeStyle=col;ctx.lineWidth=e.kind==='cast'?3:6;ctx.globalAlpha=phase*.83;ctx.beginPath();ctx.ellipse(x,y,r*(1.55-phase*.25),r*(1.45-phase*.15),0,0,6.283);ctx.stroke();
  for(let i=0;i<12;i++){const a=(i/12)*Math.PI*2+(1-phase)*.8;let xx=x+Math.cos(a)*r*(.6+.25*(1-phase)),yy=y+Math.sin(a)*r*(.6+.25*(1-phase));fillRect(xx-3,yy-3,6,6,i%2?'#fff1cf':col);}
 }
 ctx.restore();
}
function drawOrb(p,t){
 const r=p.r||18;ctx.save();ctx.translate(p.x,p.y);ctx.globalCompositeOperation='screen';
 const flame=p.kind==='fire'||p.kind==='dragon',ice=p.kind==='ice';
 const col=p.color||'#ffba7c';for(let i=0;i<5;i++){
  const a=t*8+i*Math.PI*2/5;ctx.globalAlpha=.25;ctx.fillStyle=col;ctx.beginPath();ctx.arc(-p.vx/Math.abs(p.vx||1)*(i*9+8),Math.sin(a)*8,r*.8,0,Math.PI*2);ctx.fill();
 }
 ctx.globalAlpha=1;ctx.shadowColor=col;ctx.shadowBlur=26;ctx.fillStyle=col;ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();ctx.fillStyle='#fff7de';ctx.beginPath();ctx.arc(0,0,r*.53,0,7);ctx.fill();ctx.shadowBlur=0;
 if(ice){ctx.strokeStyle='#eafaff';for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*r*1.5,Math.sin(a)*r*1.5);ctx.stroke();}}
 if(flame){ctx.fillStyle='#ff6c25';for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-r,-r/2+i*8);ctx.lineTo(-r-20,3+i*8);ctx.lineTo(-r,6+i*8);ctx.fill();}}
 if(p.kind==='sword'){ctx.rotate(Math.atan2(p.vy||0,p.vx||1));ctx.fillStyle='#fff2f8';ctx.beginPath();ctx.moveTo(r*2.1,0);ctx.lineTo(-r,-r*.4);ctx.lineTo(-r*.7,0);ctx.lineTo(-r,r*.4);ctx.closePath();ctx.fill();ctx.fillStyle='#ed729e';ctx.fillRect(-r*1.1,-4,10,8);}
 if(p.kind==='star'){ctx.fillStyle='#fff6b3';ctx.beginPath();for(let i=0;i<12;i++){const a=i*Math.PI/6+t*.4,rr=i%2?r*.5:r*1.65;if(!i)ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);else ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();ctx.fill();}
 if(p.kind==='wave'){ctx.strokeStyle='#ddfcff';ctx.lineWidth=6;for(let j=0;j<3;j++){ctx.beginPath();ctx.arc(0,0,r*(.8+j*.35),-1.3,1.3);ctx.stroke();}}
 ctx.restore();
}
function v6Diamond(x,y,s,color='#e9c18b'){ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.fillStyle='#26192d';ctx.fillRect(-s/2-2,-s/2-2,s+4,s+4);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(-s/2,-s/2,s,s);ctx.restore();}
function heroHudPortrait(p,x,y,right=false){
 const im=heroImages[p.hero];ctx.save();ctx.translate(x,y);
 ctx.beginPath();ctx.moveTo(17,0);ctx.lineTo(102,0);ctx.lineTo(119,20);ctx.lineTo(119,98);ctx.lineTo(100,118);ctx.lineTo(19,118);ctx.lineTo(0,99);ctx.lineTo(0,20);ctx.closePath();ctx.fillStyle='#1b1625';ctx.fill();ctx.strokeStyle='#eac17b';ctx.lineWidth=7;ctx.stroke();ctx.strokeStyle='#653d3e';ctx.lineWidth=2;ctx.stroke();
 ctx.save();ctx.beginPath();ctx.moveTo(20,8);ctx.lineTo(98,8);ctx.lineTo(111,22);ctx.lineTo(111,96);ctx.lineTo(98,109);ctx.lineTo(20,109);ctx.lineTo(7,96);ctx.lineTo(7,22);ctx.closePath();ctx.clip();if(im?.naturalWidth)ctx.drawImage(im,0,0,118,118);else fillRect(5,5,107,107,heroTint(p.hero));ctx.restore();
 ctx.fillStyle=heroTint(p.hero);ctx.shadowColor=heroTint(p.hero);ctx.shadowBlur=12;ctx.beginPath();ctx.arc(right?104:15,11,7,0,7);ctx.fill();ctx.shadowBlur=0;
 ctx.restore();
}
function fighterHud(p,side){
 if(!p)return;const c=heroInfo[p.hero],right=side==='right';
 const portraitX=right?1151:10,bx=right?735:137,bw=408;
 heroHudPortrait(p,portraitX,12,right);
 ctx.save();ctx.beginPath();if(!right){ctx.moveTo(bx,23);ctx.lineTo(bx+bw-21,23);ctx.lineTo(bx+bw,42);ctx.lineTo(bx+bw-20,106);ctx.lineTo(bx,106);}else{ctx.moveTo(bx+21,23);ctx.lineTo(bx+bw,23);ctx.lineTo(bx+bw,106);ctx.lineTo(bx+20,106);ctx.lineTo(bx,42);}ctx.closePath();
 const bg=ctx.createLinearGradient(0,17,0,111);bg.addColorStop(0,'#4c2b37f7');bg.addColorStop(.45,'#251d31f8');bg.addColorStop(1,'#151828f8');ctx.fillStyle=bg;ctx.fill();ctx.strokeStyle='#f5d99c';ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle='#7d4a38';ctx.lineWidth=2;ctx.stroke();ctx.restore();
 const tx=right?bx+bw-18:bx+18;stroked(c.name+' · '+p.name,tx,44,'900 17px sans-serif','#fff1d0','#281b2d',3,right?'right':'left');
 const hpx=bx+12,barW=bw-30,frac=clamp(p.hp/c.hp,0,1),mana=clamp(p.mana/c.mana,0,1);
 fillRect(hpx,52,barW,26,'#0d1921');const hG=ctx.createLinearGradient(0,52,0,77);hG.addColorStop(0,'#e0ff87');hG.addColorStop(.2,'#89f258');hG.addColorStop(.7,'#34ad54');hG.addColorStop(1,'#1b7742');
 let hlen=barW*frac;fillRect(right?hpx+barW-hlen:hpx,54,hlen,21,hG);fillRect(hpx,52,barW,2,'#fff4b6');ctx.strokeStyle='#a6a084';ctx.strokeRect(hpx,52,barW,26);
 for(let i=1;i<12;i++)fillRect(hpx+barW*i/12,55,1,20,'#12301c44');
 fillRect(hpx,84,barW,11,'#131c34');const mg=ctx.createLinearGradient(0,83,0,96);mg.addColorStop(0,'#edfbff');mg.addColorStop(.42,'#8beaff');mg.addColorStop(1,'#3d81d1');let ml=barW*mana;fillRect(right?hpx+barW-ml:hpx,85,ml,9,mg);ctx.strokeStyle='#87b6cb';ctx.strokeRect(hpx,83,barW,13);
 for(let i=0;i<3;i++)v6Diamond(right?bx+bw-27-i*17:bx+25+i*17,105,9,i<(p.roundWins||0)?'#ffe89e':'#6b5967');
 stroked('MP',right?bx-14:bx+bw+14,94,'900 12px Georgia','#d8f8ff','#143954',3,right?'right':'left');
}
function drawTopHud(){
 if(!snap)return;const players=snap.players;const left=room?.mode==='teams'?players.find(p=>p.team===1):players[0];const right=room?.mode==='teams'?players.find(p=>p.team===2):players[1];
 if(left)fighterHud(left,'left');if(right)fighterHud(right,'right');
 const x=640,y=66;ctx.save();ctx.shadowColor='#f7a86377';ctx.shadowBlur=19;ctx.beginPath();ctx.moveTo(x-53,y-42);ctx.lineTo(x-27,y-57);ctx.lineTo(x+27,y-57);ctx.lineTo(x+53,y-42);ctx.lineTo(x+66,y);ctx.lineTo(x+48,y+50);ctx.lineTo(x+26,y+63);ctx.lineTo(x-26,y+63);ctx.lineTo(x-48,y+50);ctx.lineTo(x-66,y);ctx.closePath();ctx.fillStyle='#241a2d';ctx.fill();ctx.strokeStyle='#fce1a0';ctx.lineWidth=7;ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='#8e4b35';ctx.lineWidth=3;ctx.stroke();ctx.restore();
 stroked('TIME',640,34,'900 12px Georgia','#ffe5a3','#4e2633',3);
 stroked(String(snap.time).padStart(2,'0'),640,88,'italic 900 56px Georgia',snap.time<=15?'#ffa38c':'#fff1bc','#712d2b',6);
 stroked('⚜ FAIRY TAIL · MAGIC ARENA ⚜',640,12,'900 15px Georgia','#ffe3ae','#552834',4);
 if(players.length>=3){const extra=players.slice(2);extra.forEach((p,i)=>{const px=640+(i-(extra.length-1)/2)*204,py=168,c=heroInfo[p.hero];
  fillRect(px-90,py-21,180,43,'#201627e8');ctx.strokeStyle=heroTint(p.hero);ctx.lineWidth=2;ctx.strokeRect(px-90,py-21,180,43);
  stroked(p.name,px,py-3,'900 14px sans-serif','#fff5e2','#221320',3);fillRect(px-81,py+8,162,7,'#0d1222');fillRect(px-81,py+8,162*clamp(p.hp/c.hp,0,1),7,'#8bdb74');
 });}
}
function drawCountdown(t){const elapsed=t-battleStarted;if(elapsed<0||elapsed>2.45)return;ctx.save();ctx.globalAlpha=clamp((2.45-elapsed)/.8,0,1);stroked('FIGHT!',640,355,'italic 900 142px Georgia','#fff1a2','#af301f',16);stroked('THE MAGIC BATTLE BEGINS',640,391,'900 21px Georgia','#fff3c3','#682924',4);ctx.restore();}
function draw(t){animTime=t;
 if(view==='battle'&&performance.now()<screenHitstopUntil){requestAnimationFrame(q=>draw(q/1000));return;}
 if(comboUntil&&performance.now()>comboUntil){$('comboBanner').classList.add('hidden');comboUntil=0;}
 if(lastCombatUntil>performance.now()){
   const e=$('combatLabel');e.textContent=lastCombatText;e.classList.remove('hidden');
 }else $('combatLabel').classList.add('hidden');
 if(roundBannerUntil>performance.now()){$('roundBanner').textContent=roundBannerText;$('roundBanner').classList.remove('hidden');}
 else $('roundBanner').classList.add('hidden');

 if(view==='battle'){
  const dt=Math.min(.08,Math.max(0,t-lastRenderedAt));lastRenderedAt=t;
  ctx.clearRect(0,0,1280,720);ctx.save();
  if(snap)updateCamera(t,dt);
  if(cameraShake>.14){ctx.translate(Math.sin(t*94)*cameraShake,Math.cos(t*71)*cameraShake*.55);cameraShake*=.84;}
  ctx.translate(-Math.round(cameraX),-Math.round(cameraY));
  drawStage(t);
  if(snap){
   drawFields(t);drawPickups(t);
   for(const e of snap.effects||[])drawImpact(e,t);
   for(const pr of snap.projectiles||[])drawOrb(pr,t);
   for(const p of [...snap.players].sort((a,b)=>a.y-b.y))drawFighter(p,t);
   v6DrawSparks(t,dt);ctx.restore();
   if(stageFlash>.01){fillRect(0,0,1280,720,`rgba(255,233,198,${stageFlash*.28})`);stageFlash*=.80;}
   drawTopHud();drawMiniMap();
   if(snap.status==='playing'&&snap.players.find(p=>p.id===myId)?.alive===false){fillRect(0,260,1280,210,'#160d1aa8');stroked('KNOCK OUT',640,365,'900 75px Georgia','#ffe1b9','#682b2a',10);}
  }else{ctx.restore();stroked('마법사 소환 중...',640,370,'900 32px Georgia');}
  drawCountdown(t);
 }

 requestAnimationFrame(q=>draw(q/1000));
}
// Audio adapter; licensed tracks/voices can be inserted without rebuilding the client.
let audioContext=null,music=null,voices=[],audioUnlocked=false;
const audioPath='/assets/audio/';
function unlock(){audioUnlocked=true;try{audioContext||=new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();}catch{}}
function setMusicVolume(){if(music)music.volume=(+$('musicVol').value)/100;}
function startMusic(){
 stopMusic();if(!audioUnlocked)return;
 // Use licensed FAIRY TAIL main-theme file if the owner adds one; otherwise play the original placeholder.
 const fallback=audioPath+'guild-battle-original.ogg';
 const preferred=audioPath+'battle-theme.mp3';
 music=new Audio(preferred);music.loop=true;music.volume=(+$('musicVol').value)/100;
 music.addEventListener('error',()=>{if(!music||music.src.endsWith('guild-battle-original.ogg'))return;
   const replacement=new Audio(fallback);replacement.loop=true;replacement.volume=(+$('musicVol').value)/100;music=replacement;replacement.play().catch(()=>{});
 },{once:true});
 music.play().catch(()=>{});
}
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
function sendMovement(){if(view!=='battle'||!room||room.status!=='playing')return;send({type:'input',keys:input,aim:mouseAim,seq:++inputSeq});}
function bind(){
 try{$('name').value=localStorage.getItem('magic_arena_name')||'';}catch{}
 document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('selected',x.dataset.mode===mode));}));
 $('create').addEventListener('click',()=>{unlock();send({type:'create',name:readName(),hero,mode});});
 $('practice')?.addEventListener('click',()=>{unlock();send({type:'aiBattle',name:readName(),hero,opponent,difficulty});});
 document.querySelectorAll('[data-difficulty]').forEach(b=>b.addEventListener('click',()=>{
   difficulty=b.dataset.difficulty;document.querySelectorAll('[data-difficulty]').forEach(x=>x.classList.toggle('selected',x.dataset.difficulty===difficulty));
   try{localStorage.setItem('magic_arena_difficulty',difficulty);}catch{}
 }));
 $('aiOpponent').addEventListener('change',e=>{opponent=e.target.value;try{localStorage.setItem('magic_arena_opponent',opponent);}catch{}});
 try{const d=localStorage.getItem('magic_arena_difficulty'),o=localStorage.getItem('magic_arena_opponent');
   if(['novice','normal','master'].includes(d)){difficulty=d;document.querySelectorAll('[data-difficulty]').forEach(x=>x.classList.toggle('selected',x.dataset.difficulty===d));}
   if(heroInfo[o]){opponent=o;$('aiOpponent').value=o;}}
 catch{}
 $('goSelect')?.addEventListener('click',()=>$('characterSection').scrollIntoView({behavior:'smooth',block:'start'}));
 $('goAi')?.addEventListener('click',()=>$('aiConfig').scrollIntoView({behavior:'smooth',block:'center'}));
 $('goHow')?.addEventListener('click',()=>toast('조작: A/D 이동 · W/SPACE 점프 · S 방어 · SHIFT 대시 · J 공격 · Q/E/R 마법 · F 필살기'));

 $('join').addEventListener('click',()=>{unlock();const code=$('joincode').value.trim().toUpperCase();if(!/^[0-9A-F]{6}$/.test(code)){toast('6자리 방 코드를 입력하세요.');return;}send({type:'join',code,name:readName(),hero});});
 $('joincode').addEventListener('keydown',e=>{if(e.key==='Enter')$('join').click();});
 $('copyLink').addEventListener('click',invite);
 $('leaveLobby').addEventListener('click',quit);$('leaveBattle').addEventListener('click',()=>{if(confirm('진행 중인 대전을 나가시겠습니까?'))quit();});
 $('start').addEventListener('click',()=>{unlock();send({type:'start'});});$('switchTeam').addEventListener('click',()=>{const p=room?.players.find(x=>x.id===myId);if(p)send({type:'team',team:p.team===1?2:1});});
 $('again').addEventListener('click',()=>send({type:'again'}));$('exitResult').addEventListener('click',quit);
 $('chatinput').addEventListener('keydown',e=>{if(e.key==='Enter'){chat();e.preventDefault();}});$('sendchat').addEventListener('click',chat);
 $('settingsButton').addEventListener('click',()=>$('settings').classList.toggle('hidden'));$('closeSettings').addEventListener('click',()=>$('settings').classList.add('hidden'));
 $('musicVol').addEventListener('input',setMusicVolume);
 const swapStage=val=>{stageImage.src=val==='classic'?'/assets/stages/magnolia_v5_pixel.webp':'/assets/stages/magnolia_v5_world.webp';};
 $('stageMode').addEventListener('change',e=>{swapStage(e.target.value);try{localStorage.setItem('magic_arena_stage',e.target.value)}catch{}});
 try{const saved=localStorage.getItem('magic_arena_stage');if(saved==='classic'){$('stageMode').value=saved;swapStage(saved);}}catch{}
 $('fullscreenBtn').addEventListener('click',()=>{const area=document.querySelector('.battlecanvas');if(!document.fullscreenElement){area.requestFullscreen?.().catch(()=>toast('전체 화면을 사용할 수 없는 환경입니다.'));}else document.exitFullscreen?.();});

 const dir={w:'up',arrowup:'up',' ':'up',s:'down',arrowdown:'down',a:'left',arrowleft:'left',d:'right',arrowright:'right',shift:'dash'};
 window.addEventListener('keydown',e=>{
  if(document.activeElement?.tagName==='INPUT'||document.activeElement?.tagName==='SELECT')return;
  if(view!=='battle')return;
  const key=e.key.toLowerCase();if(dir[key]){e.preventDefault();input[dir[key]]=true;}const slot={j:0,q:1,e:2,r:3,f:4}[key];
  if(slot!==undefined&&!e.repeat){e.preventDefault();unlock();send({type:'action',slot});}
  if(key==='enter'){$('chatinput').focus();e.preventDefault();}
 });
 window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(dir[k])input[dir[k]]=false;});
 window.addEventListener('blur',()=>{input={up:false,down:false,left:false,right:false,dash:false};});
 canvas.addEventListener('pointermove',e=>{const p=snap?.players?.find(x=>x.id===myId);if(!p)return;const r=canvas.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*1280+cameraX,y=(e.clientY-r.top)/r.height*720+cameraY;mouseAim=Math.atan2(y-p.y,x-p.x);});
 canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button===0){unlock();send({type:'action',slot:0});}});
 document.querySelectorAll('[data-dir]').forEach(b=>{const set=v=>{input[b.dataset.dir]=v;b.style.background=v?'#3c7798cc':'#122d4bba';};b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);set(true);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>set(false));});
 document.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();unlock();send({type:'action',slot:Number(b.dataset.act)});}));
 setInterval(sendMovement,50);
 setInterval(()=>{if(connected&&ws?.readyState===WebSocket.OPEN)send({type:'ping',sent:performance.now()});},2200);
}
renderCards();bind();connect();requestAnimationFrame(t=>draw(t/1000));
})();
