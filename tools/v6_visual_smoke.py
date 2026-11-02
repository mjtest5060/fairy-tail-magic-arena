"""Browser smoke using local static assets + in-page mock socket; real combat covered by Node tests."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'public/index.html').read_text()
css=(root/'public/style.css').read_text()+'\n'+(root/'public/v6-theme.css').read_text()
css=css.replace("@import url('https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@400;500;600;700;800;900&display=swap');",'')
mock=r'''<script>
history.replaceState=()=>{};
class MockSocket extends EventTarget {
 static OPEN=1;
 readyState=0;room=null;
 constructor(){super();window.mockSocket=this;setTimeout(()=>{this.readyState=1;this.dispatchEvent(new Event('open'));this.say({type:'hello'})},40)}
 say(data){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(data)}))}
 send(raw){const m=JSON.parse(raw);if(m.type==='aiBattle'||m.type==='practice'||m.type==='create'){
  let ai=m.type!=='create';this.room={code:'V6A001',mode:'duel',max:2,status:'lobby',leader:'p1',practice:ai,aiDifficulty:m.difficulty||'master',players:[{id:'p1',name:'검수 도전자',hero:m.hero,team:1},{id:'p2',name:ai?'S급 AI':'BLUE TEAM',hero:m.opponent||'gray',team:2,isBot:ai}],roundIndex:1,bestOf:3};
  this.say({type:'joined',id:'p1',room:this.room});if(ai){this.room.status='playing';this.say({type:'start',room:this.room});this.snapLoop();}
 }else if(m.type==='ping')this.say({type:'pong',sent:m.sent});else if(m.type==='action')this.say({type:'cast',player:'p1',hero:this.room?.players[0]?.hero||'natsu',slot:m.slot,comboStep:2});}
 snapLoop(){let n=0;let heroes={natsu:[125,100],lucy:[103,115],erza:[140,100],gray:[113,110]};const pl=[{id:'west-low',x:265,y:726,w:390,h:30,style:'stone'},{id:'west-mid',x:700,y:598,w:340,h:30,style:'wood'},{id:'west-high',x:1090,y:468,w:270,h:26,style:'stone'},{id:'center-low',x:1170,y:736,w:410,h:28,style:'stone'},{id:'center-mid',x:1480,y:602,w:390,h:30,style:'wood'},{id:'center-high',x:1810,y:478,w:280,h:28,style:'stone'},{id:'east-low',x:2100,y:728,w:370,h:30,style:'stone'},{id:'east-mid',x:2470,y:594,w:390,h:28,style:'wood'},{id:'east-high',x:2800,y:470,w:290,h:28,style:'stone'},{id:'far-east',x:3010,y:726,w:350,h:28,style:'stone'}];
 const push=()=>{if(!this.room)return;const player=this.room.players[0],ai=this.room.players[1],h1=heroes[player.hero],h2=heroes[ai.hero];
 const y=n%80<38?852:n%80<52?790:726;
 this.say({type:'snapshot',status:'playing',time:102-Math.floor(n/14),tick:n,roundIndex:1,scores:[{id:'p1',roundWins:0},{id:'p2',roundWins:0}],world:{width:3600,height:1024,floor:852,platforms:pl},pickupClock:12,pickups:[{id:'h1',x:1700,y:570,amount:30,ttl:10},{id:'h2',x:1830,y:810,amount:30,ttl:10}],fields:[{id:'f1',kind:'flame',x:1610,y:665,r:115,ttl:3,pulse:.5}],projectiles:[{x:1860,y:655,r:26,color:'#ff993a',vx:750,kind:'fire'}],effects:[{kind:'slash',x:1605,y:640,r:70,color:'#ffb080',ttl:.4}],players:[
 {id:'p1',name:'검수 도전자',hero:player.hero,team:1,x:1500+Math.sin(n/12)*80,y,vx:190,vy:0,face:0,onGround:y===852||y===726,landPulse:.05,groundId:'floor',moving:true,attackPose:.13,animation:'run1',hp:h1[0]-21,mana:h1[1]-13,ult:95,shield:0,alive:true,slow:false,combo:3,chainStep:2,chainWindow:.5,guardMeter:80,guardBreak:false,hitstun:false,cooldowns:[0,0,0,0,0],kills:0,damage:55},
 {id:'p2',name:'S급 AI',hero:ai.hero,team:2,x:2120+Math.cos(n/11)*28,y:852,vx:-130,vy:0,face:Math.PI,onGround:true,groundId:'floor',landPulse:0,moving:true,attackPose:0,animation:'run1',hp:h2[0]-31,mana:h2[1]-14,ult:45,shield:0,alive:true,slow:false,combo:0,chainStep:0,guardMeter:100,guardBreak:false,hitstun:false,cooldowns:[0,0,0,0,0],kills:0,damage:9}]});n++;};
 push();this.timer=setInterval(push,85);}
}
window.WebSocket=MockSocket;
</script>'''
html=html.replace('<link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/v6-theme.css">','<base href="https://arena.example/"><style>'+css+'</style>')
html=html.replace('<script src="/game-client.js" defer></script>',mock+'<script>'+(root/'public/game-client.js').read_text()+'</script>')
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1440,'height':930},device_scale_factor=1)
 def route_cb(route):
  relative=route.request.url.replace('https://arena.example/','').split('?')[0]
  fp=root/'public'/relative
  if fp.is_file():route.fulfill(path=str(fp))
  else:route.abort()
 page.route('https://arena.example/**',route_cb)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded',timeout=20000)
 page.wait_for_timeout(1200)
 print('HOME',page.title(), 'cards',page.locator('.hero-card').count(),'errors',errors[:5],flush=True)
 page.locator('#home').screenshot(path=str(root/'previews/V6_HOME_PREVIEW.png'))
 page.locator('#name').fill('검수 도전자')
 page.locator('#practice').click()
 page.wait_for_timeout(3350)
 print('BATTLE',page.locator('#battle').is_visible(),'hp',page.locator('#hptext').inner_text(),'camera',page.evaluate('[window.fakeCam||0]'),'errors',errors[:5],flush=True)
 page.locator('#battle').screenshot(path=str(root/'previews/V6_BATTLE_PREVIEW.png'))
 page.locator('#fullscreenBtn').count()
 mobile=b.new_page(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
 mobile.route('https://arena.example/**',route_cb)
 mobile_errors=[];mobile.on('pageerror',lambda e:mobile_errors.append(str(e)))
 mobile.set_content(html,wait_until='domcontentloaded',timeout=20000)
 mobile.wait_for_timeout(1200)
 print('MOBILE errors',mobile_errors[:5],'overflow',mobile.evaluate('document.documentElement.scrollWidth>window.innerWidth'),flush=True)
 mobile.screenshot(path=str(root/'previews/V6_MOBILE_PREVIEW.png'),full_page=False)
 mobile.locator('#name').fill('모바일검수');mobile.locator('#practice').click();mobile.wait_for_timeout(1500)
 mobile.locator('#battle').screenshot(path=str(root/'previews/V6_MOBILE_BATTLE.png'))
 print('MOBILE BATTLE',mobile.locator('#battle').is_visible(),'errors',mobile_errors[:5],flush=True)
 b.close()
