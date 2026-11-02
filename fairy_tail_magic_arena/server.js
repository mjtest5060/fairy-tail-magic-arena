'use strict';
const http=require('http');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {upgrade}=require('./socket');
const {Arena,HEROES,MODES,cleanName}=require('./game');
const ROOT=path.join(__dirname,'public');
const PORT=Number(process.env.PORT)||3000;
const rooms=new Map();
const sockets=new Set();
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.json':'application/json; charset=utf-8','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{
  if(req.url?.split('?')[0]==='/health') {res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,rooms:rooms.size,players:sockets.size}));return;}
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  let u;try{u=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
  if(u==='/')u='/index.html';
  const full=path.resolve(ROOT,'.'+u);
  if(!full.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return;}
  fs.stat(full,(err,stats)=>{
    if(err||!stats.isFile()){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found');return;}
    const ext=path.extname(full).toLowerCase();
    res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':ext==='.html'?'no-cache':'public, max-age=600','X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD'){res.end();return;}
    fs.createReadStream(full).pipe(res);
  });
});
function roomCode(){let code;do{code=crypto.randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));return code;}
function sendError(ws,message){ws.send({type:'error',message});}
function leave(ws){const room=ws.room;if(!room)return;ws.room=null;const p=ws.player;ws.player=null;room.remove(ws);if(room.players.length===0)rooms.delete(room.code);}
server.on('upgrade',(req,stream,head)=>upgrade(req,stream,head,ws=>{
  sockets.add(ws);ws.send({type:'hello',heroes:HEROES,modes:MODES});
  ws.on('close',()=>{leave(ws);sockets.delete(ws);});
  ws.on('message',m=>{
    if(!m||typeof m!=='object'||Array.isArray(m))return;
    if(m.type==='create'){
      if(ws.room)return sendError(ws,'이미 방에 입장해 있습니다.');
      if(!MODES[m.mode])return sendError(ws,'대전 모드를 선택해주세요.');
      if(rooms.size>=400)return sendError(ws,'현재 방이 가득 찼습니다.');
      const room=new Arena(m.mode,roomCode());rooms.set(room.code,room);
      const p=room.add(ws,m.name,m.hero);ws.room=room;ws.player=p;ws.send({type:'joined',id:p.id,room:room.info()});return;
    }
    if(m.type==='join'){
      if(ws.room)return sendError(ws,'이미 방에 입장해 있습니다.');
      const code=typeof m.code==='string'?m.code.trim().toUpperCase():'';
      const room=rooms.get(code);
      if(!room)return sendError(ws,'방을 찾을 수 없습니다. 방 코드를 확인해주세요.');
      if(room.status!=='lobby')return sendError(ws,'이미 대전이 시작된 방입니다.');
      if(room.players.length>=room.max)return sendError(ws,'방에 빈자리가 없습니다.');
      const p=room.add(ws,m.name,m.hero);ws.room=room;ws.player=p;ws.send({type:'joined',id:p.id,room:room.info()});return;
    }
    if(m.type==='leave'){leave(ws);ws.send({type:'left'});return;}
    const room=ws.room,p=ws.player;if(!room||!p)return;
    room.lastActivity=Date.now();
    if(m.type==='hero')room.setHero(p,m.hero);
    if(m.type==='team')room.setTeam(p,Number(m.team));
    if(m.type==='start'){if(!room.start(p))sendError(ws,'게임을 시작할 수 없습니다. 인원과 팀 구성을 확인하세요.');}
    if(m.type==='again')room.reset(p);
    if(m.type==='input'&&room.status==='playing'){
      const v=m.keys||{};
      p.input={up:v.up===true,down:v.down===true,left:v.left===true,right:v.right===true,aim:typeof m.aim==='number'&&Number.isFinite(m.aim)?Math.max(-100,Math.min(100,m.aim)):null};
    }
    if(m.type==='action'&&room.status==='playing'){
      const now=Date.now();if(now-p.lastAction<65)return;p.lastAction=now;room.action(p,Number(m.slot));
    }
    if(m.type==='chat'){
      const now=Date.now();p.chatTimes=(p.chatTimes||[]).filter(t=>now-t<10000);
      if(p.chatTimes.length>=6)return sendError(ws,'채팅을 너무 빠르게 보내고 있습니다.');
      p.chatTimes.push(now);
      const text=typeof m.text==='string'?m.text.trim().replace(/[<>\x00-\x1f]/g,'').slice(0,110):'';
      if(text)room.broadcast({type:'chat',id:p.id,name:cleanName(p.name),text});
    }
  });
}));
let last=Date.now(),tick=0;
const loop=setInterval(()=>{
  const now=Date.now();const dt=Math.min(.075,(now-last)/1000);last=now;
  for(const r of rooms.values()){
    r.update(dt);
    if(++tick%2===0&&r.status==='playing')r.broadcast(r.snapshot());
    if(now-r.lastActivity>1000*60*60*2){for(const p of r.players)p.ws.send({type:'error',message:'비활성 방이 종료되었습니다.'});for(const p of [...r.players])leave(p.ws);}
  }
},33);
loop.unref();
if(require.main===module)server.listen(PORT,'0.0.0.0',()=>console.log(`Magic Arena on http://localhost:${PORT}`));
module.exports={server,rooms};
