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
let input={up:false,down:false,left:false,right:false,dash:false};
const canvas=$('arena'),ctx=canvas.getContext('2d');
const colors={team1:'#ff907c',team2:'#83b8ff',team3:'#e7adf9'};
function renderCards(){ $('heroCards').innerHTML=Object.entries(heroInfo).map(([id,h])=>`<button class="hero-card ${id===hero?'selected':''}" data-hero="${id}" style="--hero:${h.color}"><span class="sel">${id===hero?'◆ SELECTED':'CHOOSE'}</span><div class="portrait-wrap"><img class="charart" alt="${h.name} 애니메이션 스타일 얼굴 초상화" src="/assets/portraits/${id}.webp"><img class="preview-sprite" src="/assets/sprites/${id}_idle1.png" alt=""></div><div class="charinfo"><h4>${h.name}</h4><span class="role">${h.role}</span><p>${h.desc}</p></div></button>`).join('');
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
 $('roomName').textContent='#'+room.code;$('battleMode').textContent=modeInfo[room.mode];battleStarted=performance.now()/1000;recentCasts.clear();renderSkills();addChat('SYSTEM','대전 시작! 상대를 쓰러뜨리세요.');startMusic();return;}
 if(m.type==='snapshot'){snap=m;if(room)room.status=m.status;refreshHUD();return;}
 if(m.type==='chat'){addChat(m.name,m.text);return;}
 if(m.type==='notice'){addChat('SYSTEM',m.message);return;}
 if(m.type==='cast'){recentCasts.set(m.player,{at:performance.now()/1000,slot:m.slot});playCast(m);return;}
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
 return `<div class="playercard"><img src="/assets/portraits/${p.hero}.webp" alt="${heroInfo[p.hero]?.name||''}"><strong style="font-size:13px">${escapeHTML(p.name)} ${self?'(나)':''}</strong>${opt}<span class="teamtag ${p.team===2?'t2':''}">${room.mode==='teams'?(p.team===1?'RED TEAM':'BLUE TEAM'):'PLAYER '+(i+1)}</span>${i===0?'<span style="font-size:10px;color:#ffda9f">👑 방장</span>':''}</div>`;
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
 const c=heroInfo[p.hero];$('myPortrait').src='/assets/portraits/'+p.hero+'.webp';$('myName').textContent=c.name+' · '+p.name;$('myState').textContent=room?.mode==='teams'?(p.team===1?'RED TEAM':'BLUE TEAM'):'개인전';
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
// Pixel-art arcade rendering. Combat state remains server authoritative.
const heroImages={}; const sprites={};const recentCasts=new Map();const lastMove=new Map();
const stageImage=new Image();stageImage.src='/assets/stages/magnolia.png';
const spritePoses=['idle1','idle2','run1','run2','attack','cast','jump','hurt','victory'];
for(const id of Object.keys(heroInfo)){
  heroImages[id]=new Image();heroImages[id].src='/assets/portraits/'+id+'.webp';
  sprites[id]={};for(const pose of spritePoses){const im=new Image();im.src='/assets/sprites/'+id+'_'+pose+'.png';sprites[id][pose]=im;}
}
const uiColors={red:'#da655b',blue:'#75beee',gold:'#ffdda0',purple:'#cf85df'};
let battleStarted=0,shakeUntil=0;
function clamp(x,min,max){return Math.min(max,Math.max(min,x));}
function fillRect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function goldFrame(x,y,w,h){ctx.strokeStyle='#7b4333';ctx.lineWidth=6;ctx.strokeRect(x,y,w,h);ctx.strokeStyle='#ebbf78';ctx.lineWidth=2;ctx.strokeRect(x+3,y+3,w-6,h-6);}
function stroked(text,x,y,font,color='#fff4df',stroke='#2a1322',weight=4,align='center'){
 ctx.save();ctx.textAlign=align;ctx.font=font;ctx.lineWidth=weight;ctx.strokeStyle=stroke;ctx.lineJoin='round';ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);ctx.restore();
}
function drawStage(t){
 ctx.imageSmoothingEnabled=false;
 if(stageImage.complete&&stageImage.naturalWidth)ctx.drawImage(stageImage,0,0,1280,720);
 else{const g=ctx.createLinearGradient(0,0,0,720);g.addColorStop(0,'#6684b8');g.addColorStop(1,'#8e665b');fillRect(0,0,1280,720,g);}
 // Warm shafts of sunlight and slowly drifting magic dust.
 ctx.save();ctx.globalCompositeOperation='screen';
 const sunlight=ctx.createLinearGradient(0,80,0,600);sunlight.addColorStop(0,'#ffe2a621');sunlight.addColorStop(1,'#ffefc800');
 ctx.fillStyle=sunlight;ctx.beginPath();ctx.moveTo(840,0);ctx.lineTo(1070,0);ctx.lineTo(720,590);ctx.lineTo(540,590);ctx.fill();
 for(let i=0;i<40;i++){
  const x=((i*107.9+t*(i%3+1)*7)%1300),y=((i*73.3+Math.sin(t+i)*9)%640)+10;
  ctx.fillStyle=i%3===0?'#fff4ce99':'#ffd99e55';ctx.fillRect(Math.floor(x),Math.floor(y),i%5===0?3:2,2);
 }
 ctx.restore();
 // Ground-contact line to visually tie sprites into cobblestones.
 fillRect(0,611,1280,2,'#1d243018');
 // Soft dark foreground vignette; no generic gridlines.
 const vign=ctx.createRadialGradient(640,320,100,640,360,790);vign.addColorStop(0,'#17131e00');vign.addColorStop(1,'#160e24a1');fillRect(0,0,1280,720,vign);
}
function heroTint(id){return heroInfo[id]?.color||'#e8c994';}
function drawFighter(p,t){
 const mine=p.id===myId,c=heroInfo[p.hero];if(!c)return;
 const cast=recentCasts.get(p.id);const elapsed=cast?t-cast.at:999;
 let pose='idle1';if(!p.onGround)pose='jump';else if(elapsed<.31)pose=cast.slot===0?'attack':'cast';else if(p.attackPose>.12)pose=p.animation||'attack';else if(p.moving)pose=Math.floor(t*9)%2?'run1':'run2';else pose=Math.floor(t*2)%2?'idle1':'idle2';
 if(!p.alive)pose='hurt';
 const {x,y}=p;
 ctx.save();
 // Landing shadows and element-coloured magic ring.
 ctx.fillStyle='#160e1f7c';ctx.beginPath();ctx.ellipse(x,602,63,15,0,0,Math.PI*2);ctx.fill();
 if(mine){ctx.strokeStyle='#f7df9e';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(x,601,69,19,0,0,Math.PI*2);ctx.stroke();}
 if(p.guard){ctx.strokeStyle='#fff1c5cc';ctx.lineWidth=5;ctx.beginPath();ctx.arc(x,y-120,80,p.face===0?-1.35:1.55,p.face===0?1.35:4.75);ctx.stroke();}
 if(p.shield){ctx.strokeStyle='#bceafeaa';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(x,y-120,80,120,0,0,Math.PI*2);ctx.stroke();}
 if(p.slow){fillRect(x-37,y-12,75,6,'#a4f2ffbb');}
 ctx.translate(Math.round(x),Math.round(y));
 if(p.face>Math.PI/2||p.face<-Math.PI/2)ctx.scale(-1,1);
 if(!p.alive)ctx.globalAlpha=.45;
 if(p.guard){ctx.filter='brightness(1.2) saturate(.75)';}
 const im=sprites[p.hero]?.[pose];
 if(im&&im.complete&&im.naturalWidth){ctx.drawImage(im,-99,-260,198,260);}
 else{ctx.fillStyle=c.color;ctx.fillRect(-30,-140,60,135);}
 ctx.restore();
 if(!p.alive){stroked('K.O.',x,y-180,'900 25px Georgia','#fff','#652c37',6);return;}
 // compact individual overhead nameplate, needed for 4-player matches.
 const label=(mine?'◆ ':'')+p.name;
 ctx.save();ctx.font='bold 15px sans-serif';const w=clamp(ctx.measureText(label).width+34,100,210);
 fillRect(x-w/2,y-293,w,22,'#1a1425c9');ctx.strokeStyle=mine?'#f3d082':'#876457';ctx.lineWidth=1;ctx.strokeRect(x-w/2,y-293,w,22);
 stroked(label,x,y-277,'bold 13px sans-serif','#fff5df','#17101a',2);
 fillRect(x-44,y-269,88,7,'#1a1220e0');fillRect(x-43,y-268,86*clamp(p.hp/c.hp,0,1),5,mine?'#ffc575':p.team===1?'#ff7465':'#7ec6ff');
 ctx.restore();
}
function drawImpact(e,t){
 ctx.save();let ttl=Math.max(.05,e.ttl||.2);const phase=clamp(ttl/.55,0,1),r=e.r||55;const col=e.color||'#ffcb8e';
 if(e.kind==='hit'){
  const x=e.x,y=e.y-105;for(let i=0;i<8;i++){const a=i*6.283/8+t*.9;ctx.strokeStyle=i%2?'#fff2c6':col;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*16,y+Math.sin(a)*16);ctx.lineTo(x+Math.cos(a)*41,y+Math.sin(a)*41);ctx.stroke();}
  stroked('-'+e.dmg,x+12,y-42-(1-phase)*35,'900 27px Georgia','#fff0bb','#812b24',6);
 }else{
  const x=e.x,y=e.y;const light=ctx.createRadialGradient(x,y,0,x,y,r);light.addColorStop(0,col+'99');light.addColorStop(.45,col+'44');light.addColorStop(1,col+'00');ctx.fillStyle=light;ctx.beginPath();ctx.arc(x,y,r,0,6.283);ctx.fill();
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
 ctx.restore();
}
function heroHudPortrait(p,x,y,right=false){
 const im=heroImages[p.hero];ctx.save();fillRect(x-2,y-2,112,108,'#261a27');goldFrame(x,y,108,105);
 ctx.beginPath();ctx.rect(x+6,y+6,96,93);ctx.clip();if(im&&im.complete&&im.naturalWidth)ctx.drawImage(im,x+5,y+5,98,95);
 else fillRect(x+4,y+4,99,98,heroTint(p.hero));ctx.restore();
}
function fighterHud(p,side){
 if(!p)return;const c=heroInfo[p.hero],right=side==='right';
 const portraitX=right?1159:18, bx=right?731:138, bw=409;
 heroHudPortrait(p,portraitX,17,right);
 // Ornate dark HUD backing & sweeping tip silhouette.
 const bg=ctx.createLinearGradient(bx,0,bx+bw,0);bg.addColorStop(0,'#321e27ed');bg.addColorStop(1,'#422332df');fillRect(bx,27,bw,66,bg);goldFrame(bx,27,bw,66);
 stroked(c.name.toUpperCase()+'  /  '+p.name,right?bx+bw-15:bx+16,49,'900 18px Georgia','#ffe7b7','#3c2433',3,right?'right':'left');
 const frac=clamp(p.hp/c.hp,0,1),mx=clamp(p.mana/c.mana,0,1);
 fillRect(bx+8,57,bw-16,17,'#180f1d');const hg=ctx.createLinearGradient(0,57,0,74);hg.addColorStop(0,'#ffd379');hg.addColorStop(.55,'#dc694c');hg.addColorStop(1,'#96383d');
 const hw=(bw-20)*frac;fillRect(right?bx+bw-10-hw:bx+10,59,hw,13,hg);
 ctx.strokeStyle='#f8d49d';ctx.lineWidth=1;ctx.strokeRect(bx+8,57,bw-16,17);
 fillRect(bx+8,80,bw-16,7,'#131528');fillRect(right?bx+bw-10-(bw-20)*mx:bx+10,81,(bw-20)*mx,5,'#79d5ff');
}
function drawTopHud(){
 if(!snap)return;const players=snap.players;const topLeft=room?.mode==='teams'?players.find(p=>p.team===1):players[0];const topRight=room?.mode==='teams'?players.find(p=>p.team===2):players[1];
 if(topLeft)fighterHud(topLeft,'left');if(topRight)fighterHud(topRight,'right');
 // central timer medallion
 const x=640,y=70;ctx.save();ctx.beginPath();ctx.moveTo(x-45,y-46);ctx.lineTo(x+45,y-46);ctx.lineTo(x+65,y);ctx.lineTo(x+45,y+48);ctx.lineTo(x-45,y+48);ctx.lineTo(x-65,y);ctx.closePath();ctx.fillStyle='#321d2b';ctx.fill();ctx.strokeStyle='#f4c784';ctx.lineWidth=6;ctx.stroke();ctx.strokeStyle='#874c42';ctx.lineWidth=3;ctx.stroke();ctx.restore();
 stroked(String(snap.time).padStart(2,'0'),640,88,'900 56px Georgia','#fff0b5','#6a332a',6);
 stroked('MAGIC DUEL',640,15,'900 17px Georgia','#ffda9c','#532c2f',4);
 if(players.length>=3){const extra=room?.mode==='teams'?players.slice(2):players.slice(2);extra.forEach((p,i)=>{
  const px=635+(i-(extra.length-1)/2)*190,py=145;const c=heroInfo[p.hero];fillRect(px-75,py-17,150,43,'#231628d9');ctx.strokeStyle=p.team===1?'#d66b65':'#81bee6';ctx.lineWidth=2;ctx.strokeRect(px-75,py-17,150,43);
  stroked(p.name,px,py,'bold 14px sans-serif','#f5e6d5','#1c1422',3);fillRect(px-67,py+8,134*clamp(p.hp/c.hp,0,1),6,p.team===1?'#ea675d':'#77bded');
 });}
}
function drawCountdown(t){const elapsed=t-battleStarted;if(elapsed<0||elapsed>2.45)return;ctx.save();ctx.globalAlpha=clamp((2.45-elapsed)/.8,0,1);stroked('FIGHT!',640,355,'italic 900 123px Georgia','#ffe48d','#8f332d',13);stroked('THE MAGIC BATTLE BEGINS',640,391,'900 21px Georgia','#fff3c3','#682924',4);ctx.restore();}
function draw(t){animTime=t;
 if(view==='battle'){
  ctx.clearRect(0,0,1280,720);drawStage(t);
  if(snap){for(const e of snap.effects||[])drawImpact(e,t);for(const pr of snap.projectiles||[])drawOrb(pr,t);
   for(const p of [...snap.players].sort((a,b)=>a.y-b.y))drawFighter(p,t);
   drawTopHud();if(snap.status==='playing'&&snap.players.find(p=>p.id===myId)?.alive===false){fillRect(0,260,1280,210,'#160d1aa8');stroked('KNOCK OUT',640,365,'900 75px Georgia','#ffe1b9','#682b2a',10);}
  }else{stroked('마법사 소환 중...',640,370,'900 32px Georgia');}
  drawCountdown(t);
 }
 requestAnimationFrame(q=>draw(q/1000));
}
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
 canvas.addEventListener('pointermove',e=>{const p=snap?.players?.find(x=>x.id===myId);if(!p)return;const r=canvas.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*1280,y=(e.clientY-r.top)/r.height*720;mouseAim=Math.atan2(y-p.y,x-p.x);});
 canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button===0){unlock();send({type:'action',slot:0});}});
 document.querySelectorAll('[data-dir]').forEach(b=>{const set=v=>{input[b.dataset.dir]=v;b.style.background=v?'#3c7798cc':'#122d4bba';};b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);set(true);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>set(false));});
 document.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();unlock();send({type:'action',slot:Number(b.dataset.act)});}));
 setInterval(sendMovement,65);
}
renderCards();bind();connect();requestAnimationFrame(t=>draw(t/1000));
})();
