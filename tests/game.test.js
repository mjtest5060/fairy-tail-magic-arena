'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Arena,HEROES}=require('../game');
const fake=()=>({msgs:[],send(x){this.msgs.push(x)}});
for(const [mode,required] of [['duel',2],['chaos',3],['teams',4]]){
 test(mode+' room must be full to start',()=>{
  const arena=new Arena(mode,'ABC123');const arr=[];for(let i=0;i<required;i++){
   const p=arena.add(fake(),'플레이어'+i,Object.keys(HEROES)[i]);assert.ok(p);arr.push(p);
   if(i<required-1)assert.equal(arena.start(arr[0]),false);
  }
  assert.equal(arena.start(arr[0]),true);
  assert.equal(arena.status,'playing');assert.equal(arena.players.length,required);
  assert.equal(arena.time,120);
  assert.ok(arena.snapshot().players.every(x=>x.hp>0));
 });
}
test('duel: authoritative damage, death and winner',()=>{
 const a=new Arena('duel','ABC123');const p1=a.add(fake(),'나츠','natsu'),p2=a.add(fake(),'루시','lucy');
 assert.ok(a.start(p1));p1.x=310;p1.y=330;p2.x=348;p2.y=330;p1.face=0;
 a.action(p1,0);assert.ok(p2.hp<HEROES.lucy.hp,'basic attack should damage enemy');
 for(let i=0;i<8&&p2.alive;i++){p2.invuln=0;p1.cooldowns[0]=0;a.action(p1,0);}
 assert.equal(a.status,'ended');assert.equal(a.outcome.winner,p1.id);
 a.reset(p1);assert.equal(a.status,'lobby');
});
test('2v2: no friendly fire, team winner',()=>{
 const a=new Arena('teams','ABC123');const p=[];for(let i=0;i<4;i++)p.push(a.add(fake(),'User'+i,'erza'));
 a.start(p[0]);assert.deepEqual(p.map(x=>x.team),[1,2,1,2]);
 a.damage(p[0],p[2],50,'basic');assert.equal(p[2].hp,HEROES.erza.hp);
 a.damage(p[0],p[1],250,'basic');assert.equal(a.status,'playing');
 a.damage(p[0],p[3],250,'basic');assert.equal(a.status,'ended');assert.equal(a.outcome.winner,1);
});
test('three-way chaos winner',()=>{
 const a=new Arena('chaos','ABC123'),p=[0,1,2].map(i=>a.add(fake(),'P'+i,'gray'));a.start(p[0]);
 a.damage(p[0],p[1],500,'ice');assert.equal(a.status,'playing');
 a.damage(p[0],p[2],500,'ice');assert.equal(a.outcome.winner,p[0].id);
});
test('mana costs, cooldowns, ultimate charge validated',()=>{
 const a=new Arena('duel','ABC123'),p=a.add(fake(),'P1','gray');a.add(fake(),'P2','erza');a.start(p);
 a.action(p,1);assert.equal(p.mana,HEROES.gray.mana-16);const old=p.mana;
 a.action(p,1);assert.equal(p.mana,old,'skill cannot spam while on cooldown');
 a.action(p,4);assert.equal(p.ult,0,'empty ultimate not cast');
 p.ult=100;a.action(p,4);assert.equal(p.ult,0);
});
