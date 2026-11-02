"""Generate crisp, editable-in-code pixel-art fighters and Magnolia-inspired arena."""
from PIL import Image,ImageDraw,ImageFilter,ImageEnhance
from pathlib import Path
import random,math
OUT=Path(__file__).resolve().parents[1]/'public/assets'; random.seed(117)
S=3
PALETTES={
'natsu':dict(hair='#e78495',light='#ffbdc0',shadow='#7b3956',skin='#f2bf94',face='#f9d3a5',shade='#b98068',coat='#27263b',body='#e5a978',accent='#fa642d',pants='#e4e1d3',shoe='#433046',bright='#ffdf8a'),
'lucy':dict(hair='#e4c56b',light='#fff0a1',shadow='#987945',skin='#f4c6a6',face='#ffdfbc',shade='#ba8c75',coat='#eff4e6',body='#3155aa',accent='#76b5f3',pants='#1a3769',shoe='#5e3632',bright='#ffec9b'),
'erza':dict(hair='#a93f51',light='#ee6f6e',shadow='#642b4a',skin='#f2c39e',face='#ffd8b5',shade='#b58368',coat='#bec5d8',body='#8a2946',accent='#f2d29b',pants='#c4c9d5',shoe='#5f3648',bright='#ffe5cc'),
'gray':dict(hair='#222d45',light='#607292',shadow='#151c2f',skin='#eab48f',face='#f7d0ac',shade='#ac806d',coat='#23354e',body='#d5b193',accent='#7fd9f7',pants='#202b49',shoe='#182035',bright='#c5f5ff')}

def fighter(hero,pose):
 p=PALETTES[hero]; I=Image.new('RGBA',(64,84));d=ImageDraw.Draw(I)
 def rect(box,c):d.rectangle(tuple(map(int,box)),fill=c)
 def poly(pts,c):d.polygon(pts,fill=c)
 def ln(pts,c,width=1):d.line(pts,fill=c,width=width,joint='curve')
 out='#1b1a2b'; light=p['light']
 jump=pose=='jump'; run=pose in ('run1','run2'); attack=pose=='attack'; cast=pose=='cast'; hurt=pose=='hurt'; victory=pose=='victory'; idle2=pose=='idle2'
 bob=-2 if idle2 else (-4 if run and pose=='run1' else (-9 if jump else 0))
 # entire sprite slightly offset
 d.rectangle((1,1,1,1),fill=(0,0,0,0))
 Y=lambda y:y+bob
 # hair flowing behind left shoulder
 if hero in ('lucy','erza'):
  poly([(24,Y(20)),(16,Y(27)),(12,Y(44)),(10,Y(57)),(21,Y(55)),(29,Y(35))],out)
  poly([(22,Y(21)),(18,Y(29)),(14,Y(53)),(20,Y(51)),(27,Y(33))],p['shadow'])
  ln([(17,Y(39)),(16,Y(50))],light,2)
 # cape tails
 if hero in ('natsu','erza'):
  poly([(24,Y(40)),(13,Y(51)),(9,Y(66)),(28,Y(60)),(37,Y(49))],out)
  poly([(25,Y(41)),(15,Y(52)),(13,Y(63)),(29,Y(58)),(34,Y(47))],p['coat'])
  poly([(17,Y(53)),(13,Y(62)),(25,Y(58))],p['accent'])
 # boots and separated legs
 if jump:
  legs=[[(30,Y(57)),(25,Y(64)),(19,Y(65)),(16,Y(72)),(23,Y(76)),(35,Y(68)),(37,Y(57))],[(37,Y(57)),(43,Y(66)),(50,Y(67)),(53,Y(75)),(45,Y(78)),(34,Y(69))]]
 elif run:
  s=1 if pose=='run1' else -1
  legs=[[(28,Y(56)),(27-7*s,Y(67)),(21-9*s,Y(76)),(32-8*s,Y(79)),(41,Y(59))],[(39,Y(56)),(45+7*s,Y(68)),(46+9*s,Y(79)),(54+5*s,Y(79)),(38,Y(61))]]
 else:
  legs=[[(28,Y(55)),(25,Y(68)),(20,Y(76)),(31,Y(77)),(37,Y(60))],[(37,Y(55)),(42,Y(67)),(44,Y(77)),(55,Y(77)),(47,Y(62))]]
 for j,pts in enumerate(legs):
  poly(pts,out);poly([(x+(2 if j==0 else -2),y-3) for x,y in pts[:-1]],p['pants'])
  foot= (18 if j==0 else 43)+( (-8 if j==0 else 8) if run else 0)
  rect((foot,Y(72),foot+13,Y(78)),out);rect((foot+2,Y(73),foot+12,Y(76)),p['shoe']);rect((foot+3,Y(74),foot+8,Y(74)),p['light'])
 # shirt and coat
 poly([(25,Y(39)),(42,Y(37)),(49,Y(53)),(44,Y(59)),(25,Y(58)),(21,Y(48))],out)
 poly([(27,Y(40)),(41,Y(40)),(46,Y(51)),(42,Y(56)),(26,Y(56)),(24,Y(49))],p['body'])
 if hero=='natsu':
  poly([(23,Y(40)),(27,Y(40)),(28,Y(55)),(24,Y(61)),(19,Y(51))],p['coat']);poly([(41,Y(38)),(45,Y(38)),(50,Y(58)),(43,Y(63)),(42,Y(54))],p['coat'])
  ln([(29,Y(52)),(42,Y(52))],'#8c5a4b',1)
 elif hero=='erza':
  poly([(23,Y(38)),(35,Y(37)),(41,Y(46)),(44,Y(55)),(23,Y(56))],p['coat'])
  rect((26,Y(45),44,Y(48)),p['accent']);rect((30,Y(39),37,Y(52)),'#eae8db');rect((34,Y(44),36,Y(52)),p['shadow'])
  poly([(41,Y(39)),(48,Y(48)),(44,Y(55)),(39,Y(49))],'#a2aac2')
 elif hero=='lucy':
  poly([(24,Y(38)),(29,Y(38)),(28,Y(56)),(22,Y(59)),(19,Y(46))],p['coat']);poly([(41,Y(39)),(47,Y(40)),(49,Y(57)),(44,Y(58))],p['coat'])
  rect((30,Y(42),39,Y(48)),p['accent']);rect((31,Y(51),45,Y(53)),'#e2b666')
 else:
  rect((24,Y(40),42,Y(51)),p['skin']);ln([(29,Y(49)),(41,Y(50))],p['shade'],2)
  poly([(42,Y(40)),(46,Y(42)),(47,Y(54)),(42,Y(58))],p['coat'])
 rect((29,Y(55),44,Y(59)),out);rect((31,Y(56),42,Y(57)),p['accent'])
 # arms, dynamically posed
 if hurt:
  left=[(25,Y(40)),(18,Y(45)),(12,Y(47)),(9,Y(43))];right=[(44,Y(40)),(49,Y(48)),(52,Y(51))]
 elif victory:
  left=[(26,Y(39)),(19,Y(30)),(14,Y(21)),(9,Y(17))];right=[(43,Y(39)),(50,Y(28)),(54,Y(22))]
 elif attack:
  left=[(27,Y(40)),(20,Y(48)),(20,Y(59))];right=[(42,Y(40)),(51,Y(37)),(60,Y(33))]
 elif cast:
  left=[(25,Y(40)),(17,Y(35)),(12,Y(26))];right=[(43,Y(39)),(50,Y(26)),(57,Y(19))]
 else:
  left=[(25,Y(40)),(21,Y(48)),(20,Y(57))];right=[(43,Y(40)),(49,Y(45)),(51,Y(54))]
 for arm in [left,right]:
  ln(arm,out,8);ln(arm,p['coat'] if hero in ('lucy','erza') else p['skin'],5)
  x,y=arm[-1];rect((x-3,y-3,x+3,y+3),out);rect((x-2,y-2,x+2,y+2),p['skin'])
 # face neck
 rect((31,Y(34),38,Y(41)),out);rect((32,Y(34),37,Y(40)),p['shade'])
 poly([(24,Y(17)),(31,Y(12)),(43,Y(15)),(47,Y(23)),(44,Y(34)),(35,Y(39)),(26,Y(35)),(22,Y(27))],out)
 poly([(25,Y(18)),(31,Y(15)),(42,Y(17)),(45,Y(24)),(42,Y(33)),(35,Y(36)),(27,Y(33)),(24,Y(27))],p['face'])
 rect((25,Y(29),29,Y(34)),p['shade']);rect((27,Y(31),30,Y(32)),p['skin'])
 # ears and eyebrows, determined eyes
 rect((42,Y(25),46,Y(30)),p['skin'])
 rect((35,Y(25),41,Y(27)),'#332936');rect((36,Y(26),39,Y(29)),'#f4f5f8');rect((39,Y(26),40,Y(30)),'#14192b')
 rect((27,Y(25),30,Y(26)),'#3f2c37');rect((27,Y(26),29,Y(28)),'#f7f5ed')
 ln([(35,Y(33)),(39,Y(33))],'#ad6b6b',1)
 # hair back outline + jagged fringe
 poly([(21,Y(22)),(20,Y(16)),(15,Y(15)),(22,Y(11)),(17,Y(6)),(28,Y(9)),(31,Y(3)),(36,Y(9)),(44,Y(5)),(43,Y(12)),(50,Y(12)),(47,Y(20)),(44,Y(23)),(40,Y(17)),(34,Y(20)),(30,Y(18)),(27,Y(26)),(25,Y(21))],out)
 poly([(22,Y(19)),(22,Y(14)),(18,Y(14)),(26,Y(11)),(22,Y(8)),(30,Y(11)),(32,Y(6)),(36,Y(11)),(43,Y(8)),(42,Y(14)),(47,Y(14)),(45,Y(20)),(40,Y(15)),(34,Y(19)),(30,Y(16)),(27,Y(23)),(25,Y(18))],p['hair'])
 poly([(24,Y(12)),(31,Y(12)),(34,Y(7)),(35,Y(12)),(43,Y(9)),(40,Y(15)),(33,Y(15)),(28,Y(20)),(26,Y(16))],light)
 poly([(23,Y(16)),(26,Y(21)),(22,Y(28)),(20,Y(23))],p['shadow'])
 if hero=='natsu':
  # white scale scarf draped to left
  poly([(25,Y(35)),(30,Y(34)),(37,Y(38)),(39,Y(43)),(28,Y(45)),(20,Y(42)),(18,Y(48)),(15,Y(52)),(16,Y(42)),(19,Y(36))],out)
  poly([(22,Y(36)),(28,Y(35)),(35,Y(39)),(35,Y(42)),(27,Y(43)),(20,Y(40)),(19,Y(47)),(17,Y(49)),(19,Y(40))],'#e5e6dc')
  for yy in range(37+bob,45+bob,3):ln([(22,yy),(31,yy+1)],'#949aad',1)
 if hero=='lucy':
  # blue bow on high ponytail
  poly([(18,Y(15)),(11,Y(9)),(11,Y(18)),(18,Y(19)),(17,Y(25)),(25,Y(23)),(20,Y(16))],out)
  poly([(17,Y(15)),(12,Y(12)),(13,Y(18)),(17,Y(17)),(18,Y(22)),(22,Y(22))],p['body'])
 if hero=='erza':
  # long scarlet ponytail over shoulder
  poly([(24,Y(14)),(19,Y(24)),(15,Y(40)),(19,Y(49)),(27,Y(45)),(23,Y(35)),(25,Y(22))],out)
  poly([(24,Y(16)),(20,Y(25)),(17,Y(40)),(20,Y(46)),(25,Y(43)),(21,Y(34))],p['hair'])
 if hero=='gray':
  # ice-maker neck charm
  rect((34,Y(39),37,Y(43)),'#9ad9fc')
 # prop swords & cast magic, sparkling
 if hero=='erza':
  if attack or victory:
   ln([(58,Y(31)),(63,Y(4))],'#b1d8ec',3);ln([(59,Y(28)),(63,Y(5))],'#f8faff',1);rect((54,Y(30),62,Y(32)),'#f2b86a')
  else:
   ln([(49,Y(56)),(57,Y(34))],'#e8f2f4',2);rect((48,Y(54),54,Y(56)),'#d9a56c')
 if hero=='lucy':
  # celestial golden key
  x,y=right[-1]; rect((x+2,y-3,x+4,y+8),'#e5a42f'); rect((x,y-6,x+6,y),p['bright']);rect((x+2,y-4,x+4,y-2),p['skin'])
 if cast:
  x,y=right[-1]; rect((x-3,y-8,x+5,y-6),p['bright']);rect((x,y-11,x+2,y-2),'#e7e9ff')
 # monochrome thick outlines softened by edge highlights at bottom
 return I.resize((64*S,84*S),Image.Resampling.NEAREST)

for hero in PALETTES:
 for pose in ('idle1','idle2','run1','run2','attack','cast','jump','hurt','victory'):
  fighter(hero,pose).save(OUT/'sprites'/f'{hero}_{pose}.png',optimize=True)

# crop portrait artwork from generated game concept. Each is own image with animated/painterly likeness
source=Path('/mnt/data/a_highly_detailed_pixel_art_fighting_game_ui_scree.png')
src=Image.open(source).convert('RGB') if source.exists() else None
boxes={'natsu':(921,82,1091,222),'lucy':(1111,75,1280,221),'erza':(1292,76,1467,221),'gray':(1482,76,1646,221)}
if src is not None:
 for who,box in boxes.items():
  crop=src.crop(box).resize((360,300),Image.Resampling.LANCZOS)
  crop.save(OUT/'portraits'/f'{who}.webp',quality=92)

# Pixel perfect fantasy town scene. Artwork at 640x360, doubled as true pixel geometry.
w,h=640,360
im=Image.new('RGB',(w,h),'#7bb8e5');d=ImageDraw.Draw(im)
# sky gradient
for y in range(0,225):
 t=y/225;c=(round(113+58*t),round(177+25*t),round(222+2*t));d.line((0,y,640,y),fill=c)
# wispy block clouds
for cx,cy in [(65,40),(165,27),(390,45),(545,23),(605,78)]:
 for j,(dx,dy,r) in enumerate([(-27,10,15),(-9,3,18),(12,0,14),(29,11,12),(1,17,22)]):
  d.rectangle((cx+dx-r,cy+dy-r//3,cx+dx+r,cy+dy+r//2),fill='#d9e8e6' if j%3==0 else '#f1f1df')
  d.line((cx+dx-r+2,cy+dy-r//3+2,cx+dx+r-3,cy+dy-r//3+2),fill='#fff7e7',width=2)
# distant mountains
for i in range(18):
 x=i*48-27;y=118+random.randint(-28,20)
 d.polygon([(x,193),(x+25,y),(x+49,193)],fill='#739fb5')
 d.polygon([(x+18,y+14),(x+25,y),(x+30,y+11)],fill='#c0d6de')
# castle silhouette
for cx,cy,s in [(310,99,1),(344,70,1),(378,101,1),(415,82,1)]:
 d.rectangle((cx,cy,cx+23,206),fill='#b3b9c1',outline='#5f8297',width=2)
 d.polygon([(cx-4,cy),(cx+12,cy-28),(cx+27,cy)],fill='#bb6e6e')
 for yy in range(cy+18,180,22):d.rectangle((cx+9,yy,cx+13,yy+12),fill='#526c81')
# left and right market buildings
for side in ('left','right'):
 for n in range(3):
  if side=='left':x=-38+n*68
  else:x=475+n*70
  top=79+(n%2)*19
  ww=73
  d.rectangle((x,top+32,x+ww,244),fill='#d5c7ab',outline='#6d6e79',width=2)
  # brick pattern
  for yy in range(top+39,240,15):
   d.line((x+3,yy,x+ww-3,yy),fill='#a7a99f',width=1)
   for xx in range(x+(yy%22),x+ww-4,28):d.line((xx,yy,xx,yy+6),fill='#b6a995')
  d.polygon([(x-8,top+34),(x+13,top),(x+ww-16,top-6),(x+ww+8,top+34)],fill='#693f4d')
  for py in range(top+5,top+30,5):d.line((x+12,py,x+ww-16,py-5),fill='#a65c58',width=2)
  for wx in (x+14,x+44):
   d.rectangle((wx,top+56,wx+16,top+86),fill='#584a55',outline='#ede3d5',width=2)
   d.rectangle((wx+3,top+59,wx+13,top+79),fill='#7a9caf')
   d.line((wx+8,top+60,wx+8,top+81),fill='#ddd3bc')
   d.rectangle((wx,top+106,wx+18,top+140),fill='#554d52',outline='#bca68c',width=2)
  d.rectangle((x+3,222,x+ww-3,247),fill='#71626b')
  # shop awning
  d.polygon([(x-5,200),(x+ww+5,200),(x+ww+9,216),(x-8,216)],fill='#d7b99a')
  for k in range(0,ww+6,15):d.polygon([(x+k,200),(x+k+10,200),(x+k+9,216),(x+k-1,216)],fill='#ad5460')
# guild central building
cx=320
# ground buildings/rear wing
d.rectangle((202,115,438,235),fill='#c0aa94',outline='#645969',width=3)
for yy in range(126,231,15):
 d.line((205,yy,436,yy),fill='#a89083')
 for xx in range(207+(yy%20),432,35):d.line((xx,yy,xx,yy+8),fill='#b2a08e')
# roof
d.polygon([(184,124),(226,80),(407,79),(457,126)],fill='#3e3e5a')
d.polygon([(193,122),(231,86),(404,85),(447,123)],fill='#9b5760')
for y in range(95,122,7):d.line((219-y//8,y,420+y//8,y),fill='#cd7770',width=2)
# turrets
for x in (203,416):
 d.rectangle((x,87,x+22,196),fill='#b5a99d',outline='#665e71',width=2)
 d.polygon([(x-5,88),(x+11,55),(x+27,88)],fill='#77405c')
 d.rectangle((x+8,107,x+13,127),fill='#44556a')
# pillars + arch
for x in (258,361):
 d.rectangle((x,142,x+20,241),fill='#857f82');d.rectangle((x+3,144,x+16,237),fill='#e2ccb2')
 d.rectangle((x-3,137,x+25,145),fill='#655e68')
d.rectangle((281,164,360,239),fill='#443747')
d.arc((279,145,363,198),180,360,fill='#f5e1bd',width=6)
d.rectangle((292,181,349,238),fill='#54404c');d.line((320,181,320,238),fill='#a98574',width=2)
# guild sign
d.rounded_rectangle((252,118,387,145),radius=3,fill='#e3c69a',outline='#5c3e44',width=4)
d.text((267,124),'FAIRY  TAIL',fill='#744d4c',stroke_width=0)
# red long banners at both sides
for x in (238,398):
 d.polygon([(x-12,122),(x+13,122),(x+13,185),(x,199),(x-12,185)],fill='#8f3949',outline='#e8b27c')
 d.ellipse((x-6,146,x+6,160),outline='#f6d49c',width=2)
 d.polygon([(x,148),(x+6,154),(x+1,164),(x-5,157)],fill='#f0c88b')
# foreground lanterns
for x in (116,518):
 d.line((x,184,x,244),fill='#3e4954',width=4)
 d.rectangle((x-7,191,x+7,214),fill='#453b50',outline='#b09c8b',width=2)
 d.rectangle((x-4,194,x+4,210),fill='#f4c77e')
 d.ellipse((x-21,237,x+21,250),fill='#64646a')
# street behind foreground
d.rectangle((0,240,640,360),fill='#b9aa9f')
# stone pavement angled rows
for y in range(247,365,12):
 stride=int(27+(y-240)*.46)
 for x in range(-70+(y%21)*2,710,stride):
  x1=x+2;y1=y+2;x2=x+stride-3;y2=y+11
  tone=random.choice(['#c5b6a8','#c1afa3','#ab9f97','#d3c3b6','#b7aca4'])
  d.polygon([(x1+3,y1),(x2-3,y1),(x2,y1+3),(x2-4,y2),(x1+2,y2),(x1,y1+4)],fill=tone,outline='#867f85')
  d.line((x1+5,y1+2,x2-7,y1+2),fill='#dfd0bd')
# embedded guild emblem in ground
for r in (43,37):d.ellipse((320-r,305-r//3,320+r,305+r//3),outline='#9f6875',width=2)
d.polygon([(306,300),(319,283),(329,301),(342,298),(327,315),(316,315)],fill='#a77576')
# foliage
for x,y in [(12,189),(33,177),(70,180),(586,182),(613,172),(639,190)]:
 for rr in range(10):
  xx=x+random.randint(-23,23);yy=y+random.randint(-26,20)
  d.rectangle((xx,yy,xx+7,yy+6),fill=random.choice(['#5e8866','#7ca278','#a1b185','#50745d','#89a16e']))
# pixels on stone
for i in range(500):
 x=random.randrange(640);y=random.randrange(256,360)
 if random.random()<.5:d.point((x,y),fill=random.choice(['#d8c7b7','#928b85','#e2cfbd']))
# scene resized to render resolution so canvas draws pixel texture crisp
im=im.resize((1280,720),Image.Resampling.NEAREST)
im.save(OUT/'stages'/'magnolia.png',optimize=True)
# smaller preview art used in lobby
im.resize((640,360),Image.Resampling.NEAREST).save(OUT/'stages'/'magnolia_preview.png',optimize=True)
print('Artwork generated:',len(list(OUT.rglob('*.png'))),'PNGs and portraits')
