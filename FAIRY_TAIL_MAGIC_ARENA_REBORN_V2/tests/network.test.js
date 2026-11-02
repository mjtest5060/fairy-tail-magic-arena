'use strict';
const {test,after}=require('node:test');const assert=require('node:assert/strict');
const {server,rooms}=require('../server');
let port;
after(async()=>{for(const room of rooms.values())for(const p of [...room.players])p.ws.disconnect();if(server.listening)await new Promise(resolve=>server.close(resolve));});
async function ensure(){if(server.listening)return;await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));port=server.address().port;}
async function client(){await ensure();const ws=new WebSocket('ws://127.0.0.1:'+port+'/ws');const received=[];
 ws.addEventListener('message',e=>{try{received.push(JSON.parse(e.data));}catch{}});
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 return {ws,received,send:o=>ws.send(JSON.stringify(o)),wait:async(pred,timeout=1800)=>{
  const start=Date.now();while(Date.now()-start<timeout){const index=received.findIndex(pred);if(index>=0)return received.splice(index,1)[0];await new Promise(r=>setTimeout(r,12));}throw new Error('Timed out '+JSON.stringify(received.slice(-3)));}};
}
test('HTTP health, WebSocket room join, movement, chat, combat, leave',async t=>{
 await ensure();
 let res=await fetch('http://127.0.0.1:'+port+'/health');assert.equal(res.status,200);assert.equal((await res.json()).ok,true);
 res=await fetch('http://127.0.0.1:'+port+'/');assert.equal(res.status,200);assert.match(await res.text(),/MAGIC ARENA/);
 const a=await client(),b=await client();t.after(()=>{a.ws.close();b.ws.close();});
 a.send({type:'create',mode:'duel',name:'나츠',hero:'natsu'});const joined=await a.wait(x=>x.type==='joined');assert.ok(/^[0-9A-F]{6}$/.test(joined.room.code));
 b.send({type:'join',code:joined.room.code,name:'루시',hero:'lucy'});const bjoin=await b.wait(x=>x.type==='joined');assert.equal(bjoin.room.players.length,2);
 a.send({type:'start'});await a.wait(x=>x.type==='start');await b.wait(x=>x.type==='start');
 const shot=await b.wait(x=>x.type==='snapshot');assert.equal(shot.players.length,2);
 a.send({type:'input',keys:{right:true},aim:0});const p0=shot.players.find(x=>x.id===joined.id);
 await new Promise(r=>setTimeout(r,180));const after=await b.wait(x=>x.type==='snapshot'&&x.players.some(p=>p.id===joined.id&&p.x>p0.x));assert.ok(after);
 a.send({type:'chat',text:'같이 싸우자!'});const ch=await b.wait(x=>x.type==='chat'&&x.text==='같이 싸우자!');assert.equal(ch.name,'나츠');
 a.send({type:'action',slot:1});const cast=await b.wait(x=>x.type==='cast'&&x.slot===1);assert.equal(cast.hero,'natsu');
 b.send({type:'leave'});await b.wait(x=>x.type==='left');assert.ok(!rooms.has(joined.room.code)||rooms.get(joined.room.code).players.length===1);
});
test('2v2 connection handles capacity and start',async t=>{
 await ensure();const clients=await Promise.all(Array.from({length:5},()=>client()));t.after(()=>clients.forEach(c=>c.ws.close()));
 clients[0].send({type:'create',mode:'teams',name:'Leader'});const j=await clients[0].wait(x=>x.type==='joined');
 for(let i=1;i<4;i++){clients[i].send({type:'join',code:j.room.code,name:'User'+i});await clients[i].wait(x=>x.type==='joined');}
 clients[4].send({type:'join',code:j.room.code,name:'Too many'});assert.match((await clients[4].wait(x=>x.type==='error')).message,/빈자리/);
 clients[0].send({type:'start'});await clients[0].wait(x=>x.type==='start');
 for(let i=0;i<4;i++)clients[i].send({type:'leave'});
});
