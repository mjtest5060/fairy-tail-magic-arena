'use strict';
const {test,after}=require('node:test');const assert=require('node:assert/strict');
const {server,rooms}=require('../server');
const {Arena,HEROES}=require('../game');
let port;
after(async()=>{for(const room of [...rooms.values()])for(const p of [...room.players]){if(p.ws.disconnect)p.ws.disconnect();}if(server.listening)await new Promise(resolve=>server.close(resolve));});
async function client(){if(!server.listening)await new Promise(r=>server.listen(0,'127.0.0.1',r));port=server.address().port;const ws=new WebSocket('ws://127.0.0.1:'+port+'/ws');const received=[];ws.addEventListener('message',e=>{received.push(JSON.parse(e.data));});await new Promise(r=>ws.addEventListener('open',r,{once:true}));return {ws,send:x=>ws.send(JSON.stringify(x)),wait:async pred=>{let count=0;while(count++<180){const i=received.findIndex(pred);if(i>=0)return received.splice(i,1)[0];await new Promise(r=>setTimeout(r,12));}throw new Error('timed out '+received.map(x=>x.type));}};}
test('practice: one human automatically joins match with an AI fighter and cleans up',async t=>{
 const c=await client();t.after(()=>c.ws.close());c.send({type:'practice',name:'마도사',hero:'natsu'});
 const joined=await c.wait(x=>x.type==='joined');assert.equal(joined.room.practice,true);
 const start=await c.wait(x=>x.type==='start');assert.equal(start.room.players.length,2);
 const shot=await c.wait(x=>x.type==='snapshot');assert.equal(shot.players.length,2);
 assert.equal(rooms.get(joined.room.code).players.find(x=>x.isBot).name,'훈련 마도사');
 c.send({type:'leave'});await c.wait(x=>x.type==='left');assert.ok(!rooms.has(joined.room.code));
});
test('combo counter only registers damage in a valid hit window',()=>{
 const a=new Arena('duel','TEST01');const ws=()=>({send(){}});
 const p=a.add(ws(),'one','natsu'),q=a.add(ws(),'two','gray');a.start(p);
 a.damage(p,q,12,'basic');assert.equal(p.combo,1);
 q.invuln=0;a.damage(p,q,12,'basic');assert.equal(p.combo,2);
 a.update(2.1);assert.equal(p.combo,0);
 const state=a.snapshot().players.find(x=>x.id===p.id);assert.equal(state.combo,0);
});
test('new V3 public art and HTML are served',async()=>{
 await client().then(c=>c.ws.close());
 const urls=['/','/assets/stages/magnolia_v3.png','/assets/ui/hero_panorama.webp','/assets/spritesheets/natsu.png','/assets/ui/favicon.png'];
 for(const u of urls){const res=await fetch('http://127.0.0.1:'+port+u);assert.equal(res.status,200,u);}
});
test('two concurrent game rooms receive snapshots independently',async t=>{
 const clients=await Promise.all(Array.from({length:4},()=>client()));t.after(()=>clients.forEach(c=>c.ws.close()));
 const [a,b,c,d]=clients;
 a.send({type:'create',mode:'duel',name:'A'});const j1=await a.wait(x=>x.type==='joined');
 b.send({type:'join',code:j1.room.code,name:'B'});await b.wait(x=>x.type==='joined');
 c.send({type:'create',mode:'duel',name:'C'});const j2=await c.wait(x=>x.type==='joined');
 d.send({type:'join',code:j2.room.code,name:'D'});await d.wait(x=>x.type==='joined');
 a.send({type:'start'});c.send({type:'start'});
 await a.wait(x=>x.type==='start');await c.wait(x=>x.type==='start');
 const snapA=await a.wait(x=>x.type==='snapshot');const snapC=await c.wait(x=>x.type==='snapshot');
 assert.equal(snapA.players.length,2);assert.equal(snapC.players.length,2);
 clients.forEach(c=>c.send({type:'leave'}));
});
