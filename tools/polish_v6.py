from pathlib import Path
p=Path(__file__).resolve().parents[1]/'public/game-client.js';s=p.read_text()
needle='function drawFighter(p,t){'
add=r'''function v6DrawSpellSignature(p,t,elapsed,slot,x,y){
 if(elapsed>.52||!p.alive)return;
 const color=heroTint(p.hero),facing=p.face>Math.PI/2||p.face<-Math.PI/2?-1:1;
 const power=slot===4?1.5:slot===0?.65:1,progress=clamp(elapsed/(slot===4?.6:.38),0,1);
 const fade=Math.max(0,1-progress);ctx.save();ctx.translate(x+facing*76,y-135);ctx.globalCompositeOperation='screen';ctx.globalAlpha=fade*.95;ctx.shadowColor=color;ctx.shadowBlur=24;
 if(p.hero==='natsu'){
  for(let k=0;k<8+(slot===4?8:0);k++){const theta=(k/8)*Math.PI*2+t*7,radius=(34+(slot===4?90:35)*progress)+(k%4)*11;
   const fx=Math.cos(theta)*radius*.65+facing*60*progress,fy=Math.sin(theta)*radius*.8;
   ctx.fillStyle=k%3?'#ff7d29':'#ffe49c';ctx.beginPath();ctx.moveTo(fx-12,fy+20);ctx.quadraticCurveTo(fx+12,fy-10,fx+Math.sin(t*19+k)*16,fy-35-(k%3)*8);ctx.quadraticCurveTo(fx-25,fy-10,fx-12,fy+20);ctx.fill();}
  ctx.strokeStyle='#ffd88e';ctx.lineWidth=13*power;ctx.beginPath();ctx.arc(0,0,65+60*progress,-1.8,-1.8+progress*4.9);ctx.stroke();
 }else if(p.hero==='gray'){
  for(let k=0;k<13;k++){const angle=k*6.283/13+(t*.2),len=(45+80*progress)*(1+(k%3)*.12);
   const X=Math.cos(angle)*len,Y=Math.sin(angle)*len;ctx.fillStyle=k%2?'#c0f5ff':'#5aaae8';ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(X,Y);ctx.lineTo(X+Math.cos(angle+.6)*19,Y+Math.sin(angle+.6)*19);ctx.closePath();ctx.fill();ctx.stroke();}
  ctx.strokeStyle='#dffaff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,50+70*progress,0,6.283);ctx.stroke();
 }else if(p.hero==='erza'){
  for(let k=0;k<3+(slot===4?3:0);k++){ctx.save();ctx.rotate(k*.43+t*.25);ctx.strokeStyle=k%2?'#ffb2d6':'#fff1f3';ctx.lineWidth=7+k*2;ctx.beginPath();ctx.arc(0,0,55+k*19+progress*48,-2.2,-.4+progress*3.7);ctx.stroke();ctx.restore();}
  for(let j=0;j<7;j++){ctx.save();ctx.rotate(j*Math.PI/7);ctx.fillStyle='#ff8db1';ctx.fillRect(52+j*8,-2,27,4);ctx.restore();}
 }else{
  for(let k=0;k<10+(slot===4?8:0);k++){const ang=k*.61+t*.22,rad=26+(65+45*progress)*(k%3)/3;
   const X=Math.cos(ang)*rad,Y=Math.sin(ang)*rad;ctx.fillStyle=k%2?'#fff8cf':'#f6cfff';ctx.beginPath();for(let j=0;j<10;j++){const a=ang+j*Math.PI/5,r=j%2?4:14;const xx=X+Math.cos(a)*r,yy=Y+Math.sin(a)*r;if(!j)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);}ctx.closePath();ctx.fill();}
  ctx.strokeStyle='#fff3b1';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,75*power,-1.5,Math.PI*2.3);ctx.stroke();
 }
 ctx.restore();
}
'''
s=s.replace(needle,add+needle)
s=s.replace("ctx.restore();\n if(!p.alive){stroked('K.O.'", "ctx.restore();\n if(elapsed<.52&&cast)v6DrawSpellSignature(p,t,elapsed,cast.slot,x,y);\n if(!p.alive){stroked('K.O.'")
s=s.replace("fillRect(x-w/2,y-293,w,22,'#1a1425c9');ctx.strokeStyle=mine?'#f3d082':'#876457';ctx.lineWidth=1;ctx.strokeRect(x-w/2,y-251,w,22);\n stroked(label,x,y-235,'bold 13px sans-serif','#fff5df','#17101a',2);\n fillRect(x-44,y-227,88,7,'#1a1220e0');fillRect(x-43,y-226,86*clamp(p.hp/c.hp,0,1),5,mine?'#ffc575':p.team===1?'#ff7465':'#7ec6ff');", "fillRect(x-w/2,y-296,w,25,'#1a1425dc');ctx.strokeStyle=mine?'#f3d082':'#876457';ctx.lineWidth=1;ctx.strokeRect(x-w/2,y-296,w,25);\n stroked(label,x,y-278,'bold 13px sans-serif','#fff5df','#17101a',2);\n fillRect(x-44,y-266,88,7,'#1a1220e0');fillRect(x-43,y-265,86*clamp(p.hp/c.hp,0,1),5,mine?'#ffc575':p.team===1?'#ff7465':'#7ec6ff');")
p.write_text(s)
