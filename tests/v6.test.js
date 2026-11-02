'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {Arena,HEROES,FLOOR}=require('../game');
const mk=()=>({messages:[],send(m){this.messages.push(m)}});
function match(){const g=new Arena('duel','V60001'),p=g.add(mk(),'Alice','natsu'),q=g.add(mk(),'Bob','gray');assert.ok(g.start(p));return {g,p,q};}
test('V6 pickup cycle retains first heal pack and rotates mana/haste',()=>{const {g}=match();const kinds=[];for(let i=0;i<3;i++){g.pickups=[];g.pickupClock=.001;g.update(.03);kinds.push(g.pickups[0].type)}assert.deepEqual(kinds,['heal','mana','haste']);});
test('V6 mana crystal is server authoritative and caps at maximum',()=>{const {g,p,q}=match();p.x=450;p.y=726;p.onGround=true;p.groundId='west-low';p.mana=HEROES.natsu.mana-9;q.x=3300;
 g.pickups=[{id:'m1',x:450,y:694,ttl:10,amount:38,type:'mana'}];g.pickupClock=30;g.update(.03);
 assert.equal(p.mana,HEROES.natsu.mana);assert.equal(g.pickups.length,0);assert.ok(p.ws.messages.some(m=>m.type==='pickup'&&m.kind==='mana'));
});
test('V6 speed orb adds temporary speed and expires',()=>{const {g,p,q}=match();p.x=450;p.y=726;p.onGround=true;p.groundId='west-low';q.x=3300;g.pickups=[{id:'fast',x:450,y:694,ttl:10,amount:7,type:'haste'}];g.pickupClock=30;g.update(.03);
 assert.ok(p.haste>6);assert.equal(g.pickups.length,0);assert.equal(g.snapshot().players.find(x=>x.id===p.id).haste,true);
 g.status='playing';g.pickupClock=30;for(let i=0;i<8*30;i++)g.update(1/30);assert.ok(p.haste===0);
});
test('V6 AI only treats actual heal packs as health targets',()=>{const {g,p,q}=match();g.practice=true;g.aiDifficulty='master';q.isBot=true;q.hp=10;q.x=1700;p.x=2100;g.pickups=[{id:'mana',type:'mana',x:1460,y:810,ttl:10,amount:30}];q.botThink=0;g.update(1/30);
 assert.equal(q.input.left,false,'AI should not run backward toward a non-healing item');
});
test('V6 speed boost measurably improves horizontal travel without changing base hero speed',()=>{const a=match(),b=match();
 a.p.x=1400;b.p.x=1400;a.p.y=b.p.y=FLOOR;a.p.haste=7;a.p.input={right:true};b.p.input={right:true};
 a.g.pickupClock=b.g.pickupClock=50;for(let i=0;i<18;i++){a.g.update(1/30);b.g.update(1/30);}
 assert.ok(a.p.x>b.p.x+10,`boost ${a.p.x} normal ${b.p.x}`);
});
test('V6 supplies image resources for each hero and all 5 interactive skill buttons',()=>{
 const fs=require('node:fs'),path=require('node:path');const base=path.join(__dirname,'../public/assets/v6');
 for(const hero of Object.keys(HEROES))for(let i=0;i<5;i++){assert.ok(fs.existsSync(path.join(base,`skill_${hero}_${i}.png`)));}
 for(const a of ['key_visual.webp','platform_stone.png','platform_wood.png','cobble_floor.webp'])assert.ok(fs.statSync(path.join(base,a)).size>1000);
});
