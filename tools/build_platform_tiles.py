from PIL import Image,ImageDraw
from pathlib import Path
import random,math
OUT=Path(__file__).resolve().parents[1]/'public/assets/v6'; random.seed(6017)
for kind in ('wood','stone'):
 im=Image.new('RGBA',(256,98));d=ImageDraw.Draw(im,'RGBA')
 isw=kind=='wood'; bright=(248,208,132,255) if isw else (238,226,195,255)
 gold=(216,153,84,255) if isw else (196,197,184,255)
 lower=(61,42,50,255) if isw else (54,58,73,255)
 # protruding lighted solid walking edge
 d.rectangle((0,0,255,8),fill=(72,50,56,255))
 d.rectangle((0,1,255,3),fill=bright)
 d.rectangle((0,4,255,8),fill=gold)
 d.rectangle((0,9,255,14),fill=(91,60,57,255) if isw else (97,107,110,255))
 d.rectangle((0,15,255,48),fill=lower)
 for x in range(0,256,32):
  shade=random.choice([0,15,27])
  if isw:
   c=(100+shade,67+shade//2,59+shade//3,255)
   d.polygon([(x,14),(x+30,15),(x+29,46),(x+1,47)],fill=c)
   d.line((x+3,18,x+29,19),fill=(160,111,76,155),width=2)
   d.line((x+6,43,x+25,43),fill=(32,21,40,145),width=2)
   for y in (22,39):d.ellipse((x+4,y,x+7,y+3),fill=(225,173,93,255))
  else:
   c=(116+shade,120+shade,124+shade,255)
   d.polygon([(x+2,18),(x+29,16),(x+31,45),(x+1,47)],fill=c)
   d.line((x+2,18,x+29,16),fill=(228,224,192,160),width=2)
   d.line((x+1,47,x+31,45),fill=(27,35,54,195),width=3)
  if x%64==0:
   d.rectangle((x+14,18,x+19,45),fill=(224,162,90,255) if isw else (176,166,156,255))
   d.ellipse((x+13,19,x+21,26),fill=(255,226,146,255))
 # lower arches and brackets
 for x in range(12,256,64):
  d.polygon([(x-10,47),(x+40,47),(x+26,67),(x+16,67)],fill=(79,54,66,255) if isw else (70,79,93,255),outline=(169,123,83,255) if isw else (152,159,154,255))
  d.line((x+3,48,x+20,60,x+32,48),fill=(238,199,117,185) if isw else (188,201,207,180),width=2)
 # rim on top and vine/flowers
 for x in range(0,256,10):
  if random.random()>.48:
   y=random.choice([0,1,-1]);d.rectangle((x,y,x+6,y+2),fill=(255,247,188,200))
  if random.random()>.87:
   xx=x+4;d.line((xx,10,xx-3,1),fill=(92,159,93,255),width=2)
   for xx2,yy2 in [(xx-7,1),(xx+1,0),(xx-3,-3)]:d.ellipse((xx2,yy2+2,xx2+6,yy2+7),fill=(247,145,170,225) if isw else (196,190,247,225))
 # Hanging knot at edge of screen tiles
 im.save(OUT/f'platform_{kind}.png',optimize=True)
print('platforms generated')
