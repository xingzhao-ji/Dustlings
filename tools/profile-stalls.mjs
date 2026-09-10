import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const label=process.argv[2]||'current';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const p=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});
const busy=JSON.parse(await readFile('evidence/busy-test-save.json','utf8'));Object.assign(busy,{ritual:false,ritualTime:0,restoration:0});
try{
 await p.goto('http://localhost:4173/?qa=1');await p.locator('#start-button').click();await p.evaluate(save=>window.__dustlings.load(save),busy);
 await p.evaluate(()=>{
  const q=window.__dustlings;window.__profile={phase:'active',render:[],intervals:[],longTasks:[],longFrames:[],uiMutations:0,observers:[]};const log=window.__profile;
  const original=q.renderer.render.bind(q.renderer);q.renderer.render=(...args)=>{const start=performance.now();const r=original(...args);log.render.push({start,ms:performance.now()-start,phase:log.phase});return r;};
  let previous=performance.now();function sample(now){log.intervals.push({start:previous,ms:now-previous,phase:log.phase});previous=now;requestAnimationFrame(sample);}requestAnimationFrame(sample);
  for(const type of ['longtask','long-animation-frame'])if(PerformanceObserver.supportedEntryTypes.includes(type)){
   const observer=new PerformanceObserver(list=>{for(const e of list.getEntries()){const record={start:e.startTime,ms:e.duration,phase:log.phase,scripts:e.scripts?.map(s=>({duration:s.duration,sourceURL:s.sourceURL,sourceFunctionName:s.sourceFunctionName,invoker:s.invoker,forcedStyleAndLayoutDuration:s.forcedStyleAndLayoutDuration}))};log[type==='longtask'?'longTasks':'longFrames'].push(record);}});observer.observe({type,buffered:false});log.observers.push(observer);
  }
  const mutations=new MutationObserver(records=>log.uiMutations+=records.length);mutations.observe(document.querySelector('#journal'),{subtree:true,childList:true,characterData:true});log.observers.push(mutations);
 });
 await p.waitForTimeout(10000);await p.locator('#pause-button').click();await p.waitForTimeout(250);await p.evaluate(()=>window.__profile.phase='paused');await p.waitForTimeout(5000);
 const result=await p.evaluate(()=>{
  const log=window.__profile;const stats=arr=>{const sorted=arr.map(x=>x.ms).sort((a,b)=>a-b);return{count:sorted.length,mean:sorted.reduce((a,b)=>a+b,0)/sorted.length||0,p95:sorted[Math.floor(sorted.length*.95)]||0,max:sorted.at(-1)||0,over33:sorted.filter(n=>n>33.4).length};};
  return{conditions:{viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,helpers:window.__dustlings.state.creatures.length,headless:true,kind:'Instrumented browser probe; not human responsiveness or energy measurement'},active:{render:stats(log.render.filter(x=>x.phase==='active')),frames:stats(log.intervals.filter(x=>x.phase==='active'))},paused:{render:stats(log.render.filter(x=>x.phase==='paused')),frames:stats(log.intervals.filter(x=>x.phase==='paused'))},uiMutations:log.uiMutations,longTasks:log.longTasks,longFrames:log.longFrames};
 });
 await writeFile(`evidence/profile-${label}.json`,JSON.stringify({...result,browser:await browser.version(),recordedAt:new Date().toISOString()},null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
