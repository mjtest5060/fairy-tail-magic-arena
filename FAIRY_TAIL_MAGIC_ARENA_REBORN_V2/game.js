'use strict';
const WIDTH = 1280, HEIGHT = 720, FLOOR = 598, GRAVITY = 1550;
const MODES = { duel: 2, chaos: 3, teams: 4 };
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
    this.status='lobby'; this.time=0; this.effects=[]; this.projectiles=[]; this.outcome=null;
    this.eventId=0; this.created=Date.now(); this.lastActivity=Date.now(); this.round=0;
  }
  add(ws, name, hero) {
    if(this.status!=='lobby' || this.players.length>=this.max) return false;
    const p={id:'p'+(nextId++),ws,name:cleanName(name),hero:HEROES[hero]?hero:'natsu',team:this.mode==='teams'?(this.players.filter(x=>x.team===1).length<=this.players.filter(x=>x.team===2).length?1:2):this.players.length+1,
      x:640,y:FLOOR,vy:0,onGround:true,guard:false,dashCooldown:0,attackPose:0,animation:'idle1',face:0,hp:100,mana:100,ult:0,shield:0,stun:0,slow:0,invuln:0,cooldowns:[0,0,0,0],alive:true,kills:0,damage:0,input:{},lastAction:0};
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
  info(){return {code:this.code,mode:this.mode,max:this.max,status:this.status,leader:this.players[0]?.id||null,players:this.players.map(p=>({id:p.id,name:p.name,hero:p.hero,team:p.team})),round:this.round};}
  setHero(p,hero){if(this.status!=='lobby' || !HEROES[hero])return; p.hero=hero;this.broadcastLobby();}
  setTeam(p,team){if(this.mode!=='teams' || this.status!=='lobby'||!([1,2].includes(team)))return;
    if(this.players.filter(x=>x!==p&&x.team===team).length>=2)return;
    p.team=team;this.broadcastLobby();}
  start(p){
    if(this.players[0]!==p||this.status!=='lobby')return false;
    if(this.players.length!==this.max)return false;
    if(this.mode==='teams'&&this.players.filter(x=>x.team===1).length!==2)return false;
    this.status='playing';this.time=120;this.effects=[];this.projectiles=[];this.outcome=null;this.round++;
    const starts=[{x:275,y:FLOOR},{x:1005,y:FLOOR},{x:535,y:FLOOR},{x:770,y:FLOOR}];
    const teamStarts=[{x:195,y:FLOOR},{x:1090,y:FLOOR},{x:405,y:FLOOR},{x:880,y:FLOOR}];
    let t1=0,t2=0;
    for(let i=0;i<this.players.length;i++){
      const v=this.players[i],c=HEROES[v.hero], pos=this.mode==='teams'?teamStarts[v.team===1?(t1++?2:0):(t2++?3:1)]:starts[i];
      Object.assign(v,{x:pos.x,y:pos.y,vy:0,onGround:true,guard:false,dashCooldown:0,attackPose:0,animation:'idle1',face:pos.x<640?0:Math.PI,hp:c.hp,mana:c.mana,ult:0,shield:0,stun:0,slow:0,invuln:0,cooldowns:[0,0,0,0],alive:true,kills:0,damage:0,input:{},lastAction:0});
    }
    this.broadcast({type:'start',room:this.info()});return true;
  }
  reset(p){if(this.players[0]!==p||this.status!=='ended')return;this.status='lobby';this.effects=[];this.projectiles=[];this.broadcastLobby();}
  enemies(p){return this.players.filter(e=>e.alive&&e!==p&&(this.mode!=='teams'||e.team!==p.team));}
  allies(p){return this.players.filter(e=>e.alive&&e.team===p.team);}
  damage(attacker,target,amount,tag,extra={}){
    if(!target.alive||target.invuln>0||(this.mode==='teams'&&attacker.team===target.team))return;
    let d=target.guard&&target.onGround?Math.ceil(amount*.28):amount;if(target.shield>0){const absorbed=Math.min(target.shield,d);target.shield-=absorbed;d-=absorbed;}
    target.hp=clamp(target.hp-d,0,HEROES[target.hero].hp);attacker.damage+=d;attacker.ult=clamp(attacker.ult+Math.max(3,d*.75),0,100);
    target.ult=clamp(target.ult+Math.max(2,d*.3),0,100);target.invuln=.16;
    target.attackPose=Math.max(target.attackPose,.23);target.animation='hurt';if(d>0){const dir=Math.sign(target.x-attacker.x)||1;target.x=clamp(target.x+dir*Math.min(10,d*.22),70,WIDTH-70);}if(extra.stun)target.stun=Math.max(target.stun,extra.stun);
    if(extra.slow)target.slow=Math.max(target.slow,extra.slow);
    this.effects.push({x:target.x,y:target.y,kind:'hit',color:extra.color||'#ffe2a3',ttl:.3,by:attacker.id,dmg:Math.round(d)});
    if(target.hp<=0){target.alive=false;target.input={};attacker.kills++;this.broadcast({type:'notice',message:`${attacker.name}님이 ${target.name}님을 쓰러뜨렸습니다!`});this.checkWin();}
  }
  area(p,x,y,r,dmg,kind,opts={}) {
    this.effects.push({x,y,r,kind,color:opts.color||HEROES[p.hero].color,ttl:opts.ttl||.48,by:p.id});
    for(const e of this.enemies(p))if(Math.hypot(e.x-x,e.y-75-y)<=r) this.damage(p,e,dmg,kind,opts);
  }
  projectile(p,{speed=670,damage=18,r=18,kind='orb',color,slow=0,ttl=1.4,angle=p.face,spread=0}){
    this.projectiles.push({x:p.x+Math.cos(angle)*51,y:p.y-78+Math.sin(angle)*31,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,owner:p.id,damage,r,kind,color:color||HEROES[p.hero].color,slow,ttl});
  }
  dash(p,len,damage,kind){
    const a=p.face, from={x:p.x,y:p.y};p.x=clamp(p.x+Math.cos(a)*len,42,WIDTH-42);p.y=clamp(p.y+Math.sin(a)*len,FLOOR-170,FLOOR);
    p.invuln=Math.max(p.invuln,.22);this.effects.push({x:(from.x+p.x)/2,y:(from.y+p.y)/2,r:len*.65,kind,color:HEROES[p.hero].color,ttl:.36,by:p.id});
    for(const e of this.enemies(p)){
      const ux=p.x-from.x,uy=p.y-from.y,mag=ux*ux+uy*uy||1;
      const t=clamp(((e.x-from.x)*ux+(e.y-from.y)*uy)/mag,0,1);
      if(Math.abs(e.x-(from.x+ux*t))<66 && Math.abs(e.y-p.y)<95)this.damage(p,e,damage,kind);
    }
  }
  action(p,slot){
    if(this.status!=='playing'||!p.alive||p.stun>0||!Number.isInteger(slot)||slot<0||slot>4)return;
    if(p.cooldowns[slot] > 0)return;
    const c=HEROES[p.hero],manaCost=slot===0?0:c.skills[slot-1]?.[2];
    if(slot===4){if(p.ult<100)return;p.ult=0;}else if(p.mana<manaCost)return;
    if(slot!==4)p.mana-=manaCost;
    p.cooldowns[slot]=slot===0?.43:slot===4?2:c.skills[slot-1][1];p.attackPose=slot===0?.28:slot===4?.95:.55;p.animation=slot===0?'attack':'cast';
    this.effects.push({x:p.x,y:p.y,kind:'cast',color:c.color,ttl:.25,by:p.id});
    this.broadcast({type:'cast',player:p.id,hero:p.hero,slot});
    if(slot===0){
      if(p.hero==='lucy')this.projectile(p,{damage:12,speed:800,r:15,kind:'star',color:'#ffe5a4'});
      else if(p.hero==='gray')this.projectile(p,{damage:13,speed:760,r:17,kind:'ice',color:'#9de8ff',slow:.5});
      else for(const e of this.enemies(p)){const delta=Math.atan2(e.y-p.y,e.x-p.x)-p.face;if(Math.abs(e.x-p.x)<(p.hero==='erza'?116:98)&&Math.abs(e.y-p.y)<110&&Math.cos(delta)>.35)this.damage(p,e,p.hero==='erza'?15:16,'basic');}
      return;
    }
    if(p.hero==='natsu'){
      if(slot===1)this.dash(p,230,26,'fire-dash');
      if(slot===2)this.projectile(p,{damage:27,speed:680,r:28,kind:'fire',color:'#ff9949'});
      if(slot===3)this.area(p,p.x,p.y-75,150,25,'fireburst');
      if(slot===4){this.area(p,p.x+Math.cos(p.face)*145,p.y-75,220,55,'dragon', {color:'#ff753d',ttl:1});}
    }else if(p.hero==='lucy'){
      if(slot===1)this.projectile(p,{damage:30,speed:630,r:36,kind:'wave',color:'#71dbff',slow:.7});
      if(slot===2){p.shield=Math.min(p.shield+32,70);p.hp=Math.min(c.hp,p.hp+18);this.effects.push({x:p.x,y:p.y,r:85,kind:'heal',color:'#b7ffdb',ttl:.8,by:p.id});}
      if(slot===3)this.area(p,p.x+Math.cos(p.face)*105,p.y-75,125,26,'starlight',{color:'#fff1af'});
      if(slot===4){for(const e of this.enemies(p))this.area(p,e.x,e.y-75,100,46,'celestial',{color:'#ffed98',ttl:1});p.shield+=20;}
    }else if(p.hero==='erza'){
      if(slot===1)this.dash(p,255,29,'blade-dash');
      if(slot===2){p.shield=Math.min(p.shield+50,80);p.invuln=Math.max(p.invuln,.7);this.effects.push({x:p.x,y:p.y,r:80,kind:'shield',color:'#ffd7e9',ttl:1,by:p.id});}
      if(slot===3)this.area(p,p.x,p.y-75,155,26,'blade-storm',{color:'#f5a1d1'});
      if(slot===4){for(let i=0;i<9;i++)this.projectile(p,{angle:p.face+(i-4)*.19,damage:21,speed:735,r:17,kind:'sword',color:'#ffb3d6'});}
    }else if(p.hero==='gray'){
      if(slot===1)this.projectile(p,{damage:25,speed:785,r:23,kind:'ice',color:'#98eaff',slow:2.2});
      if(slot===2)this.area(p,p.x+Math.cos(p.face)*115,p.y-75,125,14,'freeze',{color:'#97edff',slow:2.8});
      if(slot===3)this.area(p,p.x,p.y-75,175,28,'icebloom',{color:'#baf4ff',slow:1.5});
      if(slot===4)this.area(p,p.x,p.y-75,300,56,'blizzard',{color:'#b5efff',slow:3,ttl:1.1});
    }
  }
  checkWin(){
    if(this.status!=='playing')return;
    const alive=this.players.filter(p=>p.alive);
    if(alive.length===0)return this.finish(null,'모두 쓰러졌습니다. 무승부!');
    if(this.mode==='teams'){
      const teams=new Set(alive.map(p=>p.team));if(teams.size===1)this.finish(alive[0].team,'팀 승리!');
    }else if(alive.length===1)this.finish(alive[0].id,`${alive[0].name} 승리!`);
  }
  finish(winner,message){
    if(this.status!=='playing')return;
    this.status='ended';this.outcome={winner,message};this.broadcast({type:'ended',outcome:this.outcome,room:this.info()});
  }
  update(dt){
    if(this.status!=='playing')return;
    this.time=Math.max(0,this.time-dt);
    for(const p of this.players){
      if(!p.alive)continue;
      p.invuln=Math.max(0,p.invuln-dt);p.stun=Math.max(0,p.stun-dt);p.slow=Math.max(0,p.slow-dt);
      p.cooldowns=p.cooldowns.map(v=>Math.max(0,v-dt));p.mana=clamp(p.mana+8.5*dt,0,HEROES[p.hero].mana);p.ult=clamp(p.ult+1.2*dt,0,100);
      p.attackPose=Math.max(0,p.attackPose-dt);p.dashCooldown=Math.max(0,p.dashCooldown-dt);
      p.guard=p.stun<=0&&p.input.down===true&&p.onGround;
      if(p.stun<=0){
        const dx=(p.input.right?1:0)-(p.input.left?1:0);
        const speed=HEROES[p.hero].speed*(p.slow>0?.60:1)*(p.guard?.33:1);
        p.x=clamp(p.x+dx*speed*dt,70,WIDTH-70);
        if(dx!==0)p.face=dx>0?0:Math.PI;
        if(p.input.up&&p.onGround&&!p.guard){p.vy=-625;p.onGround=false;this.effects.push({x:p.x,y:p.y-8,r:29,kind:'jump',color:'#eeddb4',ttl:.18,by:p.id});}
        if(p.input.dash&&p.dashCooldown<=0&&!p.guard){p.x=clamp(p.x+(p.face===0?1:-1)*118,70,WIDTH-70);p.dashCooldown=1.65;p.invuln=Math.max(p.invuln,.16);this.effects.push({x:p.x,y:p.y-60,r:80,kind:'dash',color:'#e9d3ab',ttl:.27,by:p.id});}
      }
      if(!p.onGround){p.vy+=GRAVITY*dt;p.y+=p.vy*dt;
        if(p.y>=FLOOR){p.y=FLOOR;p.vy=0;p.onGround=true;}
      }

    }
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
      this.finish(winners.length===1?(this.mode==='teams'?Number(winners[0]):this.players.find(p=>String(p.team)===winners[0])?.id):null,'시간 종료! 체력이 가장 많은 '+(winners.length===1?'팀/플레이어 승리':'무승부'));
    }
  }
  snapshot(){return {type:'snapshot',status:this.status,time:Math.ceil(this.time),players:this.players.map(p=>({id:p.id,name:p.name,hero:p.hero,team:p.team,x:Math.round(p.x),y:Math.round(p.y),face:p.face,vy:Math.round(p.vy),onGround:p.onGround,guard:p.guard,moving:!!(p.input.left||p.input.right),attackPose:Math.round(p.attackPose*100)/100,animation:p.animation,hp:Math.round(p.hp),mana:Math.round(p.mana),ult:Math.round(p.ult),shield:Math.round(p.shield),alive:p.alive,slow:p.slow>0,cooldowns:p.cooldowns.map(x=>Math.round(x*10)/10),kills:p.kills,damage:Math.round(p.damage)})),projectiles:this.projectiles, effects:this.effects};}
}
module.exports={Arena,HEROES,MODES,WIDTH,HEIGHT,FLOOR,cleanName};
