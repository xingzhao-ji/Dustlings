import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const label=process.argv[2]||'before';
const baselineSource=process.env.DUSTLINGS_AUDIO_BASELINE?await readFile(process.env.DUSTLINGS_AUDIO_BASELINE,'utf8'):null;
const report={recordedAt:new Date().toISOString(),label,conditions:'Three sequential fresh headless Google Chrome processes, 1440×900 viewport, DPR 2, default sample rate. Native AudioContext and DustAudio methods timed separately. No speaker audition or human responsiveness test. Other root work may share this machine.',trials:[]};
for(let trial=1;trial<=3;trial++){
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2});
  if(label==='before'&&baselineSource)await context.route('**/src/audio.js',route=>route.fulfill({contentType:'text/javascript',body:baselineSource}));
  await context.addInitScript(()=>{
   window.__audioStartup={phases:[],longTasks:[],longFrames:[],errors:[]};
   const capture=(name,start,extra={})=>window.__audioStartup.phases.push({name,start,duration:performance.now()-start,...extra});
   const NativeAudioContext=window.AudioContext;
   window.AudioContext=new Proxy(NativeAudioContext,{construct(target,args){const start=performance.now();try{const result=Reflect.construct(target,args);capture('AudioContext constructor',start,{sampleRate:result.sampleRate,state:result.state});return result;}catch(error){capture('AudioContext constructor',start,{error:error.message});throw error;}}});
   const nativeResume=NativeAudioContext.prototype.resume;
   NativeAudioContext.prototype.resume=function(...args){const start=performance.now(),result=nativeResume.apply(this,args);capture('AudioContext.resume synchronous',start);return result.then(value=>{capture('AudioContext.resume settled',start);return value;});};
   for(const method of ['createBuffer','createConvolver','createMediaStreamDestination']){
    const original=NativeAudioContext.prototype[method];if(!original)continue;
    NativeAudioContext.prototype[method]=function(...args){const start=performance.now();const result=original.apply(this,args);capture(`AudioContext.${method}`,start,{arguments:args});return result;};
   }
   for(const type of ['longtask','long-animation-frame'])try{new PerformanceObserver(list=>{for(const entry of list.getEntries()){if(type==='longtask')window.__audioStartup.longTasks.push({start:entry.startTime,duration:entry.duration});else window.__audioStartup.longFrames.push({start:entry.startTime,duration:entry.duration,scripts:entry.scripts.map(s=>({duration:s.duration,function:s.sourceFunctionName,url:s.sourceURL,invoker:s.invoker}))});}}).observe({type,buffered:true});}catch{}
  });
  const trialErrors=[];const page=await context.newPage();page.on('pageerror',error=>trialErrors.push(error.message));
  await page.goto('http://127.0.0.1:4173/?qa=1');await page.waitForFunction(()=>!!window.__dustlings);
  await page.evaluate(()=>{
   const audio=window.__dustlings.audio;
   for(const method of ['prepare','start','_buildGraph','_noiseBuffer','_impulse','_texture','resume','_schedule']){
    const original=audio[method];if(typeof original!=='function')continue;
    audio[method]=function(...args){const start=performance.now(),result=original.apply(this,args);window.__audioStartup.phases.push({name:`DustAudio.${method} synchronous`,start,duration:performance.now()-start});if(result&&typeof result.then==='function')return result.then(value=>{window.__audioStartup.phases.push({name:`DustAudio.${method} settled`,start,duration:performance.now()-start});return value;});return result;};
   }
  });
  if(label.includes('prepared'))await page.evaluate(()=>new Promise(resolve=>{
   const idle=window.requestIdleCallback||((fn)=>setTimeout(fn,0));
   requestAnimationFrame(()=>requestAnimationFrame(()=>idle(()=>{window.__audioStartup.preparationFrom='Audit harness: welcome painted, idle callback';window.__dustlings.audio.prepare();resolve();})));
  }));
  await page.evaluate(()=>{const audio=window.__dustlings.audio;window.__audioStartup.beforeClick={ready:audio.ready,context:!!audio.context,diagnostics:audio.getDiagnostics(),now:performance.now()};});
  await page.locator('#start-button').click();await page.waitForTimeout(500);
  const measured=await page.evaluate(()=>({...window.__audioStartup,diagnostics:window.__dustlings.audio.getDiagnostics(),sampleRate:window.__dustlings.audio.context?.sampleRate}));
  report.trials.push({trial,browser:await browser.version(),...measured,errors:[...measured.errors,...trialErrors]});
 }finally{await browser.close();}
}
if(process.env.DUSTLINGS_AUDIO_BASELINE){
 const sources=[await readFile(process.env.DUSTLINGS_AUDIO_BASELINE,'utf8'),await readFile('src/audio.js','utf8')];
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const page=await browser.newPage();
  report.preservation=await page.evaluate(async sources=>{
   const classes=[];for(const source of sources)classes.push((await import(URL.createObjectURL(new Blob([source],{type:'text/javascript'})))).DustAudio);
   const renders=[],procedural=[];for(const Type of classes){const ctx=new OfflineAudioContext(2,44100*36,44100),a=new Type(ctx);await a.start();const impulse=a._impulse(1.45);procedural.push([a.noise.getChannelData(0),impulse.getChannelData(0),impulse.getChannelData(1)]);a.scheduleAudition(36);const buffer=await ctx.startRendering();renders.push([buffer.getChannelData(0),buffer.getChannelData(1)]);}
   let changedSamples=0,maxDifference=0;
   for(let channel=0;channel<2;channel++)for(let i=0;i<renders[0][channel].length;i++){const difference=Math.abs(renders[0][channel][i]-renders[1][channel][i]);if(difference>0)changedSamples++;maxDifference=Math.max(maxDifference,difference);}
   let changedProceduralSamples=0,proceduralSamplesCompared=0;for(let buffer=0;buffer<3;buffer++)for(let i=0;i<procedural[0][buffer].length;i++){proceduralSamplesCompared++;if(procedural[0][buffer][i]!==procedural[1][buffer][i])changedProceduralSamples++;}
   const a=new classes[1]();a.prepare();const beforeStart=a.getDiagnostics();a.destroy();await new Promise(r=>setTimeout(r,30));const destroyedState=a.context.state;
   window.__StartupType=classes[1];document.body.innerHTML='<button id="race">Prepare and start</button>';
   document.querySelector('#race').onclick=async()=>{const live=new window.__StartupType();live.prepare();await live.start();window.__race={diagnostics:live.getDiagnostics()};live.destroy();};
   return {kind:'Same-browser 36s stereo OfflineAudioContext sample comparison; no listening assessment',samplesCompared:renders[0][0].length*2,changedSamples,maxDifference,proceduralSamplesCompared,changedProceduralSamples,beforeStart,destroyedState};
  },sources);
  await page.locator('#race').click();await page.waitForFunction(()=>!!window.__race);report.preservation.immediatePrepareStart=await page.evaluate(()=>window.__race.diagnostics);
 }finally{await browser.close();}
}
report.summary=report.trials.map(t=>({trial:t.trial,sampleRate:t.sampleRate,beforeClick:t.beforeClick,phases:t.phases.filter(p=>/constructor|_buildGraph|_noiseBuffer|_impulse|resume settled|start synchronous|start settled/.test(p.name)).map(({name,duration})=>({name,duration})),longTasks:t.longTasks,clickLongTasks:t.longTasks.filter(task=>task.start>=t.beforeClick.now),longFrames:t.longFrames}));
await mkdir('evidence',{recursive:true});await writeFile(`evidence/audio-startup-${label}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({summary:report.summary,preservation:report.preservation},null,2));
