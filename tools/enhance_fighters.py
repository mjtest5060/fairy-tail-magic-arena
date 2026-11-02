from PIL import Image,ImageChops,ImageFilter,ImageDraw
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sprite_dir=ROOT/'public/assets/spritesheets'
colors={'natsu':'#401c2b','lucy':'#35243a','erza':'#321b30','gray':'#1b263c'}
for hero,outline in colors.items():
 source=Image.open(sprite_dir/(hero+'.png')).convert('RGBA')
 sheet=Image.new('RGBA',source.size)
 for i in range(18):
  x=(i%6)*192;y=(i//6)*252
  frame=source.crop((x,y,x+192,y+252))
  a=frame.getchannel('A')
  expanded=a.filter(ImageFilter.MaxFilter(5))
  edge=ImageChops.subtract(expanded,a)
  stroke=Image.new('RGBA',frame.size,outline);stroke.putalpha(edge)
  stroke.alpha_composite(frame)
  sheet.alpha_composite(stroke,(x,y))
 sheet.save(sprite_dir/(hero+'.png'),optimize=True)
print('Added pixel outlines to 4 character atlases')
