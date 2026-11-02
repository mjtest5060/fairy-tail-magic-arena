from pathlib import Path
p=Path(__file__).resolve().parents[1]/'public/game-client.js'
s=p.read_text()
s=s.replace("const hitParticles=[],pingHistory=[],positionSamples=new Map();", "const hitParticles=[],pingHistory=[],positionSamples=new Map();\nconst v6Sparks=[];let v6FX=true;\nfunction v6Spawn(x,y,color,kind='burst',amount=28){for(let i=0;i<amount;i++){let a=Math.random()*Math.PI*2,spd=75+Math.random()*315;v6Sparks.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-(kind==='flame'?110:0),born:performance.now()/1000,ttl:.35+Math.random()*.65,size:2+Math.random()*5,color,kind});}if(v6Sparks.length>430)v6Sparks.splice(0,v6Sparks.length-430);}\nfunction v6DrawSparks(t,dt){if(!v6FX)return;ctx.save();ctx.globalCompositeOperation='screen';for(let i=v6Sparks.length-1;i>=0;i--){const q=v6Sparks[i],age=t-q.born;if(age>q.ttl){v6Sparks.splice(i,1);continue;}q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=(q.kind==='flame'?-85:260)*dt;q.vx*=.99;let a=Math.max(0,1-age/q.ttl);ctx.globalAlpha=a*.9;ctx.fillStyle=q.color;ctx.shadowColor=q.color;ctx.shadowBlur=12;ctx.fillRect(q.x-q.size/2,q.y-q.size/2,q.size*a,q.size*a);if(i%4===0){ctx.strokeStyle='#fff8cf';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(q.x-q.vx*.025*a,q.y-q.vy*.025*a);ctx.stroke();}}ctx.restore();}\n")
s=s.replace("if(m.type==='combat'){\n   const now=performance.now();", "if(m.type==='combat'){\n   const now=performance.now();\n   if(m.event==='hit'||m.event==='guardbreak'){const victim=snap?.players?.find(q=>q.id===m.target);if(victim)v6Spawn(victim.x,victim.y-125,heroTint(snap?.players?.find(q=>q.id===m.by)?.hero||'natsu'),m.event==='guardbreak'?'spark':'burst',m.event==='guardbreak'?55:28);}")
s=s.replace("if(m.type==='cast'){recentCasts.set(m.player,{at:performance.now()/1000,slot:m.slot});playCast(m);", "if(m.type==='cast'){recentCasts.set(m.player,{at:performance.now()/1000,slot:m.slot});const caster=snap?.players?.find(q=>q.id===m.player);if(caster)v6Spawn(caster.x,caster.y-135,heroTint(m.hero),m.hero==='natsu'?'flame':'burst',m.slot===4?100:35);playCast(m);")
s=s.replace("<span>${name}</span><em class=\"hidden\"></em>", "<img src=\"/assets/v6/skill_${p?.hero||hero}_${i}.png\" alt=\"\"><span>${name}</span><em class=\"hidden\"></em>")
s=s.replace("$('goSelect')?.addEventListener('click',()=>$('characterSection').scrollIntoView({behavior:'smooth',block:'start'}));", "$('goSelect')?.addEventListener('click',()=>$('characterSection').scrollIntoView({behavior:'smooth',block:'start'}));\n $('goAi')?.addEventListener('click',()=>$('aiConfig').scrollIntoView({behavior:'smooth',block:'center'}));")
s=s.replace("ctx.restore();\n   if(stageFlash>.01)","v6DrawSparks(t,dt);ctx.restore();\n   if(stageFlash>.01)")
# ensure sprites don't jitter alpha with huge particle amounts
s=s.replace("const stageImage=new Image();stageImage.src='/assets/stages/magnolia_v5_world.webp';", "const stageImage=new Image();stageImage.src='/assets/stages/magnolia_v5_world.webp';")
# ornate portrait and HP HUD replacing existing two funcs
start=s.index('function heroHudPortrait(')
end=s.index('function drawCountdown(t)',start)
s=s[:start]+r'''function v6Diamond(x,y,s,color='#e9c18b'){ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.fillStyle='#26192d';ctx.fillRect(-s/2-2,-s/2-2,s+4,s+4);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(-s/2,-s/2,s,s);ctx.restore();}
function heroHudPortrait(p,x,y,right=false){
 const im=heroImages[p.hero];ctx.save();ctx.translate(x,y);
 ctx.beginPath();ctx.moveTo(17,0);ctx.lineTo(102,0);ctx.lineTo(119,20);ctx.lineTo(119,98);ctx.lineTo(100,118);ctx.lineTo(19,118);ctx.lineTo(0,99);ctx.lineTo(0,20);ctx.closePath();ctx.fillStyle='#1b1625';ctx.fill();ctx.strokeStyle='#eac17b';ctx.lineWidth=7;ctx.stroke();ctx.strokeStyle='#653d3e';ctx.lineWidth=2;ctx.stroke();
 ctx.save();ctx.beginPath();ctx.moveTo(20,8);ctx.lineTo(98,8);ctx.lineTo(111,22);ctx.lineTo(111,96);ctx.lineTo(98,109);ctx.lineTo(20,109);ctx.lineTo(7,96);ctx.lineTo(7,22);ctx.closePath();ctx.clip();if(im?.naturalWidth)ctx.drawImage(im,0,0,118,118);else fillRect(5,5,107,107,heroTint(p.hero));ctx.restore();
 ctx.fillStyle=heroTint(p.hero);ctx.shadowColor=heroTint(p.hero);ctx.shadowBlur=12;ctx.beginPath();ctx.arc(right?104:15,11,7,0,7);ctx.fill();ctx.shadowBlur=0;
 ctx.restore();
}
function fighterHud(p,side){
 if(!p)return;const c=heroInfo[p.hero],right=side==='right';
 const portraitX=right?1151:10,bx=right?735:137,bw=408;
 heroHudPortrait(p,portraitX,12,right);
 ctx.save();ctx.beginPath();if(!right){ctx.moveTo(bx,23);ctx.lineTo(bx+bw-21,23);ctx.lineTo(bx+bw,42);ctx.lineTo(bx+bw-20,106);ctx.lineTo(bx,106);}else{ctx.moveTo(bx+21,23);ctx.lineTo(bx+bw,23);ctx.lineTo(bx+bw,106);ctx.lineTo(bx+20,106);ctx.lineTo(bx,42);}ctx.closePath();
 const bg=ctx.createLinearGradient(0,17,0,111);bg.addColorStop(0,'#4c2b37f7');bg.addColorStop(.45,'#251d31f8');bg.addColorStop(1,'#151828f8');ctx.fillStyle=bg;ctx.fill();ctx.strokeStyle='#f5d99c';ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle='#7d4a38';ctx.lineWidth=2;ctx.stroke();ctx.restore();
 const tx=right?bx+bw-18:bx+18;stroked(c.name+' · '+p.name,tx,44,'900 17px sans-serif','#fff1d0','#281b2d',3,right?'right':'left');
 const hpx=bx+12,barW=bw-30,frac=clamp(p.hp/c.hp,0,1),mana=clamp(p.mana/c.mana,0,1);
 fillRect(hpx,52,barW,26,'#0d1921');const hG=ctx.createLinearGradient(0,52,0,77);hG.addColorStop(0,'#e0ff87');hG.addColorStop(.2,'#89f258');hG.addColorStop(.7,'#34ad54');hG.addColorStop(1,'#1b7742');
 let hlen=barW*frac;fillRect(right?hpx+barW-hlen:hpx,54,hlen,21,hG);fillRect(hpx,52,barW,2,'#fff4b6');ctx.strokeStyle='#a6a084';ctx.strokeRect(hpx,52,barW,26);
 for(let i=1;i<12;i++)fillRect(hpx+barW*i/12,55,1,20,'#12301c44');
 fillRect(hpx,84,barW,11,'#131c34');const mg=ctx.createLinearGradient(0,83,0,96);mg.addColorStop(0,'#edfbff');mg.addColorStop(.42,'#8beaff');mg.addColorStop(1,'#3d81d1');let ml=barW*mana;fillRect(right?hpx+barW-ml:hpx,85,ml,9,mg);ctx.strokeStyle='#87b6cb';ctx.strokeRect(hpx,83,barW,13);
 for(let i=0;i<3;i++)v6Diamond(right?bx+bw-27-i*17:bx+25+i*17,105,9,i<(p.roundWins||0)?'#ffe89e':'#6b5967');
 stroked('MP',right?bx-14:bx+bw+14,94,'900 12px Georgia','#d8f8ff','#143954',3,right?'right':'left');
}
function drawTopHud(){
 if(!snap)return;const players=snap.players;const left=room?.mode==='teams'?players.find(p=>p.team===1):players[0];const right=room?.mode==='teams'?players.find(p=>p.team===2):players[1];
 if(left)fighterHud(left,'left');if(right)fighterHud(right,'right');
 const x=640,y=66;ctx.save();ctx.shadowColor='#f7a86377';ctx.shadowBlur=19;ctx.beginPath();ctx.moveTo(x-53,y-42);ctx.lineTo(x-27,y-57);ctx.lineTo(x+27,y-57);ctx.lineTo(x+53,y-42);ctx.lineTo(x+66,y);ctx.lineTo(x+48,y+50);ctx.lineTo(x+26,y+63);ctx.lineTo(x-26,y+63);ctx.lineTo(x-48,y+50);ctx.lineTo(x-66,y);ctx.closePath();ctx.fillStyle='#241a2d';ctx.fill();ctx.strokeStyle='#fce1a0';ctx.lineWidth=7;ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='#8e4b35';ctx.lineWidth=3;ctx.stroke();ctx.restore();
 stroked('TIME',640,34,'900 12px Georgia','#ffe5a3','#4e2633',3);
 stroked(String(snap.time).padStart(2,'0'),640,88,'italic 900 56px Georgia',snap.time<=15?'#ffa38c':'#fff1bc','#712d2b',6);
 stroked('⚜ FAIRY TAIL · MAGIC ARENA ⚜',640,12,'900 15px Georgia','#ffe3ae','#552834',4);
 if(players.length>=3){const extra=players.slice(2);extra.forEach((p,i)=>{const px=640+(i-(extra.length-1)/2)*204,py=168,c=heroInfo[p.hero];
  fillRect(px-90,py-21,180,43,'#201627e8');ctx.strokeStyle=heroTint(p.hero);ctx.lineWidth=2;ctx.strokeRect(px-90,py-21,180,43);
  stroked(p.name,px,py-3,'900 14px sans-serif','#fff5e2','#221320',3);fillRect(px-81,py+8,162,7,'#0d1222');fillRect(px-81,py+8,162*clamp(p.hp/c.hp,0,1),7,'#8bdb74');
 });}
}
''' + s[end:]
# New improved stage platform bar with highlights but keep physical hitboxes exact.
start=s.index('function drawPlatform(');end=s.index('function drawStage(t)',start)
s=s[:start]+r'''function drawPlatform(platform,t){
 const {x,y,w,h,style}=platform,stone=style==='stone';ctx.save();
 ctx.shadowColor='#0b101c9a';ctx.shadowBlur=14;ctx.shadowOffsetY=9;
 const timber=ctx.createLinearGradient(0,y-10,0,y+h+8);timber.addColorStop(0,stone?'#f7ebbd':'#f8c98b');timber.addColorStop(.18,stone?'#a5aabb':'#ad7658');timber.addColorStop(.65,stone?'#4a5774':'#594458');timber.addColorStop(1,'#292b43');
 fillRect(x,y,w,h,timber);ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 fillRect(x-9,y-12,w+18,14,stone?'#dadac5':'#e6b575');fillRect(x-9,y-12,w+18,3,'#fff4c3');fillRect(x-9,y-1,w+18,2,stone?'#76788d':'#7e443c');
 // cross-braced timber and polished gold corners, uniquely spaced per ledge
 for(let i=0;i<Math.floor(w/42);i++){
  const bx=x+10+i*42;ctx.strokeStyle=stone?'#cad2cc88':'#d8a2667d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(bx,y+9);ctx.lineTo(bx+26,y+9);ctx.stroke();
  fillRect(bx+16,y+h-6,2,4,stone?'#1d263a':'#341928');
 }
 for(const xx of [x+18,x+w-18]){
  fillRect(xx-9,y+h,18,21,stone?'#4b4b67':'#654151');fillRect(xx-11,y+h+19,22,4,'#b1876b');
  ctx.strokeStyle=stone?'#a5abb0':'#bd9169';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(xx-17,y+h);ctx.lineTo(xx+5,y+h+18);ctx.stroke();
 }
 // gold floral / rune endcaps and subtle magic torches, purely decorative
 for(const ex of [x+8,x+w-8]){ctx.fillStyle='#ffde89';ctx.beginPath();ctx.arc(ex,y-6,4,0,7);ctx.fill();}
 if(w>220){const mid=x+w/2;ctx.save();ctx.globalAlpha=.7+.2*Math.sin(t*3+mid);ctx.strokeStyle=stone?'#c6eeff':'#ffc67b';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(mid,y-8,11,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(mid,y-19);ctx.lineTo(mid+8,y-8);ctx.lineTo(mid,y+2);ctx.lineTo(mid-8,y-8);ctx.closePath();ctx.stroke();ctx.restore();}
 ctx.restore();
}
''' + s[end:]
p.write_text(s)
print('V6 client patched bytes',len(s))
