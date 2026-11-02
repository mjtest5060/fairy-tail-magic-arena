'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {Arena,HEROES,FLOOR}=require('../game');
const fake=()=>({send(){}});
function duel(){const a=new Arena('duel','FB0001'),p=a.add(fake(),'Natsu','natsu'),q=a.add(fake(),'Gray','gray');assert.equal(a.start(p),true);return {a,p,q};}
test('Side-view characters start on the same ground and face each other',()=>{
 const {a,p,q}=duel();assert.equal(p.y,FLOOR);assert.equal(q.y,FLOOR);assert.equal(p.face,0);assert.equal(q.face,Math.PI);assert.ok(p.x<q.x);
});
test('Jump uses gravity and lands on the arena floor',()=>{
 const {a,p}=duel();p.input={up:true};a.update(.033);assert.ok(p.y<FLOOR);assert.equal(p.onGround,false);
 p.input={};for(let i=0;i<85;i++)a.update(.025);assert.equal(p.y,FLOOR);assert.equal(p.onGround,true);
});
test('Blocking mitigates damage when grounded',()=>{
 const {a,p,q}=duel();q.input={down:true};a.update(.01);assert.equal(q.guard,true);
 a.damage(p,q,30,'punch');assert.equal(q.hp,HEROES.gray.hp-Math.ceil(30*.28));
});
test('Dash moves the fighter once per cooldown',()=>{
 const {a,p}=duel();const start=p.x;p.input={dash:true};a.update(.025);assert.ok(p.x>start+100);
 const post=p.x;a.update(.025);assert.equal(p.x,post);assert.ok(p.dashCooldown>1);
});
test('Players cannot move past the arena walls',()=>{
 const {a,p}=duel();p.x=70;p.input={left:true};for(let i=0;i<8;i++)a.update(.03);assert.equal(p.x,70);
});
test('Snapshot includes visual state necessary for pixel sprite animation',()=>{
 const {a,p}=duel();p.input={right:true};a.update(.03);const f=a.snapshot().players.find(x=>x.id===p.id);
 assert.equal(f.moving,true);assert.equal(f.onGround,true);assert.equal(typeof f.attackPose,'number');
});
