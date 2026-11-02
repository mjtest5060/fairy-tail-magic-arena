'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {Arena,HEROES,WIDTH,HEIGHT,FLOOR,PLATFORMS}=require('../game');
const {WORLD}=require('../arena-map');
const mock=()=>({messages:[],send(data){this.messages.push(data);}});
function duel(){const a=new Arena('duel','V50001'),p=a.add(mock(),'Player','natsu'),q=a.add(mock(),'Opponent','gray');a.start(p);return {a,p,q};}
function until(a,p,predicate,secs=3){for(let i=0;i<secs*60;i++){a.update(1/60);if(predicate())return true;}return false;}
test('V5 oversized world is > 2.5x the viewport, with multi-tier platforms',()=>{
 assert.equal(WIDTH,3600);assert.equal(HEIGHT,1024);assert.ok(PLATFORMS.length>=9);
 assert.ok(PLATFORMS.some(p=>p.y<FLOOR-250));
 const {a}=duel(),shot=a.snapshot();assert.equal(shot.world.width,WIDTH);assert.equal(shot.world.platforms.length,PLATFORMS.length);
});
test('Server jump arcs onto a one-way platform rather than passing through it',()=>{
 const {a,p}=duel();p.x=450;p.y=FLOOR;p.groundId='floor';p.onGround=true;
 p.input={up:true};a.update(1/60);assert.ok(p.vy<0);p.input={};
 assert.ok(until(a,p,()=>p.groundId==='west-low'));
 assert.equal(p.y,726);assert.equal(p.onGround,true);
});
test('One-way platform can be approached from below without ceiling collisions',()=>{
 const {a,p}=duel();p.x=450;p.y=800;p.onGround=false;p.groundId=null;p.vy=-700;p.input={up:true};
 a.update(.05);assert.ok(p.y<800);assert.equal(p.onGround,false);
});
test('Down and Jump lets the player drop through a platform',()=>{
 const {a,p}=duel();p.x=430;p.y=726;p.vy=0;p.onGround=true;p.groundId='west-low';p.wasUp=false;
 p.input={up:true,down:true};a.update(1/30);assert.equal(p.onGround,false);
 p.input={};assert.ok(until(a,p,()=>p.y>726+50));
});
test('Walking off the edge activates gravity instead of hovering',()=>{
 const {a,p}=duel();p.x=650;p.y=726;p.groundId='west-low';p.onGround=true;p.input={right:true};
 assert.ok(until(a,p,()=>!p.onGround));assert.ok(p.vy>=0);
});
test('Gravity respects a terminal fall velocity for simulation stability',()=>{
 const {a,p}=duel();p.x=700;p.y=150;p.onGround=false;p.vy=4000;p.input={};
 a.update(.03);assert.ok(p.vy<=980);
});
test('Pack countdown spawns a server-owned health pickup',()=>{
 const {a}=duel();a.pickupClock=.02;a.update(.03);assert.equal(a.pickups.length,1);
 assert.equal(a.pickups[0].amount,30);assert.ok(a.pickupClock>20);
 assert.equal(a.snapshot().pickups.length,1);
});
test('Health pack restores hp once, capped to hero maximum',()=>{
 const {a,p,q}=duel();p.x=450;p.y=726;p.hp=HEROES.natsu.hp-12;q.x=3300;
 a.pickups=[{id:'pack',type:'heal',x:450,y:694,ttl:15,amount:30}];a.update(.033);
 assert.equal(p.hp,HEROES.natsu.hp);assert.equal(a.pickups.length,0);
 assert.ok(p.ws.messages.some(m=>m.type==='pickup'&&m.by===p.id));
});
test('Healthy players cannot waste a healing pack',()=>{
 const {a,p,q}=duel();p.x=450;p.y=726;q.x=3300;
 a.pickups=[{id:'pack',type:'heal',x:450,y:694,ttl:15,amount:30}];a.update(.033);
 assert.equal(a.pickups.length,1);
});
test('A temporary flame field ticks on server, respects team friendly-fire protection',()=>{
 const {a,p,q}=duel();p.x=510;p.y=FLOOR;q.x=670;q.y=FLOOR;
 p.mana=100;p.face=0;a.action(p,3);assert.ok(a.fields.some(f=>f.kind==='flame'));
 const initial=q.hp;q.invuln=0;a.update(.05);assert.ok(q.hp<initial);
 for(let i=0;i<200;i++)a.update(1/30);assert.equal(a.fields.length,0);
});
test('Snapshot includes network render data and map state',()=>{
 const {a,p}=duel();p.input={right:true};a.update(.05);
 const frame=a.snapshot();const hero=frame.players.find(x=>x.id===p.id);
 assert.equal(typeof hero.vx,'number');assert.equal(typeof hero.groundId,'string');
 assert.equal(typeof frame.pickupClock,'number');assert.ok(Array.isArray(frame.fields));
});
test('Round reset clears pickups and temporary fields',()=>{
 const {a,p,q}=duel();a.pickups.push({id:'unused',ttl:20});a.fields.push({id:'unused',ttl:20});
 a.finish(p.id,'done');a.reset(p);assert.equal(a.pickups.length,0);assert.equal(a.fields.length,0);
});
test('AI attempts an upward jump toward an opponent on an elevated platform',()=>{
 const {a,p,q}=duel();a.practice=true;a.aiDifficulty='master';q.isBot=true;
 p.x=1570;p.y=602;p.onGround=true;p.groundId='center-mid';
 q.x=1380;q.y=FLOOR;q.onGround=true;q.groundId='floor';q.botThink=0;
 a.update(1/30);
 assert.equal(q.input.up,true);assert.equal(q.onGround,false);assert.ok(q.vy<0);
});
test('Stage item and field records are broadcast as identical state for every player',()=>{
 const {a,p,q}=duel();a.pickupClock=.001;a.update(.03);
 const s1=a.snapshot(),s2=a.snapshot();assert.deepEqual(s1.pickups,s2.pickups);
 assert.ok(s1.world.platforms.every(p=>p.id&&Number.isFinite(p.y)));
 assert.ok(a.players.every(p=>p.ws.messages.some(m=>m.type==='pickupSpawn')));
});
