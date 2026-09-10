import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const output=resolve(process.argv[2]||'artifacts/audio/ui');
await mkdir(output,{recursive:true});
const source=await readFile(new URL('../src/audio.js',import.meta.url),'utf8');
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
  const page=await browser.newPage();
  const result=await page.evaluate(async source=>{
    const {DustAudio}=await import(URL.createObjectURL(new Blob([source],{type:'text/javascript'})));
    const sampleRate=44100,duration=.7,channelData=[[],[]],cases=[];
    const segments=[['select'],['open'],['close'],['change'],['confirm'],['rapid select'],['muted confirm'],['zero sfx'],['hidden confirm']];
    for(const [name] of segments){
      const context=new OfflineAudioContext(2,sampleRate*duration,sampleRate),audio=new DustAudio(context);
      await audio.start();audio.pause();
      // This audition isolates UI cues after the score's completed pause fade.
      audio.master.gain.cancelScheduledValues(0);audio.master.gain.value=0;
      if(name==='muted confirm')audio.setMix({muted:true});
      if(name==='zero sfx')audio.setMix({sfx:0});
      if(name==='hidden confirm')Object.defineProperty(document,'hidden',{configurable:true,value:true});
      let accepted=0;
      if(name==='rapid select'){for(let i=0;i<20;i++)accepted+=Number(await audio.ui('select'));}
      else accepted=Number(await audio.ui(name.includes('confirm')||name==='zero sfx'?'confirm':name));
      if(name==='hidden confirm')delete document.hidden;
      const rendered=await context.startRendering();let peak=0,sum=0,clippedSamples=0,invalidSamples=0,maxSampleStep=0;
      for(let c=0;c<2;c++){
        const values=rendered.getChannelData(c);
        for(let i=0;i<values.length;i++){
          const value=values[i];peak=Math.max(peak,Math.abs(value));sum+=value*value;
          if(Math.abs(value)>=1)clippedSamples++;if(!Number.isFinite(value))invalidSamples++;
          if(i)maxSampleStep=Math.max(maxSampleStep,Math.abs(value-values[i-1]));
          channelData[c].push(value);
        }
      }
      cases.push({name,at:cases.length*duration,duration,accepted,peak,peakDbFS:peak?20*Math.log10(peak):null,rms:Math.sqrt(sum/(rendered.length*2)),clippedSamples,invalidSamples,maxSampleStep,paused:audio.paused,scoreTimerRunning:Boolean(audio.timer)});
      audio.destroy();
    }
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const live=new DustAudio();const preStartRejected=await live.ui('select')===false;
    await live.start();live.pause();await wait(160);
    const tickBefore=live.tick;
    const before=live.getDiagnostics();
    const acceptedPaused=await live.ui('open');await wait(40);
    const during={...live.getDiagnostics(),scoreTimerRunning:Boolean(live.timer),master:live.master.gain.value};
    await wait(520);const after=live.getDiagnostics();
    const scoreUnchanged=live.tick===tickBefore;
    await live.ui('confirm');await live.resume();await wait(520);
    const resumeCancelsSuspension=live.context.state==='running'&&!live.paused&&Boolean(live.timer);
    live.pause();await wait(150);
    await live.ui('open');live.pause();await wait(160);
    const interruptionStopsUI=live.context.state==='suspended'&&live.uiBus.gain.value===0;
    live.setMix({muted:true});const mutedRejected=await live.ui('select')===false;
    Object.defineProperty(document,'hidden',{configurable:true,value:true});
    live.setMix({muted:false});const hiddenRejected=await live.ui('select')===false;
    delete document.hidden;
    live.destroy();const destroyedRejected=await live.ui('select')===false;
    return{sampleRate,channelData,cases,live:{preStartRejected,acceptedPaused,before,during,after,scoreUnchanged,resumeCancelsSuspension,interruptionStopsUI,mutedRejected,hiddenRejected,destroyedRejected},browser:navigator.userAgent};
  },source);
  const channels=result.channelData;delete result.channelData;
  const bytes=Buffer.alloc(44+channels[0].length*4);bytes.write('RIFF',0);bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(2,22);bytes.writeUInt32LE(result.sampleRate,24);bytes.writeUInt32LE(result.sampleRate*4,28);bytes.writeUInt16LE(4,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(bytes.length-44,40);
  for(let i=0;i<channels[0].length;i++)for(let c=0;c<2;c++){const v=Math.max(-1,Math.min(1,channels[c][i]));bytes.writeInt16LE(Math.round(v*(v<0?32768:32767)),44+i*4+c*2);}
  await writeFile(resolve(output,'ui-audition.wav'),bytes);
  const report={date:new Date().toISOString(),kind:'Synthetic isolated UI-cue audition plus actual AudioContext state checks in headless macOS Chrome; no human listening assessment',...result};
  await writeFile(resolve(output,'ui-audio-checks.json'),JSON.stringify(report,null,2)+'\n');
  for(const row of result.cases){assert.equal(row.clippedSamples,0);assert.equal(row.invalidSamples,0);assert.equal(row.scoreTimerRunning,false);assert.equal(row.paused,true);}
  for(const kind of ['select','open','close','change','confirm'])assert.ok(result.cases.find(row=>row.name===kind).peak>0);
  assert.equal(result.cases.find(row=>row.name==='rapid select').accepted,1);
  for(const kind of ['muted confirm','zero sfx','hidden confirm']){const row=result.cases.find(row=>row.name===kind);assert.equal(row.accepted,0);assert.equal(row.peak,0);}
  const live=result.live;
  for(const key of ['preStartRejected','acceptedPaused','scoreUnchanged','resumeCancelsSuspension','interruptionStopsUI','mutedRejected','hiddenRejected','destroyedRejected'])assert.equal(live[key],true,key);
  assert.equal(live.before.contextState,'suspended');assert.equal(live.during.contextState,'running');assert.equal(live.during.paused,true);assert.equal(live.during.scoreTimerRunning,false);assert.equal(live.during.master,0);assert.equal(live.after.contextState,'suspended');assert.equal(live.after.paused,true);
  console.log(JSON.stringify({output,cases:result.cases.map(({name,accepted,peakDbFS})=>({name,accepted,peakDbFS})),live:result.live},null,2));
}finally{await browser.close();}
