"""Create a new ORIGINAL placeholder fantasy battle loop. Not Fairy Tail OST."""
from pathlib import Path
import numpy as np, math, wave, subprocess, os
ROOT=Path(__file__).resolve().parents[1]
SR=22050;BPM=142;beat=60/BPM;bars=16;duration=bars*beat*4
n=int(SR*(duration+.2)); track=np.zeros(n,dtype=np.float32)
rng=np.random.default_rng(404)
def note(semitone):return 440*2**((semitone-69)/12)
def mix(start,dur,key,amp=.2,tone='pluck'):
 pos=int(start*SR);n1=min(int(dur*SR),n-pos)
 if n1<=0:return
 t=np.arange(n1,dtype=np.float32)/SR;f=note(key)
 if tone=='pluck':
  wavev=(np.sin(2*np.pi*f*t)+.32*np.sin(2*np.pi*2*f*t)+.12*np.sin(2*np.pi*3*f*t))
  env=np.minimum(1,t*75)*np.exp(-t*4.5)
 elif tone=='strings':
  wavev=np.sin(2*np.pi*f*t)+.3*np.sin(2*np.pi*2*f*t)+.18*np.sin(2*np.pi*3*f*t)
  wavev+=.1*np.sin(2*np.pi*f*1.005*t)
  env=np.minimum(1,t*8)*np.minimum(1,(dur-t)*7)
 elif tone=='bass':
  wavev=np.sin(2*np.pi*f*t)+.2*np.sin(2*np.pi*f*2*t)
  env=np.minimum(1,t*80)*np.exp(-t*3)
 else:
  wavev=np.sin(2*np.pi*f*t)
  env=np.minimum(1,t*100)*np.exp(-t*7)
 track[pos:pos+n1]+=wavev*env*amp
# Original chord map, no sampling or existing melody.
progression=[(50,53,57,62),(46,50,53,58),(53,57,60,65),(48,52,55,60)]
lead_patterns=[(74,72,69,65,69,72,77,74),(70,74,77,74,70,65,70,72),(72,69,72,77,79,77,72,69),(76,72,71,67,71,74,76,79)]
for bar in range(bars):
 root,ch2,ch3,ch4=progression[bar%4];base=bar*beat*4
 for k in (root,ch2,ch3,ch4):mix(base,beat*3.8,k,.048,'strings')
 for b in range(4):
  st=base+b*beat
  mix(st,beat*.8,root-12,.22,'bass')
  for k in ((root,ch2,ch3,ch4)[(b*2)%4],(root,ch2,ch3,ch4)[(b*2+2)%4]):mix(st,beat*.65,k+12,.052,'pluck')
  if b in (1,3):
   pos=int(st*SR);nn=min(int(.15*SR),n-pos)
   if nn>0:
    t=np.arange(nn)/SR;sn=(rng.standard_normal(nn)*np.exp(-t*30)*.053).astype('float32');track[pos:pos+nn]+=sn
  # kick: sine oscillator pitch sweep
  pos=int(st*SR);nn=min(int(.15*SR),n-pos)
  if nn>0:
   t=np.arange(nn)/SR;ph=2*np.pi*(74*t+38/(2*np.pi)*np.sin(2*np.pi*9*t));track[pos:pos+nn]+=(.22*np.sin(ph)*np.exp(-t*24)).astype('float32')
  # high hat
  for sub in (0,.5):
   pos=int((st+sub*beat)*SR);nn=min(int(.05*SR),n-pos)
   if nn>0:
    t=np.arange(nn)/SR;sn=(rng.standard_normal(nn)*np.exp(-t*100)*.032).astype('float32');track[pos:pos+nn]+=sn
 if bar%2==1:
  for i,k in enumerate(lead_patterns[bar%4]):mix(base+i*beat*.5,beat*.48,k,.085,'pluck')
# avoid clipping and fade edges
fade=int(.12*SR);track[:fade]*=np.linspace(0,1,fade);track[-int(.3*SR):]*=np.linspace(1,0,int(.3*SR))
track=np.tanh(track*1.18);peak=max(.01,float(np.max(np.abs(track))));track*=.73/peak
out=ROOT/'public/assets/audio';wav=out/'guild-battle-original.wav';ogg=out/'guild-battle-original.ogg'
with wave.open(str(wav),'wb') as f:
 f.setnchannels(1);f.setsampwidth(2);f.setframerate(SR);f.writeframes((track*32767).astype('<i2').tobytes())
subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(wav),'-c:a','libvorbis','-q:a','4',str(ogg)],check=True)
wav.unlink()
print('Original placeholder audio',ogg.stat().st_size,'bytes')
