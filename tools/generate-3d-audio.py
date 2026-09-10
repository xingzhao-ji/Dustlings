"""Original Dustlings motif rendered as phase-aligned stems for the native 3D engine.
No reference-game recordings/samples. Numerical checks are not human listening.
"""
from pathlib import Path
import numpy as np, wave, json, subprocess
RATE=44100
OUT=Path('godot/assets/audio');OUT.mkdir(parents=True,exist_ok=True)
beat=60/72/2;duration=128*beat;n=int(round(RATE*duration))
report={'sample_rate':RATE,'duration':duration,'origin':'Original D-F#-E-A-D motif and chord progression from src/audio.js; new deterministic synthesis for Godot. No human audition.','files':{}}
rng=np.random.default_rng(617)
def note(midi):return 440*2**((midi-69)/12)
def tone(midi,seconds,level,kind='pluck'):
 t=np.arange(int(seconds*RATE))/RATE;f=note(midi)
 if kind=='pluck':
  y=np.sin(2*np.pi*f*t)+.24*np.sin(2*np.pi*f*2*t)*np.exp(-t*4)+.09*np.sin(2*np.pi*f*3*t)*np.exp(-t*7)
  env=(1-np.exp(-t*200))*np.exp(-t*3.0)
 else:
  y=np.sin(2*np.pi*f*t)+.15*np.sin(2*np.pi*f*2*t)
  env=np.sin(np.pi*np.minimum(1,t/seconds))**2
 return y*env*level

def add(out,signal,start,pan=0):
 idx=(np.arange(len(signal))+int(round(start*RATE)))%len(out)
 out[idx,0]+=signal*np.sqrt((1-pan)/2)
 out[idx,1]+=signal*np.sqrt((1+pan)/2)
def save(name,data,loop=False):
 data=np.asarray(data);peak=float(np.max(np.abs(data)))
 assert np.all(np.isfinite(data)) and peak<.95
 wav=OUT/(name+'.wav')
 with wave.open(str(wav),'wb') as w:
  w.setnchannels(1 if data.ndim==1 else data.shape[1]);w.setsampwidth(2);w.setframerate(RATE);w.writeframes((data*32767).astype('<i2').tobytes())
 report['files'][name]={'peak_dbfs':20*np.log10(max(peak,1e-9)),'seconds':len(data)/RATE,'clipped_samples':int(np.sum(np.abs(data)>=1)),'loop_boundary_step':float(np.max(np.abs(data[-1]-data[0]))) if loop else None}
 if loop:
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(wav),'-c:a','vorbis','-strict','-2','-ac','2','-q:a','5','-y',str(OUT/(name+'.ogg'))],check=True)
  wav.unlink()
base=np.zeros((n,2));warm=np.zeros_like(base);bright=np.zeros_like(base)
chords=[[50,57,64,66],[43,50,57,59],[47,54,57,62],[45,52,59,62]]
for phrase,chord in enumerate(chords):
 start=phrase*32*beat
 for step,midi in [(0,74),(3,78),(5,76),(8,69),(12,74)]:add(base,tone(midi,1.6,.11),start+step*beat,-.15)
 add(base,tone(chord[0]-12,3.8,.055,'pad'),start)
 for i,midi in enumerate(chord[1:]):add(warm,tone(midi,5.7,.032,'pad'),start+i*.07,(i-1)*.22)
 add(warm,tone(chord[0],2.8,.045,'pad'),start+16*beat,.1)
 for i,step in enumerate([18,22,26]):add(bright,tone(chord[1+i]+12,1.3,.04),start+step*beat,.25)
 add(bright,tone(86,2.2,.025),start+28*beat,.3)
# Dark short echoes wrap into the next loop, preserving tails and sample continuity.
for name,data in [('music-base',base),('music-warm',warm),('music-bloom',bright)]:
 dry=data.copy()
 for delay,gain in [(.117,.13),(.243,.075),(.397,.035)]:data+=np.roll(dry,int(delay*RATE),axis=0)*gain
 save(name,data,True)
for name,notes in {'birth':[(0,81),(.09,86),(.2,90)],'assign':[(0,74),(.08,81)],'upgrade':[(0,74),(.1,78),(.22,81),(.35,86)],'chorus':[(0,62),(.16,69),(.34,74)],'restored':[(0,74),(.2,78),(.4,81),(.65,86),(.94,90)],'complete':[(0,74),(.25,78),(.5,76),(.8,69),(1.1,86)],'ui':[(0,74)],'blocked':[(0,62)]}.items():
 sound=np.zeros((int(3.0*RATE),2))
 for start,midi in notes:add(sound,tone(midi,1.6,.075 if name!='ui' else .04),start)
 # Spatial cues are mono: AudioStreamPlayer3D supplies position/panning.
 save(name,np.mean(sound,axis=1))
for name,seconds,level in [('brush',4,.05),('air',12,.028),('water',8,.045)]:
 length=int(seconds*RATE);noise=rng.normal(0,1,length)
 # Circular smoothing ensures periodic continuous derivatives at the loop join.
 filtered=sum(np.roll(noise,i) for i in range(22 if name=='air' else 7))
 filtered/=np.max(np.abs(filtered))
 t=np.arange(length)/RATE
 envelope=1+.15*np.sin(2*np.pi*t/seconds)+.08*np.sin(4*np.pi*t/seconds)
 save(name,filtered*envelope*level,True)
Path('evidence/3d/audio-generation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
