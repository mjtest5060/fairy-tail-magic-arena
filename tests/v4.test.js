'use strict';
const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {Arena,HEROES,DIFFICULTIES}=require('../game');
const {server,rooms}=require('../server');
const fake=()=>({send(){}});
function aiArena(difficulty='normal'){
 const arena=new Arena('duel','AI0001');arena.practice=true;arena.aiDifficulty=difficulty;
 const human=arena.add(fake(),'도전자','natsu');const bot=arena.add(fake(),'AI','gray');bot.isBot=true;
 assert.equal(arena.start(human),true);return {arena,human,bot};
}
test('AI has three distinct, whitelisted difficulty profiles',()=>{
 assert.deepEqual(Object.keys(DIFFICULTIES),['novice','normal','master']);
 assert.ok(DIFFICULTIES.novice.reaction>DIFFICULTIES.master.reaction);
 assert.ok(DIFFICULTIES.master.aggression>DIFFICULTIES.normal.aggression);
});
test('AI challenge follows best-of-three rounds, not immediate match end',()=>{
 const {arena,human,bot}=aiArena();assert.equal(arena.bestOf,3);
 arena.damage(human,bot,1000,'test');
 assert.equal(arena.status,'roundBreak');assert.equal(human.roundWins,1);
 arena.update(1.4);assert.equal(arena.status,'roundBreak');
 arena.update(1.4);assert.equal(arena.status,'playing');assert.equal(arena.roundIndex,2);
 assert.equal(bot.hp,HEROES.gray.hp);
 arena.damage(human,bot,1000,'test');
 assert.equal(arena.status,'ended');assert.equal(arena.outcome.winner,human.id);
 assert.equal(human.roundWins,2);
});
test('Rematch in AI arena automatically starts a fresh best-of-three',()=>{
 const {arena,human,bot}=aiArena();
 for(let i=0;i<2;i++){bot.invuln=0;arena.damage(human,bot,1000,'test');if(i===0)arena.update(2.8);}
 arena.reset(human);
 assert.equal(arena.status,'playing');assert.equal(arena.roundIndex,1);
 assert.equal(human.roundWins,0);assert.equal(bot.roundWins,0);
});
test('Three-chain basic attacks progress through steps with cooldown',()=>{
 const a=new Arena('duel','A1'),p=a.add(fake(),'A','natsu'),q=a.add(fake(),'B','gray');a.start(p);
 p.x=450;q.x=520;
 a.action(p,0);assert.equal(p.chainStep,1);assert.ok(p.cooldowns[0]>.2);
 p.cooldowns[0]=0;a.action(p,0);assert.equal(p.chainStep,2);
 p.cooldowns[0]=0;a.action(p,0);assert.equal(p.chainStep,3);
 a.update(1);assert.equal(p.chainStep,0);
});
test('Guard reserve drains, guardbreak stuns and then recovers',()=>{
 const a=new Arena('duel','A1'),p=a.add(fake(),'A','natsu'),q=a.add(fake(),'B','gray');a.start(p);
 p.x=390;q.x=500;q.face=Math.PI;q.input={down:true};a.update(.01);assert.equal(q.guard,true);
 for(let i=0;i<6&&q.guardBreak<=0;i++){q.invuln=0;a.damage(p,q,28,'test');}
 assert.equal(q.guardBreak>0,true);assert.equal(q.guardMeter,0);assert.ok(q.stun>0);
 q.input={};for(let i=0;i<75;i++)a.update(1/30);
 assert.ok(q.guardMeter>0);assert.equal(q.guardBreak,0);
});
test('Guard prevents frontal but not attacks from behind',()=>{
 const a=new Arena('duel','A1'),p=a.add(fake(),'A','natsu'),q=a.add(fake(),'B','gray');a.start(p);
 p.x=510;q.x=500;q.face=Math.PI;q.input={down:true};a.update(.01);
 const hp=q.hp;a.damage(p,q,20,'test');assert.equal(q.hp,hp-20);
});
test('AI damage scaling is server-side and difficulty dependent',()=>{
 const novice=aiArena('novice'),master=aiArena('master');
 const hpN=novice.human.hp,hpM=master.human.hp;
 novice.arena.damage(novice.bot,novice.human,20,'skill');
 master.arena.damage(master.bot,master.human,20,'skill');
 assert.ok(hpM-master.human.hp>hpN-novice.human.hp);
});
let port;
after(async()=>{
 for(const room of rooms.values())for(const p of [...room.players])if(p.ws.disconnect)p.ws.disconnect();
 if(server.listening)await new Promise(r=>server.close(r));
});
async function client(){
 if(!server.listening)await new Promise(r=>server.listen(0,'127.0.0.1',r));port=server.address().port;
 const ws=new WebSocket('ws://127.0.0.1:'+port+'/ws'),received=[];
 ws.addEventListener('message',e=>received.push(JSON.parse(e.data)));
 await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 return {ws,send:o=>ws.send(JSON.stringify(o)),wait:async pred=>{
   for(let i=0;i<370;i++){const index=received.findIndex(pred);if(index>=0)return received.splice(index,1)[0];await new Promise(r=>setTimeout(r,14));}
   throw new Error('no ws response '+JSON.stringify(received.slice(-4)));
 }};
}
test('WebSocket AI battle accepts opponent/difficulty and ping measures latency',async t=>{
 const c=await client();t.after(()=>c.ws.close());
 c.send({type:'aiBattle',name:'AI 테스터',hero:'lucy',opponent:'erza',difficulty:'master'});
 const joined=await c.wait(x=>x.type==='joined');
 assert.equal(joined.room.practice,true);assert.equal(joined.room.aiDifficulty,'master');
 assert.equal(joined.room.aiHero,'erza');
 assert.equal(joined.room.players[1].hero,'erza');
 await c.wait(x=>x.type==='start');
 c.send({type:'ping',sent:1234});assert.equal((await c.wait(x=>x.type==='pong')).sent,1234);
 c.send({type:'leave'});await c.wait(x=>x.type==='left');
});
test('Snapshot gives guard reserve, round and server tick',()=>{
 const {arena}=aiArena();arena.update(.04);
 const shot=arena.snapshot();assert.equal(typeof shot.tick,'number');assert.equal(shot.roundIndex,1);
 assert.equal(shot.scores.length,2);assert.equal(shot.players[0].guardMeter,100);
});
test('Live AI best-of-three emits roundEnd, roundStart and final ended in order',async t=>{
 const c=await client();t.after(()=>c.ws.close());
 c.send({type:'aiBattle',name:'라운드테스터',hero:'natsu',opponent:'gray',difficulty:'normal'});
 const joined=await c.wait(x=>x.type==='joined');await c.wait(x=>x.type==='start');
 const room=rooms.get(joined.room.code),player=room.players[0],bot=room.players[1];
 room.damage(player,bot,1000,'test');
 const roundEnd=await c.wait(x=>x.type==='roundEnd');assert.equal(roundEnd.round,1);
 assert.equal(roundEnd.scores.find(x=>x.id===player.id).roundWins,1);
 // The server simulation timer owns the transition; clients never decide the next round.
 const roundStart=await c.wait(x=>x.type==='roundStart');assert.equal(roundStart.round,2);
 room.damage(player,bot,1000,'test');
 const final=await c.wait(x=>x.type==='ended');assert.equal(final.outcome.winner,player.id);
 c.send({type:'again'});
 const fresh=await c.wait(x=>x.type==='start');assert.equal(fresh.room.roundIndex,1);
 c.send({type:'leave'});await c.wait(x=>x.type==='left');
});
test('Out-of-order input sequence is ignored by authoritative server',async t=>{
 const c=await client();t.after(()=>c.ws.close());
 c.send({type:'aiBattle',name:'입력테스터',hero:'natsu',difficulty:'novice'});
 const joined=await c.wait(x=>x.type==='joined');await c.wait(x=>x.type==='start');
 const room=rooms.get(joined.room.code),player=room.players[0];
 c.send({type:'input',seq:5,keys:{right:true}});
 await new Promise(r=>setTimeout(r,55));
 c.send({type:'input',seq:4,keys:{left:true}});
 await new Promise(r=>setTimeout(r,40));
 assert.equal(player.input.right,true);assert.equal(player.input.left,false);
 c.send({type:'leave'});await c.wait(x=>x.type==='left');
});
