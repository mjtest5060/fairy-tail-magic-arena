from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
from pathlib import Path
import math, random
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/assets/v6';OUT.mkdir(parents=True,exist_ok=True)
REF=Image.open('/mnt/data/페어리 테일 매직 아레나_ 아케인 클래시.png').convert('RGBA')
# Editorial illustration taken from the established concept art: left-side painting only, NOT gameplay HUD.
art=REF.crop((0,0,603,288)).resize((1206,576),Image.Resampling.LANCZOS)
# darken right-most edge so buttons can be legible; preserve its artwork on the left.
px=art.load()
for y in range(art.height):
 for x in range(art.width):
  f=max(0,(x-900)/306)
  if f: 
   r,g,b,a=px[x,y];px[x,y]=(int(r*(1-.85*f)),int(g*(1-.85*f)),int(b*(1-.85*f)),a)
art.convert('RGB').save(OUT/'key_visual.webp',quality=92,method=6)
# 5 crisp battle icon families for each character - transparent 256x256; original generated shapes.
P={'natsu':(255,105,50),'lucy':(255,224,132),'erza':(252,96,141),'gray':(110,210,255)}
random.seed(4807)
for hero,(r,g,b) in P.items():
 for action in range(5):
  s=384; a=Image.new('RGBA',(s,s)); d=ImageDraw.Draw(a,'RGBA');cx=cy=s//2
  for rad in range(166,14,-2):
   op=int(45*(1-rad/171)**1.4)
   d.ellipse((cx-rad,cy-rad,cx+rad,cy+rad),fill=(r,g,b,op))
  # Rotating guild runic circles
  for R in [152,133,119]:
   d.ellipse((cx-R,cy-R,cx+R,cy+R),outline=(r,g,b,110),width=3)
  for k in range(12):
   ang=k*math.pi/6;R=142
   X=cx+math.cos(ang)*R;Y=cy+math.sin(ang)*R
   d.line((X-math.cos(ang)*9,Y-math.sin(ang)*9,X+math.cos(ang)*9,Y+math.sin(ang)*9),fill=(255,242,208,210),width=4)
  def poly(pts,fill,outline=None,width=1):d.polygon(pts,fill=fill);outline and d.line(pts+[pts[0]],fill=outline,width=width,joint='curve')
  if hero=='natsu':
   # shape made of layered flames or dragon talons
   for j in range(8):
    ang=(j-3.5)*.35; R=65+(j%3)*18; X=cx+math.sin(ang)*R;Y=cy+math.cos(ang)*R
    poly([(X-24,Y+58),(X+21,Y+31),(X+5,Y-14),(X+15,Y-77-(action*5)%30),(X-18,Y-31),(X-40,Y+24)],(251,87+(j%3)*28,23,235),(255,195,74,230),4)
   d.ellipse((150,148,232,232),fill=(255,246,190,220))
  elif hero=='gray':
   for j in range(10):
    ang=math.pi*2*j/10;length=120 if j%2 else 91
    U=(math.cos(ang),math.sin(ang));V=(-U[1],U[0]);poly([(cx+U[0]*14+V[0]*13,cy+U[1]*14+V[1]*13),(cx+U[0]*length,cy+U[1]*length),(cx+U[0]*14-V[0]*13,cy+U[1]*14-V[1]*13)],(75,161,229,235),(210,248,255,230),4)
   d.ellipse((159,159,225,225),fill=(239,254,255,240))
  elif hero=='lucy':
   for j in range(5):
    a0=j*math.pi*2/5-math.pi/2;outer=116;inner=48
    vertices=[]
    for k in range(10):
     a1=a0+k*math.pi/5;rad=outer if k%2==0 else inner
     vertices.append((cx+math.cos(a1)*rad,cy+math.sin(a1)*rad))
    poly(vertices,(255,213,87,190),(255,250,208,255),5)
   d.ellipse((cx-32,cy-32,cx+32,cy+32),fill=(255,247,198,240))
  else:
   for j in range(3+action%2):
    delta=(j-1.5)*35
    poly([(cx-102+delta,cy+90),(cx+47+delta,cy-100),(cx+68+delta,cy-74),(cx-72+delta,cy+106)],(241,245,255,230),(255,95,156,250),5)
   d.ellipse((cx-24,cy-24,cx+24,cy+24),fill=(255,208,225,240))
  # Skill-specific rune overlays keep each of the five hotkeys visually distinct.
  d.ellipse((cx-43,cy-43,cx+43,cy+43),fill=(21,23,39,188),outline=(255,244,199,180),width=3)
  if action==0:  # strike / claw
   for off in [-22,0,22]:
    d.line((cx-34+off,cy+23,cx-4+off,cy-28),fill=(255,252,230,245),width=11)
  elif action==1: # dash / spear
   d.polygon([(cx-34,cy+18),(cx+15,cy-28),(cx+33,cy-4),(cx-7,cy+31)],fill=(255,253,235,235))
   d.polygon([(cx+4,cy-38),(cx+48,cy-39),(cx+42,cy+3)],fill=(252,226,170,235))
  elif action==2: # defensive / circle control
   d.arc((cx-33,cy-33,cx+33,cy+33),-40,245,fill=(255,254,233,255),width=12)
   d.ellipse((cx-10,cy-10,cx+10,cy+10),fill=(253,241,194,245))
  elif action==3: # wide blast
   pts=[]
   for j in range(16):
    ang=j*math.pi/8;rr=44 if j%2==0 else 19;pts.append((cx+math.cos(ang)*rr,cy+math.sin(ang)*rr))
   d.polygon(pts,fill=(255,247,218,245))
  else: # finisher / crown
   d.polygon([(cx-40,cy+32),(cx-44,cy-33),(cx-12,cy+1),(cx,cy-43),(cx+14,cy+1),(cx+44,cy-33),(cx+40,cy+32)],fill=(255,244,191,245),outline=(255,255,255,240))
  if action==4:
   for j in range(14):
    ang=j*math.pi*2/14;R=149
    X=cx+math.cos(ang)*R;Y=cy+math.sin(ang)*R;d.ellipse((X-5,Y-5,X+5,Y+5),fill=(255,255,231,220))
  elif action==0:
   d.arc((cx-101,cy-101,cx+101,cy+101),30,286,fill=(255,255,255,210),width=8)
  a.resize((160,160),Image.Resampling.LANCZOS).save(OUT/f'skill_{hero}_{action}.png',optimize=True)
# Decorative transparency flame motifs for panel corners.
size=512;f=Image.new('RGBA',(size,size));d=ImageDraw.Draw(f,'RGBA')
for j in range(42):
 ang=j*.53;rad=18+j*5.8;x=256+math.sin(ang)*rad;y=256+math.cos(ang)*rad
 col=(252,190,89,round((1-j/48)*110))
 d.arc((x-36,y-36,x+36,y+36),15+j,198+j,fill=col,width=3)
f.save(OUT/'guild_arc.png')
print('art assets', len(list(OUT.iterdir())))
