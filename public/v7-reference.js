/* FAIRY TAIL MAGIC ARENA V7 — Reference Edition
 * Precisely cropped image materials from the screenshot supplied by the user.
 * All game actions proxy to the existing authoritative websocket gameplay.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const shell=$('v7Shell'),overview=$('v7Overview'),select=$('v7Select'),lobby=$('v7Lobby');
if(!shell)return;
let choice='online',hero='natsu',mode='duel',difficulty='normal',opp='gray';
const heroes={
 natsu:['나츠 드래그닐','FIRE DRAGON SLAYER','화룡의 철권 · 화염 돌진 · 용왕의 일격'],
 lucy:['루시 하트필리아','CELESTIAL SPIRIT MAGE','성령 소환 · 아쿠에리아스 · 별빛 마법'],
 erza:['엘자 스칼렛','TITANIA · REQUIP','환장 마법 · 천륜의 검 · 검격 연계'],
 gray:['그레이 풀버스터','ICE-MAKE WIZARD','얼음 조형 · 빙결진 · 절대영도']
};
let popupTimer;
function toast(msg){const e=$('v7ShellToast');e.textContent=msg;e.classList.remove('hidden');clearTimeout(popupTimer);popupTimer=setTimeout(()=>e.classList.add('hidden'),2600);}
function screen(target){
 for(const [key,el] of [['overview',overview],['select',select],['lobby',lobby]])el.classList.toggle('hidden',key!==target);
 shell.classList.remove('hidden');document.body.classList.remove('v7-inbattle');shell.scrollTo(0,0);
}
function pick(next){
 if(!heroes[next])return;hero=next;
 document.querySelector('#heroCards [data-hero="'+next+'"]')?.click();
 document.querySelectorAll('.v7-hero').forEach(el=>el.classList.toggle('selected',el.dataset.v7Pick===next));
 $('v7HeroName').textContent=heroes[next][0];$('v7HeroRole').textContent=heroes[next][1];$('v7HeroDesc').textContent=heroes[next][2];
}
function selectMode(next){mode=next;document.querySelector('#home [data-mode="'+next+'"]')?.click();document.querySelectorAll('[data-v7-mode]').forEach(b=>b.classList.toggle('active',b.dataset.v7Mode===next));}
function selectDifficulty(next){difficulty=next;document.querySelector('#home [data-difficulty="'+next+'"]')?.click();document.querySelectorAll('[data-v7-level]').forEach(b=>b.classList.toggle('active',b.dataset.v7Level===next));}
function action(next){
 choice=next==='training'?'ai':next==='ai'?'ai':'online';
 if(next==='settings'){$('v7Settings').classList.remove('hidden');return;}
 if(next==='roster'||next==='online'||next==='ai'||next==='training'){
  $('v7ModeBadge').textContent=choice==='ai'?'✦ AI ARENA':'⚔ ONLINE BATTLE';
  $('v7OnlineOnly').classList.toggle('hidden',choice==='ai');$('v7AIOnly').classList.toggle('hidden',choice!=='ai');
  $('v7Launch').innerHTML=choice==='ai'?'✦ AI 아레나 도전하기 <span>❯</span>':'⚔ 온라인 방 만들기 <span>❯</span>';
  $('v7JoinCode').parentElement.parentElement.classList.toggle('hidden',choice==='ai');
  if(next==='training'){selectDifficulty('novice');}
  screen('select');return;
 }
}
function syncInputs(){
 $('name').value=$('v7Nick').value.trim().slice(0,16)||'마도사';
 if(choice==='ai'){
  const a=$('aiOpponent');a.value=opp;a.dispatchEvent(new Event('change',{bubbles:true}));
  selectDifficulty(difficulty);
 }else selectMode(mode);
 pick(hero);
}
function updateLobby(){
 $('v7RoomCode').textContent=$('roomcode').textContent;
 $('v7RoomMode').textContent=$('lobbymode').textContent;
 $('v7Start').disabled=$('start').disabled||$('start').classList.contains('hidden');
 $('v7Start').classList.toggle('hidden',$('start').classList.contains('hidden'));
 $('v7TeamSwitch').classList.toggle('hidden',$('switchTeam').classList.contains('hidden'));
 const cards=Array.from(document.querySelectorAll('#roomplayers .playercard'));
 const red=$('v7RedPlayers'),blue=$('v7BluePlayers');red.replaceChildren();blue.replaceChildren();
 cards.forEach((el,i)=>{
  const row=document.createElement('div');row.className='v7-player'+(el.classList.contains('empty')?' empty':'');
  const img=el.querySelector('img'),who=el.querySelector('strong'),team=el.querySelector('.teamtag');
  if(img){const pic=img.cloneNode();pic.removeAttribute('id');row.append(pic);}
  const copy=document.createElement('div');const strong=document.createElement('strong');strong.textContent=who?.textContent||'참가 대기 중';copy.append(strong);
  const note=document.createElement('small');note.textContent=team?.textContent||'친구를 기다리는 중';copy.append(note);
  const originalSelect=el.querySelector('select.pickHero');if(originalSelect){const v=originalSelect.cloneNode(true);v.style.maxWidth='100%';v.style.marginTop='4px';v.setAttribute('aria-label','현재 캐릭터 교체');v.addEventListener('change',()=>{originalSelect.value=v.value;originalSelect.dispatchEvent(new Event('change',{bubbles:true}));});copy.append(v);}
  row.append(copy);const isBlue=team?.classList.contains('t2')||(cards.length===2&&i===1)||(cards.length===3&&i===1);(isBlue?blue:red).append(row);
 });
}
function synchronizeView(){
 const battleVisible=!$('battle').classList.contains('hidden');
 const lobbyVisible=!$('lobby').classList.contains('hidden');
 if(battleVisible){shell.classList.add('hidden');document.body.classList.add('v7-inbattle');return;}
 if(lobbyVisible){screen('lobby');updateLobby();return;}
 if(!shell.classList.contains('hidden'))return;
 screen('overview');
}
// Interactions are real buttons; screenshot-derived art is never the gameplay simulation.
document.querySelectorAll('[data-v7-action]').forEach(b=>b.addEventListener('click',()=>action(b.dataset.v7Action)));
document.querySelectorAll('[data-v7-hero]').forEach(b=>b.addEventListener('click',()=>{pick(b.dataset.v7Hero);action('roster');}));
document.querySelectorAll('[data-v7-pick]').forEach(b=>b.addEventListener('click',()=>pick(b.dataset.v7Pick)));
document.querySelectorAll('[data-v7-mode]').forEach(b=>b.addEventListener('click',()=>selectMode(b.dataset.v7Mode)));
document.querySelectorAll('[data-v7-level]').forEach(b=>b.addEventListener('click',()=>selectDifficulty(b.dataset.v7Level)));
$('v7Back').addEventListener('click',()=>screen('overview'));
$('v7SettingsClose').addEventListener('click',()=>$('v7Settings').classList.add('hidden'));
for(const [v,n] of [['v7MusicVol','musicVol'],['v7SfxVol','sfxVol'],['v7VoiceVol','voiceVol']]){
 const slider=$(v),base=$(n);slider.value=base.value;slider.addEventListener('input',()=>{base.value=slider.value;base.dispatchEvent(new Event('input',{bubbles:true}));});
}
$('v7BattleFullscreen').addEventListener('click',()=>$('fullscreenBtn').click());
$('v7BattleExit').addEventListener('click',()=>$('leaveBattle').click());
$('v7Nick').addEventListener('input',()=>{$('name').value=$('v7Nick').value;});
$('v7AiOpponent').addEventListener('change',e=>{opp=e.target.value;});
$('v7Launch').addEventListener('click',()=>{syncInputs();if(choice==='ai'){$('practice').click();toast('AI 아레나에 접속하고 있어...');}else{$('create').click();toast('온라인 전투방을 만들고 있어...');}});
$('v7Join').addEventListener('click',()=>{choice='online';syncInputs();$('joincode').value=$('v7JoinCode').value.trim().toUpperCase();$('join').click();});
$('v7JoinCode').addEventListener('keydown',e=>{if(e.key==='Enter')$('v7Join').click();});
$('v7LeaveLobby').addEventListener('click',()=>$('leaveLobby').click());
$('v7Start').addEventListener('click',()=>$('start').click());
$('v7TeamSwitch').addEventListener('click',()=>$('switchTeam').click());
$('v7CopyLink').addEventListener('click',()=>{const url=location.origin+location.pathname+'?room='+$('roomcode').textContent;navigator.clipboard?.writeText(url).then(()=>toast('초대 링크를 복사했어!')).catch(()=>toast('주소창에서 초대 링크를 복사해줘.'));});
new MutationObserver(synchronizeView).observe($('battle'),{attributes:true,attributeFilter:['class']});
new MutationObserver(synchronizeView).observe($('lobby'),{attributes:true,attributeFilter:['class']});
new MutationObserver(updateLobby).observe($('roomplayers'),{childList:true,subtree:true});
new MutationObserver(()=>{const txt=$('net').textContent;$('v7Net').innerHTML=txt.includes('연결됨')?'<i class="v7-netdot"></i> 온라인 연결됨':'<span style="color:#ffb9aa">● '+txt+'</span>';}).observe($('net'),{childList:true,subtree:true});
// Prepopulate new UI using previous game settings, preserving invite-url flow.
$('v7Nick').value=$('name').value||'';
const invited=new URLSearchParams(location.search).get('room');if(invited&&/^[a-f0-9]{6}$/i.test(invited)){$('v7JoinCode').value=invited.toUpperCase();action('online');toast('초대 링크가 확인됐어. 닉네임을 입력하고 입장해줘.');}
pick('natsu');selectMode('duel');
})();
