"""Visual regression screenshots without live network access; fake socket only for rendering previews."""
from playwright.sync_api import sync_playwright
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'public'; html=(p/'index.html').read_text();css=(p/'style.css').read_text().split('*/',1)[-1] if False else (p/'style.css').read_text();css=css.replace("@import url('https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@400;500;600;700;800;900&display=swap');",'')
html=html.replace('<link rel="stylesheet" href="/style.css">','<base href="https://game.example/"><style>'+css+'</style>').replace('<script src="/game-client.js" defer></script>','<script>'+(p/'game-client.js').read_text()+'</script>')
mock=r'''<script>
history.replaceState=()=>{};
window.WebSocket=class{
 static OPEN=1;readyState=1;events={};
 constructor(){window.fake=this;setTimeout(()=>this.fire('open'),30)}
 addEventListener(k,f){(this.events[k]??=[]).push(f)}
 fire(k,obj){(this.events[k]||[]).forEach(f=>f(k==='message'?{data:JSON.stringify(obj)}:{}))}
 send(text){const m=JSON.parse(text);
  const room={code:'F4A1A1',mode:'duel',max:2,status:'lobby',leader:'p1',round:1,players:[{id:'p1',name:'NATSU',hero:'natsu',team:1},{id:'p2',name:'GRAY',hero:'gray',team:2}]};
  if(m.type==='create'){this.fire('message',{type:'joined',id:'p1',room});}
  if(m.type==='start'){
    room.status='playing';this.fire('message',{type:'start',room});this.fire('message',{type:'snapshot',status:'playing',time:86,players:[
    {id:'p1',name:'NATSU',hero:'natsu',team:1,x:300,y:598,face:0,hp:115,mana:82,ult:45,shield:0,alive:true,slow:false,cooldowns:[0,0,0,0,0],onGround:true,guard:false,attackPose:0,moving:false},
    {id:'p2',name:'GRAY',hero:'gray',team:2,x:975,y:598,face:Math.PI,hp:96,mana:99,ult:73,shield:0,alive:true,slow:false,cooldowns:[0,0,0,0,0],onGround:true,guard:false,attackPose:0,moving:false}
    ],projectiles:[{x:650,y:483,r:29,color:'#ff933d',vx:650,kind:'fire'}],effects:[{x:740,y:458,r:62,color:'#76d6ff',ttl:.42,kind:'freeze'}]});}
 }
}
</script>'''
html=html.replace('<script>\'use strict\';',mock+'<script>\'use strict\';')
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':390,'height':844})
 def rr(route):
  name=route.request.url.removeprefix('https://game.example/').split('?')[0]; fp=p/name
  if fp.is_file():route.fulfill(path=str(fp))
  else:route.abort()
 page.route('https://game.example/**',rr)
 page.on('pageerror',lambda e:print('PAGE ERROR:',str(e)[:250]))
 page.set_content(html,wait_until='domcontentloaded',timeout=8000)
 page.wait_for_timeout(300)
 print('Home cards:',page.locator('.hero-card').count());page.screenshot(path=str(p.parent/'mobile_home_preview.png'),full_page=True)
 page.click('#create');page.wait_for_timeout(100)
 print('Lobby:',page.locator('#lobby').is_visible(),'start enable:',page.locator('#start').is_enabled())
 page.screenshot(path=str(p.parent/'mobile_lobby_preview.png'),full_page=True)
 page.click('#start');page.wait_for_timeout(1200)
 print('Battle:',page.locator('#battle').is_visible(),'canvas size',page.locator('#arena').evaluate('e=>[e.width,e.height]'))
 page.screenshot(path=str(p.parent/'mobile_battle_preview.png'),full_page=True)
 b.close()
