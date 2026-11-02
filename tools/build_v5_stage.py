from PIL import Image,ImageDraw,ImageEnhance,ImageFilter
from pathlib import Path
import random, math
random.seed(47)
ROOT=Path(__file__).resolve().parents[1]
S=ROOT/'public/assets/stages';S.mkdir(parents=True,exist_ok=True)
source=Image.open(S/'magnolia_concept_stage.webp').convert('RGB')
source2=Image.open(S/'magnolia_v3.png').convert('RGB')
W,H=3600,1024
# Extended 3-zone guild town: distinct architecture in each sector and consistent stone floor.
base=Image.new('RGB',(W,H)); pix=base.load()
for y in range(H):
 t=min(1,max(0,y/950));
 for x in range(W):
  # subtle daylight and blue hour horizon
  wave=7*math.sin(x/600)
  pix[x,y]=(int(72+t*95+wave),int(119+t*57+wave/2),int(172+t*12))
# Buildings composed from provided stage art; lower edges dissolve into handmade masonry.
for idx,(px,flip,style) in enumerate([(0,True,'city'),(1160,False,'guild'),(2350,True,'city')]):
 panel=(source if style=='guild' else source.crop((0,0,1000,720)) if idx==0 else source.crop((280,0,1280,720)))
 panel=panel.resize((1320,790),Image.Resampling.BICUBIC)
 if flip:panel=panel.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
 overlay=Image.new('RGBA',panel.size);ov=overlay.load()
 for y in range(panel.height):
  # soft upper join and lower flatten before floor
  alpha=255 if y>65 else int(255*y/65)
  if y>710:alpha=int(255*max(0,(790-y)/80))
  for x in range(panel.width):
   edge= min(1,(x+1)/110,(panel.width-x)/110) if idx!=1 else min(1,(x+1)/80,(panel.width-x)/80)
   ov[x,y]=(255,255,255,max(0,min(255,int(alpha*edge))))
 base.paste(panel,(px,63),overlay.getchannel('A'))
# Force solid world cobblestone ground at player feet.
draw=ImageDraw.Draw(base)
draw.rectangle((0,844,W,H),fill='#7e7780')
draw.rectangle((0,839,W,848),fill='#e4d0a4')
draw.rectangle((0,848,W,856),fill='#4b4960')
for row in range(10):
 yy=862+row*19
 for col in range(-1,80):
  xx=col*67+(row%2)*33+random.randint(-4,4);width=51+random.randint(-7,10)
  a=random.choice(['#a9a4a3','#c5b3a1','#d1c5b4','#8f8a94','#b5a8a4'])
  draw.rounded_rectangle((xx,yy+random.randint(0,3),xx+width,yy+12),radius=3,fill=a,outline='#494b5f',width=2)
# Decorative architectural foreground props and overworld props above the floor.
for x in [90,665,1050,1375,2110,2580,3330,3520]:
 y=840
 draw.rectangle((x-10,y-164,x+10,y-3),fill='#56445a')
 draw.rectangle((x-13,y-169,x+13,y-155),fill='#b7a585')
 draw.rectangle((x-8,y-160,x+8,y-139),fill='#2c314b')
 draw.polygon([(x-18,y-169),(x,y-203),(x+18,y-169)],fill='#6e3e54',outline='#f4ca7d')
 draw.ellipse((x-7,y-158,x+7,y-146),fill='#ffe8a0')
 draw.line((x,y-143,x,y-133),fill='#ffe5aa',width=4)
for x in [410,1220,1930,2830,3200]:
 y=826;draw.rectangle((x-36,y-36,x+36,y+10),fill='#5b4b51',outline='#f3bc79',width=4)
 for j in range(6):
  a=j*math.pi*2/6;cx=x+int(math.cos(a)*18);cy=y-45+int(math.sin(a)*7)
  draw.ellipse((cx-7,cy-7,cx+7,cy+7),fill=['#ed798f','#ffb5a5','#eff7a2'][j%3])
 draw.line((x-43,y-37,x+45,y-37),fill='#cec08b',width=5)
# Banners on the long bridge promenade, each one consistent with the guild theme.
for x in [485,1580,1850,2960]:
 draw.rectangle((x-7,365,x+7,536),fill='#564451')
 draw.polygon([(x-47,410),(x+47,410),(x+47,515),(x,546),(x-47,515)],fill='#8d3a4c',outline='#f1c47f')
 draw.polygon([(x-24,447),(x+2,428),(x+20,457),(x-6,479),(x-24,468)],fill='#f4dec3')
# Glowing stars above foreground for mood.
for i in range(130):
 x=random.randrange(W);y=random.randrange(60,820)
 if i%3==0:
  draw.point((x,y),fill='#fff6ca')
  draw.line((x-3,y,x+3,y),fill='#fff6ca',width=1)
  draw.line((x,y-3,x,y+3),fill='#fff6ca',width=1)
base.save(S/'magnolia_v5_world.webp',quality=88,method=6)
# Hand-pixelated alternate background using nearest-neighbor 1/2 resolution, not a low-quality stretched thumbnail.
pixel=base.resize((1800,512),Image.Resampling.NEAREST).resize((W,H),Image.Resampling.NEAREST)
pixel=ImageEnhance.Color(pixel).enhance(1.15)
pixel.save(S/'magnolia_v5_pixel.webp',quality=85,method=6)
# Stage minimap strip for lobby preview.
base.crop((1090,160,2510,850)).resize((790,310),Image.Resampling.LANCZOS).save(S/'magnolia_v5_preview.webp',quality=88)
print('Created',S/'magnolia_v5_world.webp', 'size', (S/'magnolia_v5_world.webp').stat().st_size)
