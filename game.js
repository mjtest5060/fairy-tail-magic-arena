'use strict';
const {WORLD,PLATFORMS,PICKUP_SPAWNS,supportAt,clamp:mapClamp}=require('./arena-map');
const WIDTH=WORLD.width, HEIGHT=WORLD.height, FLOOR=WORLD.floor, GRAVITY=WORLD.gravity;
const MODES = { duel: 2, chaos: 3, teams: 4 };
const DIFFICULTIES = Object.freeze({
  novice: {name:'견습 마도사',reaction:.35,accuracy:.42,aggression:.43,guard:.18,damage:.72},
  normal: {name:'길드 정예',reaction:.19,accuracy:.67,aggression:.63,guard:.42,damage:1},
  master: {name:'S급 마도사',reaction:.095,accuracy:.86,aggression:.82,guard:.71,damage:1.13}
});
const HEROES = {
  natsu: { name:'나츠', hp:125, speed:235, color:'#ff6b55', mana:100, skills:[['화염 돌진',7,18],['화룡의 포효',6,18],['화염 폭발',9,26],['용왕의 일격',0,0]] },
  lucy: { name:'루시', hp:103, speed:243, color:'#ffce7b', mana:115, skills:[['아쿠에리아스',7,20],['버고의 가호',10,25],['레오의 빛',8,26],['성령의 축제',0,0]] },
  erza: { name:'엘자', hp:140, speed:225, color:'#ef7893', mana:100, skills:[['천륜 돌진',7,18],['금강의 갑옷',11,22],['검의 폭풍',8,24],['천륜의 검무',0,0]] },
  gray: { name:'그레이', hp:113, speed:230, color:'#83d9fa', mana:110, skills:[['아이스 랜스',6,16],['빙결진',10,24],['빙화',9,25],['절대영도',0,0]] }
};
const clamp = (a,lo,hi) => Math.max(lo,Math.min(hi,a));
const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
let nextId = 1;
const cleanName = value => (typeof value === 'string' ? value.trim().replace(/[<>\\\x00-\x1f]/g,'').slice(0,16) : '') || '마도사';
class Arena {
  constructor(mode, code) {
    this.code=code; this.mode=mode; this.max=MODES[mode]; this.players=[];
    this.status='lobby'; this.time=0; this.effects=[]; this.projectiles=[]; this.outcome=null; this.practice=false;
    this.eventId=0; this.created=Date.now(); this.lastActivity=Date.now(); this.round=0;
    this.aiDifficulty='normal'; this.aiHero='gray'; this.roundWins={}; this.roundBreak=0;
    this.roundResult=null; this.bestOf=1; this.roundIndex=0; this.serverTick=0;
    this.pickups=[];this.fields=[];this.pickupClock=0;this.nextPickupId=1;this.spawnCounter=0;this.ambientClock=0;
  }
  add(ws, name, hero) {
    if(this.status!=='lobby' || this.players.length>=this.max) return false;
    const p={id:'p'+(nextId++),ws,name:cleanName(name),hero:HEROES[hero]?hero:'natsu',team:this.mode==='teams'?(this.players.filter(x=>x.team===1).length<=this.players.filter(x=>x.team===2).length?1:2):this.players.length+1,
      x:640,y:FLOOR,vy:0,onGround:true,guard:false,haste:0,dashCooldown:0,attackPose:0,animation:'idle1',face:0,hp:100,mana:100,ult:0,shield:0,stun:0,slow:0,invuln:0,cooldowns:[0,0,0,0,0],alive:true,kills:0,damage:0,combo:0,comboTimer:0,
      chainStep:0,chainWindow:0,chainConfirmed:false,attackLock:0,hitstun:0,hitFreeze:0,guardMeter:100,guardBreak:0,
      vx:0,groundId:'floor',coyote:0,jumpBuffer:0,fallThrough:0,wasUp:false,landPulse:0,wallJumpLock:0,
      input:{},lastAction:0,roundWins:0,isBot:false,botThink:0};
    this.players.push(p); this.lastActivity=Date.now(); this.broadcastLobby(); return p;
  }
  remove(ws) {
    const idx=this.players.findIndex(p=>p.ws===ws); if(idx<0) return;
    const wasLeader=idx===0, p=this.players[idx]; this.players.splice(idx,1); this.lastActivity=Date.now();
    if(this.status==='playing') {p.hp=0;p.alive=false;this.checkWin();}
    if(this.players.length===0) {this.status='empty';return;}
    this.broadcast({type:'notice',message:p.name+'님이 퇴장했습니다.'});this.broadcastLobby();
  }
  broadcast(msg) {for(const p of this.players) p.ws.send(msg);}
  broadcastLobby(){this.broadcast({type:'lobby',room:this.info()});}
  info(){return {code:this.code,mode:this.mode,max:this.max,status:this.status,leader:this.players[0]?.id||null,world:{width:WIDTH,height:HEIGHT,floor:FLOOR,platforms:PLATFORMS},pickupClock:Math.ceil(this.pickupClock),pickups:this.pickups,fields:this.fields,players:this.players.map(p=>({id:p.id,name:p.name,hero:p.hero,team:p.team,isBot:p.isBot===true,roundWins:p.roundWins||0})),
      round:this.round,practice:this.practice,aiDifficulty:this.practice?this.aiDifficulty:null,aiHero:this.practice?this.aiHero:null,
      bestOf:this.bestOf,roundIndex:this.roundIndex};}
  setHero(p,hero){if(this.status!=='lobby' || !HEROES[hero])return; p.hero=hero;this.broadcastLobby();}
  setTeam(p,team){if(this.mode!=='teams' || this.status!=='lobby'||!([1,2].includes(team)))return;
    if(this.players.filter(x=>x!==p&&x.team===team).length>=2)return;
    p.team=team;this.broadcastLobby();}
  start(p){
    if(this.players[0]!==p||this.status!=='lobby')return false;
    if(this.players.length!==this.max)return false;
    if(this.mode==='teams'&&this.players.filter(x=>x.team===1).length!==2)return false;
    this.status='playing';this.time=this.practice?90:120;this.effects=[];this.projectiles=[];this.outcome=null;this.round++;
    this.roundWins={};this.roundIndex=1;this.bestOf=this.practice?3:1;this.roundResult=null;
    this.pickups=[];this.fields=[];this.pickupClock=13;this.spawnCounter=0;
    for(const v of this.players){v.roundWins=0;}
    const starts=[{x:775,y:FLOOR},{x:2820,y:FLOOR},{x:1490,y:FLOOR},{x:2190,y:FLOOR}];
    if(this.practice){starts[0]={x:1460,y:FLOOR};starts[1]={x:2135,y:FLOOR};}
    const teamStarts=[{x:420,y:FLOOR},{x:3100,y:FLOOR},{x:630,y:FLOOR},{x:2890,y:FLOOR}];
    let t1=0,t2=0;
    for(let i=0;i<this.players.length;i++){
      const v=this.players[i],c=HEROES[v.hero], pos=this.mode==='teams'?teamStarts[v.team===1?(t1++?2:0):(t2++?3:1)]:starts[i];
      Object.assign(v,{x:pos.x,y:pos.y,vx:0,vy:0,groundId:'floor',coyote:0,jumpBuffer:0,fallThrough:0,wasUp:false,landPulse:0,onGround:true,guard:false,haste:0,dashCooldown:0,attackPose:0,animation:'idle1',face:pos.x<WIDTH/2?0:Math.PI,hp:c.hp,mana:c.mana,ult:0,shield:0,stun:0,slow:0,invuln:0,cooldowns:[0,0,0,0,0],alive:true,kills:0,damage:0,combo:0,comboTimer:0,
      chainStep:0,chainWindow:0,chainConfirmed:false,attackLock:0,hitstun:0,hitFreeze:0,guardMeter:100,guardBreak:0,
      input:{},lastAction:0,botThink:0});
    }
    this.broadcast({type:'start',room:this.info()});return true;
  }
  reset(p){
    if(this.players[0]!==p||this.status!=='ended')return;
    this.status='lobby';this.effects=[];this.projectiles=[];this.pickups=[];this.fields=[];this.broadcastLobby();
    // An AI opponent is already waiting. Rematch immediately, without a dead-end lobby.
    if(this.practice && this.players.length===2) this.start(p);
  }
  freshRound(){
    this.status='playing';this.time=90;this.roundIndex++;this.roundResult=null;this.roundBreak=0;
    this.projectiles=[];this.effects=[];this.pickups=[];this.fields=[];this.pickupClock=13;this.spawnCounter=0;
    for(let i=0;i<this.players.length;i++){
      const p=this.players[i],stats=HEROES[p.hero];
      Object.assign(p,{x:i===0?1460:2135,y:FLOOR,vx:0,vy:0,groundId:'floor',coyote:0,jumpBuffer:0,fallThrough:0,wasUp:false,landPulse:0,onGround:true,face:i===0?0:Math.PI,
        hp:stats.hp,mana:stats.mana,ult:0,shield:0,alive:true,guard:false,invuln:0,stun:0,hitstun:0,
        slow:0,haste:0,hitFreeze:0,guardMeter:100,guardBreak:0,cooldowns:[0,0,0,0,0],
        chainStep:0,chainWindow:0,chainConfirmed:false,attackLock:0,combo:0,comboTimer:0,input:{},botThink:0,attackPose:0});
    }
    this.broadcast({type:'roundStart',round:this.roundIndex,scores:this.roundScores()});
  }
  roundScores(){return this.players.map(p=>({id:p.id,roundWins:p.roundWins||0}));}
  resolveRound(winner,message){
    if(this.status!=='playing')return;
    if(!this.practice) return this.finish(winner,message);
    const winning=this.players.find(p=>p.id===winner);
    if(winning)winning.roundWins=(winning.roundWins||0)+1;
    const scores=this.roundScores();
    if(winning&&winning.roundWins>=2){this.finish(winner,message);return;}
    // On draws, replay the round; no false win is awarded.
    this.status='roundBreak';this.roundBreak=2.7;
    this.roundResult={winner,message,round:this.roundIndex,scores};
    this.broadcast({type:'roundEnd',...this.roundResult});
  }
  enemies(p){return this.players.filter(e=>e.alive&&e!==p&&(this.mode!=='teams'||e.team!==p.team));}
  allies(p){return this.players.filter(e=>e.alive&&e.team===p.team);}
  damage(attacker,target,amount,tag,extra={}){
    if(!target.alive||target.invuln>0||(this.mode==='teams'&&attacker.team===target.team))return 0;
    // A guard only protects against incoming frontal attacks. Guard meter prevents infinite turtling.
    const frontal=(attacker.x-target.x)*(target.face===0?1:-1)>=-8;
    const guarding=target.guard&&target.onGround&&frontal&&target.guardBreak<=0;
    const rawAmount=attacker.isBot&&this.practice?Math.round(amount*(DIFFICULTIES[this.aiDifficulty]||DIFFICULTIES.normal).damage):amount;
    let d=guarding?Math.ceil(rawAmount*.28):rawAmount;
    if(guarding){
      target.guardMeter=clamp(target.guardMeter-Math.max(8,rawAmount*.90),0,100);
      this.effects.push({x:target.x,y:target.y-108,kind:'block',color:'#9ceaff',ttl:.22,r:46,by:attacker.id});
      if(target.guardMeter<=0){target.guard=false;target.guardBreak=1.65;target.stun=Math.max(target.stun,.84);target.hitstun=Math.max(target.hitstun,.84);
        this.effects.push({x:target.x,y:target.y-120,kind:'guardbreak',color:'#fff2ad',ttl:.72,r:85,by:attacker.id});
        this.broadcast({type:'combat',event:'guardbreak',target:target.id,by:attacker.id});}
    }
    if(target.shield>0){const absorbed=Math.min(target.shield,d);target.shield-=absorbed;d-=absorbed;}
    target.hp=clamp(target.hp-d,0,HEROES[target.hero].hp);attacker.damage+=d;
    attacker.ult=clamp(attacker.ult+Math.max(3,d*.75),0,100);
    target.ult=clamp(target.ult+Math.max(2,d*.3),0,100);
    target.invuln=guarding?.095:.15;
    if(d>0){
      attacker.combo=attacker.comboTimer>0?attacker.combo+1:1;attacker.comboTimer=2.0;
      attacker.chainConfirmed=true;
    }
    target.attackPose=Math.max(target.attackPose,guarding?.13:.32);
    target.animation=guarding?'guard':'hurt';
    if(d>0){const dir=Math.sign(target.x-attacker.x)||1;
      target.x=clamp(target.x+dir*Math.min(extra.launch?34:20,d*(guarding?.08:.48)),70,WIDTH-70);
      if(extra.launch&&!guarding){target.vy=Math.min(target.vy,-320);target.onGround=false;}
      if(!guarding){target.hitstun=Math.max(target.hitstun,extra.stun||.16+(d/145));target.hitFreeze=.065;attacker.hitFreeze=.045;}
    }
    if(extra.stun)target.stun=Math.max(target.stun,extra.stun);
    if(extra.slow)target.slow=Math.max(target.slow,extra.slow);
    this.effects.push({x:target.x,y:target.y,kind:guarding?'guard-hit':'hit',color:extra.color||'#ffe2a3',ttl:.34,by:attacker.id,dmg:Math.round(d),
      combo:attacker.combo,attack:tag});
    if(d>0)this.broadcast({type:'combat',event:guarding?'block':'hit',by:attacker.id,target:target.id,
      dmg:Math.round(d),combo:attacker.combo,guard:Math.round(target.guardMeter),attack:tag});
    if(target.hp<=0){target.alive=false;target.input={};attacker.kills++;
      this.broadcast({type:'notice',message:`${attacker.name}님이 ${target.name}님을 쓰러뜨렸습니다!`});this.checkWin();}
    return d;
  }
  area(p,x,y,r,dmg,kind,opts={}) {
    this.effects.push({x,y,r,kind,color:opts.color||HEROES[p.hero].color,ttl:opts.ttl||.48,by:p.id});
    for(const e of this.enemies(p))if(Math.hypot(e.x-x,e.y-75-y)<=r) this.damage(p,e,dmg,kind,opts);
  }
  projectile(p,{speed=670,damage=18,r=18,kind='orb',color,slow=0,ttl=1.4,angle=p.face,spread=0}){
    this.projectiles.push({x:p.x+Math.cos(angle)*51,y:p.y-78+Math.sin(angle)*31,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,owner:p.id,damage,r,kind,color:color||HEROES[p.hero].color,slow,ttl});
  }
  dash(p,len,damage,kind){
    const a=p.face, from={x:p.x,y:p.y};p.x=clamp(p.x+Math.cos(a)*len,70,WIDTH-70);
    // No vertical teleport: dash follows the current floor/platform geometry.
    p.invuln=Math.max(p.invuln,.22);this.effects.push({x:(from.x+p.x)/2,y:(from.y+p.y)/2,r:len*.65,kind,color:HEROES[p.hero].color,ttl:.36,by:p.id});
    for(const e of this.enemies(p)){
      const ux=p.x-from.x,uy=p.y-from.y,mag=ux*ux+uy*uy||1;
      const t=clamp(((e.x-from.x)*ux+(e.y-from.y)*uy)/mag,0,1);
      if(Math.abs(e.x-(from.x+ux*t))<66 && Math.abs(e.y-p.y)<95)this.damage(p,e,damage,kind);
    }
  }
  action(p,slot){
    if(this.status!=='playing'||!p.alive||p.stun>0||p.hitstun>0||!Number.isInteger(slot)||slot<0||slot>4)return;
    if(p.cooldowns[slot] > 0)return;
    if(p.guardBreak>0 || p.guard)return;
    if(slot!==0 && slot!==4 && p.attackLock>.07 && !(p.chainConfirmed&&p.chainWindow>0))return;
    const c=HEROES[p.hero],manaCost=slot===0?0:c.skills[slot-1]?.[2];
    if(slot===4){if(p.ult<100)return;p.ult=0;}else if(p.mana<manaCost)return;
    if(slot!==4)p.mana-=manaCost;
    let comboStep=0;
    if(slot===0){
      p.chainStep=p.chainWindow>0?((p.chainStep%3)+1):1;
      comboStep=p.chainStep;
      p.chainWindow=.78;
      p.chainConfirmed=false;
      p.attackLock=comboStep===3?.38:.20;
    }else{
      // A connecting normal attack can be cancelled into an elemental special.
      if(p.chainWindow>0&&p.chainConfirmed){
        p.ult=clamp(p.ult+5,0,100);
        this.broadcast({type:'combat',event:'cancel',by:p.id,slot});
      }
      p.chainWindow=0;p.chainStep=0;p.chainConfirmed=false;
      p.attackLock=slot===4?.78:.31;
    }
    p.cooldowns[slot]=slot===0?(comboStep===3?.39:.23):slot===4?2:c.skills[slot-1][1];
    p.attackPose=slot===0?.30:slot===4?.95:.55;p.animation=slot===0?'attack':'cast';
    this.effects.push({x:p.x,y:p.y,kind:'cast',color:c.color,ttl:.25,by:p.id});
    this.broadcast({type:'cast',player:p.id,hero:p.hero,slot,comboStep});
    if(slot===0){
      const step=comboStep||1;
      const direction=p.face===0?1:-1;
      const dmg=(p.hero==='erza'?14:13)+[0,0,3,9][step];
      const range=(p.hero==='erza'?126:112)+(step===3?18:0);
      const hitX=p.x+direction*(range*.52);
      this.effects.push({x:hitX,y:p.y-113,r:step===3?90:67,kind:step===3?'finisher':'slash',
        color:c.color,ttl:step===3?.4:.23,by:p.id,step});
      // Lucy/Gray basic attacks are short-range magic waves, preserving their ranged identity.
      if((p.hero==='lucy'||p.hero==='gray')&&step!==3){
        this.projectile(p,{damage:dmg-1,speed:step===2?900:790,r:step===2?19:15,
          kind:p.hero==='gray'?'ice':'star',color:p.hero==='gray'?'#a5eaff':'#ffe9a7'});
      }else{
        for(const e of this.enemies(p)){
          if(Math.abs(e.x-p.x)>range||Math.abs(e.y-p.y)>145)continue;
          if((e.x-p.x)*direction < -16)continue;
          this.damage(p,e,dmg,'combo-'+step,{launch:step===3,color:c.color});
        }
      }
      return;
    }
    if(p.hero==='natsu'){
      if(slot===1)this.dash(p,230,26,'fire-dash');
      if(slot===2)this.projectile(p,{damage:27,speed:680,r:28,kind:'fire',color:'#ff9949'});
      if(slot===3){this.area(p,p.x,p.y-75,150,25,'fireburst');
        this.fields.push({id:'f'+(this.nextPickupId++),owner:p.id,hero:p.hero,kind:'flame',x:clamp(p.x+(p.face===0?1:-1)*155,90,WIDTH-90),y:p.y-65,r:94,ttl:3.8,pulse:0});}
      if(slot===4){this.area(p,p.x+Math.cos(p.face)*145,p.y-75,220,55,'dragon', {color:'#ff753d',ttl:1});}
    }else if(p.hero==='lucy'){
      if(slot===1)this.projectile(p,{damage:30,speed:630,r:36,kind:'wave',color:'#71dbff',slow:.7});
      if(slot===2){p.shield=Math.min(p.shield+32,70);p.hp=Math.min(c.hp,p.hp+18);this.effects.push({x:p.x,y:p.y,r:85,kind:'heal',color:'#b7ffdb',ttl:.8,by:p.id});}
      if(slot===3){this.area(p,p.x+Math.cos(p.face)*105,p.y-75,125,26,'starlight',{color:'#fff1af'});
        this.fields.push({id:'f'+(this.nextPickupId++),owner:p.id,hero:p.hero,kind:'star',x:clamp(p.x+(p.face===0?1:-1)*115,90,WIDTH-90),y:p.y-70,r:118,ttl:4.0,pulse:0});}
      if(slot===4){for(const e of this.enemies(p))this.area(p,e.x,e.y-75,100,46,'celestial',{color:'#ffed98',ttl:1});p.shield+=20;}
    }else if(p.hero==='erza'){
      if(slot===1)this.dash(p,255,29,'blade-dash');
      if(slot===2){p.shield=Math.min(p.shield+50,80);p.invuln=Math.max(p.invuln,.7);this.effects.push({x:p.x,y:p.y,r:80,kind:'shield',color:'#ffd7e9',ttl:1,by:p.id});}
      if(slot===3){this.area(p,p.x,p.y-75,155,26,'blade-storm',{color:'#f5a1d1'});
        this.fields.push({id:'f'+(this.nextPickupId++),owner:p.id,hero:p.hero,kind:'blade',x:p.x,y:p.y-75,r:126,ttl:2.9,pulse:0});}
      if(slot===4){for(let i=0;i<9;i++)this.projectile(p,{angle:p.face+(i-4)*.19,damage:21,speed:735,r:17,kind:'sword',color:'#ffb3d6'});}
    }else if(p.hero==='gray'){
      if(slot===1)this.projectile(p,{damage:25,speed:785,r:23,kind:'ice',color:'#98eaff',slow:2.2});
      if(slot===2){this.area(p,p.x+Math.cos(p.face)*115,p.y-75,125,14,'freeze',{color:'#97edff',slow:2.8});
        this.fields.push({id:'f'+(this.nextPickupId++),owner:p.id,hero:p.hero,kind:'frost',x:clamp(p.x+(p.face===0?1:-1)*155,90,WIDTH-90),y:p.y-72,r:110,ttl:4.5,pulse:0});}
      if(slot===3)this.area(p,p.x,p.y-75,175,28,'icebloom',{color:'#baf4ff',slow:1.5});
      if(slot===4)this.area(p,p.x,p.y-75,300,56,'blizzard',{color:'#b5efff',slow:3,ttl:1.1});
    }
  }
  checkWin(){
    if(this.status!=='playing')return;
    const alive=this.players.filter(p=>p.alive);
    if(alive.length===0)return this.resolveRound(null,'모두 쓰러졌습니다. 무승부!');
    if(this.mode==='teams'){
      const teams=new Set(alive.map(p=>p.team));if(teams.size===1)this.resolveRound(alive[0].team,'팀 승리!');
    }else if(alive.length===1)this.resolveRound(alive[0].id,`${alive[0].name} 승리!`);
  }
  finish(winner,message){
    if(this.status!=='playing')return;
    this.status='ended';this.outcome={winner,message};this.broadcast({type:'ended',outcome:this.outcome,room:this.info()});
  }
  update(dt){
    if(this.status==='roundBreak'){
      this.roundBreak-=dt;
      if(this.roundBreak<=0)this.freshRound();
      return;
    }
    if(this.status!=='playing')return;
    this.serverTick++;
    this.time=Math.max(0,this.time-dt);
    if(this.practice)this.updateBot(dt);
    for(const p of this.players){
      if(!p.alive)continue;
      p.invuln=Math.max(0,p.invuln-dt);p.stun=Math.max(0,p.stun-dt);p.slow=Math.max(0,p.slow-dt);p.haste=Math.max(0,(p.haste||0)-dt);
      p.hitstun=Math.max(0,p.hitstun-dt);p.hitFreeze=Math.max(0,p.hitFreeze-dt);
      p.attackLock=Math.max(0,p.attackLock-dt);p.chainWindow=Math.max(0,p.chainWindow-dt);
      p.guardBreak=Math.max(0,p.guardBreak-dt);
      if(p.chainWindow<=0){p.chainStep=0;p.chainConfirmed=false;}
      p.guardMeter=clamp(p.guardMeter+(p.input.down?5:18)*dt,0,100);
      p.cooldowns=p.cooldowns.map(v=>Math.max(0,v-dt));p.mana=clamp(p.mana+8.5*dt,0,HEROES[p.hero].mana);p.ult=clamp(p.ult+1.2*dt,0,100);
      p.attackPose=Math.max(0,p.attackPose-dt);p.dashCooldown=Math.max(0,p.dashCooldown-dt);p.comboTimer=Math.max(0,(p.comboTimer||0)-dt);if(p.comboTimer===0)p.combo=0;
      p.guard=p.stun<=0&&p.hitstun<=0&&p.guardBreak<=0&&p.input.down===true&&p.onGround;
      const jumpPressed=!!p.input.up&&!p.wasUp;p.wasUp=!!p.input.up;
      if(jumpPressed)p.jumpBuffer=.14;
      p.jumpBuffer=Math.max(0,p.jumpBuffer-dt);
      p.coyote=Math.max(0,(p.coyote||0)-dt);
      p.fallThrough=Math.max(0,(p.fallThrough||0)-dt);
      p.landPulse=Math.max(0,(p.landPulse||0)-dt);
      const locked=p.stun>0||p.hitstun>0||p.hitFreeze>0;
      const dx=(p.input.right?1:0)-(p.input.left?1:0);
      const speed=HEROES[p.hero].speed*1.40*(p.haste>0?1.19:1)*(p.slow>0?.64:1)*(p.guard?.34:1)*(p.attackLock>0?.48:1);
      // Horizontal acceleration + friction, with extra aerial steering.
      const accel=p.onGround?2250:1550;
      const target=locked?0:dx*speed;
      p.vx+=(target-p.vx)*Math.min(1,(dx?accel:2250)*dt/Math.max(250,Math.abs(target-p.vx)));
      if(Math.abs(p.vx)<.65)p.vx=0;
      const previousX=p.x;
      p.x=clamp(p.x+p.vx*dt,70,WIDTH-70);
      if(p.x===70||p.x===WIDTH-70)p.vx=0;
      if(dx!==0&&!locked)p.face=dx>0?0:Math.PI;
      if(!locked&&p.jumpBuffer>0&&(p.onGround||p.coyote>0)&&!p.guard&&p.attackLock<=.08){
        p.vy=-WORLD.jumpSpeed;p.onGround=false;p.groundId=null;p.coyote=0;p.jumpBuffer=0;
        this.effects.push({x:p.x,y:p.y-8,r:37,kind:'jump',color:'#eeddb4',ttl:.32,by:p.id});
      }
      // Dropping down from a one-way platform: Down + newly pressed Jump.
      if(jumpPressed&&p.input.down&&p.groundId!=='floor'&&p.onGround){p.fallThrough=.23;p.onGround=false;p.vy=85;p.y+=7;p.jumpBuffer=0;}
      if(!locked&&p.input.dash&&p.dashCooldown<=0&&!p.guard&&p.attackLock<=0){
        p.x=clamp(p.x+(p.face===0?1:-1)*118,70,WIDTH-70);p.dashCooldown=1.65;p.invuln=Math.max(p.invuln,.16);
        this.effects.push({x:p.x,y:p.y-60,r:90,kind:'dash',color:'#e9d3ab',ttl:.28,by:p.id});
      }
      // Semi-solid platforms are passable from below, solid when landing from above.
      if(!p.onGround&&p.hitFreeze<=0){
        const oldFoot=p.y;
        const halfG=p.vy<0&&p.input.up?.56:1;
        p.vy=clamp(p.vy+GRAVITY*halfG*dt,-WORLD.jumpSpeed,980);
        p.y+=p.vy*dt;
        if(p.vy>=0){
          const landing=supportAt(p.x,p.y,oldFoot,p.fallThrough>0);
          if(landing){p.y=landing.y;p.vy=0;p.onGround=true;p.groundId=landing.id;p.landPulse=.25;
            this.effects.push({x:p.x,y:p.y-4,r:36,kind:'land',color:'#f4daa5',ttl:.20,by:p.id});}
          else if(p.y>=FLOOR){p.y=FLOOR;p.vy=0;p.onGround=true;p.groundId='floor';p.landPulse=.25;}
        }
      }else if(p.onGround){
        // Leaving a platform edge starts a coyote-time window rather than floating.
        const platform=PLATFORMS.find(platform=>platform.id===p.groundId);
        if(platform&&(p.x+WORLD.playerHalfWidth<platform.x||p.x-WORLD.playerHalfWidth>platform.x+platform.w)){
          p.onGround=false;p.coyote=.10;p.groundId=null;p.vy=Math.max(45,p.vy);
        }
      }
      p.animation=locked?'hurt':p.attackLock>.08&&p.attackPose>.1?(p.chainStep>0?'attack':'cast'):!p.onGround?(p.vy<0?'jump':'fall'):Math.abs(p.vx)>28?'run':p.guard?'guard':'idle1';


    }
    // Timed health packs: all pickups are spawned, picked up and consumed on the server.
    this.pickupClock-=dt;
    if(this.pickupClock<=0){
      this.pickupClock=21;
      if(this.pickups.length<2){const pos=PICKUP_SPAWNS[this.spawnCounter++%PICKUP_SPAWNS.length];
        const type=['heal','mana','haste'][(this.spawnCounter-1)%3];const item={id:'h'+(this.nextPickupId++),type,x:pos.x,y:pos.y,ttl:17,amount:type==='heal'?30:type==='mana'?38:7};
        this.pickups.push(item);this.broadcast({type:'pickupSpawn',id:item.id,x:item.x,y:item.y,kind:item.type});
      }
    }
    this.pickups=this.pickups.filter(item=>{
      item.ttl-=dt;if(item.ttl<=0)return false;
      const nearby=this.players.filter(p=>p.alive&&(item.type==='mana'?p.mana<HEROES[p.hero].mana-1:item.type==='haste'?p.haste<1:p.hp<HEROES[p.hero].hp-1))
        .find(p=>Math.abs(p.x-item.x)<50&&Math.abs((p.y-70)-item.y)<76);
      if(nearby){let gained=item.amount;
        if(item.type==='mana'){gained=Math.min(item.amount,HEROES[nearby.hero].mana-nearby.mana);nearby.mana+=gained;}
        else if(item.type==='haste'){nearby.haste=Math.max(nearby.haste,7);gained=7;}
        else{gained=Math.min(item.amount,HEROES[nearby.hero].hp-nearby.hp);nearby.hp+=gained;}
        this.broadcast({type:'pickup',by:nearby.id,kind:item.type,amount:Math.round(gained),x:item.x,y:item.y});
        this.effects.push({kind:item.type==='mana'?'mana':item.type==='haste'?'dash':'heal',x:item.x,y:item.y,r:80,ttl:.85,color:item.type==='mana'?'#97e4ff':item.type==='haste'?'#ffe48d':'#a6ffbd',by:nearby.id});return false;}
      return true;
    });
    this.fields=this.fields.filter(field=>{
      field.ttl-=dt;field.pulse-=dt;
      if(field.ttl<=0)return false;
      if(field.pulse<=0){field.pulse=.85;
        const owner=this.players.find(p=>p.id===field.owner);
        if(owner?.alive){for(const enemy of this.enemies(owner)){
          if(Math.abs(enemy.x-field.x)<field.r&&Math.abs((enemy.y-75)-field.y)<field.r*.72){
            if(field.kind==='flame')this.damage(owner,enemy,5,'flame-zone',{color:'#ff8a4f'});
            if(field.kind==='frost'){enemy.slow=Math.max(enemy.slow,1.1);this.damage(owner,enemy,3,'frost-zone',{color:'#9cecff'});}
            if(field.kind==='blade')this.damage(owner,enemy,6,'blade-zone',{color:'#ffb6cf'});
            if(field.kind==='star')this.damage(owner,enemy,4,'star-zone',{color:'#fff1a1'});
          }
        }}
      }return true;
    });
    this.effects=this.effects.filter(e=>(e.ttl-=dt)>0);
    this.projectiles=this.projectiles.filter(pr=>{
      pr.ttl-=dt;pr.x+=pr.vx*dt;pr.y+=pr.vy*dt;
      if(pr.ttl<=0||pr.x<-50||pr.x>WIDTH+50||pr.y<-50||pr.y>HEIGHT+50)return false;
      const owner=this.players.find(p=>p.id===pr.owner);if(!owner)return false;
      const hit=this.enemies(owner).find(e=>Math.hypot(e.x-pr.x,e.y-78-pr.y)<pr.r+39);
      if(hit){this.damage(owner,hit,pr.damage,pr.kind,{color:pr.color,slow:pr.slow});this.effects.push({x:pr.x,y:pr.y,r:58,kind:pr.kind,color:pr.color,ttl:.32,by:owner.id});return false;}
      return true;
    });
    if(this.time<=0){const teams={};for(const p of this.players)teams[p.team]=(teams[p.team]||0)+p.hp;
      const top=Math.max(...Object.values(teams));const winners=Object.keys(teams).filter(k=>teams[k]===top);
      this.resolveRound(winners.length===1?(this.mode==='teams'?Number(winners[0]):this.players.find(p=>String(p.team)===winners[0])?.id):null,'시간 종료! 체력이 가장 많은 '+(winners.length===1?'팀/플레이어 승리':'무승부'));
    }
  }
  updateBot(dt){
    const bot=this.players.find(p=>p.isBot&&p.alive),enemy=this.players.find(p=>!p.isBot&&p.alive);
    if(!bot||!enemy)return;
    const cfg=DIFFICULTIES[this.aiDifficulty]||DIFFICULTIES.normal;
    bot.botThink=(bot.botThink||0)-dt;
    const lowHealth=bot.hp/HEROES[bot.hero].hp<.48;
    const nearHeal=this.pickups.filter(item=>item.type==='heal'&&Math.abs(item.x-bot.x)<620&&item.ttl>1)
      .sort((a,b)=>Math.abs(a.x-bot.x)-Math.abs(b.x-bot.x))[0];
    const target=lowHealth&&nearHeal?nearHeal:enemy;
    const delta=target.x-bot.x,range=Math.abs(delta);
    // Server-owned state machine: seek -> bait -> defend -> punish -> cast.
    // Each difficulty has its own reaction delay, accuracy, aggression and defense.
    if(bot.botThink<=0){
      bot.botThink=cfg.reaction*(.75+Math.random()*.55);
      const threatened=Math.abs(enemy.x-bot.x)<135 && (enemy.attackPose>.12||enemy.chainWindow>.12);
      const elevation=bot.y-(nearHeal&&target===nearHeal?nearHeal.y+64:enemy.y);
      const platformAhead=PLATFORMS.some(platform=>bot.onGround&&platform.y<bot.y-65&&platform.y>bot.y-180
        &&platform.x<bot.x+Math.sign(delta)*210+65&&platform.x+platform.w>bot.x+Math.sign(delta)*210-65);
      const defense=threatened&&Math.random()<cfg.guard;
      const wantsRange=target===nearHeal?8:(bot.hero==='gray'||bot.hero==='lucy')?175:94;
      const close=range<wantsRange-28;
      const far=range>wantsRange+28;
      const strafe=defense?0:far?Math.sign(delta):close?-Math.sign(delta):Math.random()<.15?Math.sign(delta):0;
      bot.face=delta>=0?0:Math.PI;
      bot.input={left:strafe<0,right:strafe>0,down:defense,up:!defense&&bot.onGround&&((elevation>80&&range<420)||platformAhead||Math.random()<cfg.aggression*.045&&range>155),
        dash:!defense&&range>230&&range<570&&Math.random()<cfg.aggression*.08};
      if(!defense && target===enemy && !(elevation>80&&bot.onGround) && bot.stun<=0&&bot.hitstun<=0){
        const attackRoll=Math.random();
        if(range<135&&bot.cooldowns[0]<=0&&attackRoll<cfg.accuracy){this.action(bot,0);}
        else if(range<550&&attackRoll<cfg.aggression*.58){
          const usable=[1,2,3].filter(slot=>bot.cooldowns[slot]<=0&&bot.mana>=HEROES[bot.hero].skills[slot-1][2]);
          if(usable.length)this.action(bot,usable[Math.floor(Math.random()*usable.length)]);
        }
        if(bot.ult>=100&&range<300&&Math.random()<cfg.accuracy)this.action(bot,4);
      }
    }
  }
  snapshot(){return {type:'snapshot',status:this.status,time:Math.ceil(this.time),tick:this.serverTick,roundIndex:this.roundIndex,roundBreak:this.roundBreak,scores:this.roundScores(),world:{width:WIDTH,height:HEIGHT,floor:FLOOR,platforms:PLATFORMS},pickupClock:Math.ceil(this.pickupClock),pickups:this.pickups,fields:this.fields,players:this.players.map(p=>({id:p.id,name:p.name,hero:p.hero,team:p.team,x:Math.round(p.x),y:Math.round(p.y),face:p.face,vy:Math.round(p.vy),vx:Math.round(p.vx||0),groundId:p.groundId,landPulse:p.landPulse,onGround:p.onGround,guard:p.guard,moving:!!(p.input.left||p.input.right),attackPose:Math.round(p.attackPose*100)/100,animation:p.animation,hp:Math.round(p.hp),mana:Math.round(p.mana),ult:Math.round(p.ult),shield:Math.round(p.shield),alive:p.alive,slow:p.slow>0,haste:(p.haste||0)>0,combo:p.combo||0,chainStep:p.chainStep||0,chainWindow:Math.round(p.chainWindow*100)/100,
        guardMeter:Math.round(p.guardMeter),guardBreak:p.guardBreak>0,hitstun:p.hitstun>0,
        roundWins:p.roundWins||0,isBot:p.isBot===true,cooldowns:p.cooldowns.map(x=>Math.round(x*10)/10),kills:p.kills,damage:Math.round(p.damage)})),projectiles:this.projectiles, effects:this.effects};}
}
module.exports={Arena,HEROES,MODES,DIFFICULTIES,WIDTH,HEIGHT,FLOOR,PLATFORMS,cleanName};
