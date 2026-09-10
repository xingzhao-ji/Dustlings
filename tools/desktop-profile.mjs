import {_electron as electron} from '@playwright/test';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const output=process.env.DUSTLINGS_DESKTOP_EVIDENCE_DIR||'evidence/platforms';await mkdir(`${output}/profiles`,{recursive:true});
const profile=await mkdtemp(path.resolve(`${output}/profiles/profile-`));
const app=await electron.launch({executablePath:path.resolve('builds/native/Dustlings-darwin-arm64/Dustlings.app/Contents/MacOS/Dustlings'),env:{...process.env,DUSTLINGS_TEST_USER_DATA:profile,DUSTLINGS_TEST_QA:'1'},timeout:30000});
let report={date:new Date().toISOString(),kind:'Automated native Mac ARM64 profile; no physical input or human quality evidence.',build:JSON.parse(await readFile('builds/desktop-build-manifest.json','utf8')),conditions:'Visible native Electron app, 1280x820 outer window, DPR2, normal quality/audio, 50-helper imported simulation fixture. No video or screenshots during profile. Team asked to avoid compilation/other browser checks. General OS/background activity not controlled.',frames:[],events:[],longTasks:[]};
try{
 const page=await app.firstWindow();await page.locator('#start-button').click();await page.locator('#pause-button').click();await page.locator('#save-file').setInputFiles('evidence/v0.2/busy-test-save.json');await page.waitForFunction(()=>window.__dustlings.state.creatures.length===50);await page.locator('#resume-button').click();await page.waitForTimeout(500);
 await page.evaluate(()=>{
  const probe=window.__nativeProfile={start:performance.now(),frames:[],events:[],longTasks:[],active:true};let last=null;
  function frame(at){if(last!==null)probe.frames.push({atMs:at-probe.start,deltaMs:at-last});last=at;if(probe.active)requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
  for(const type of ['focus','blur','resize','visibilitychange'])addEventListener(type,()=>probe.events.push({type,atMs:performance.now()-probe.start,hidden:document.hidden}));
  new PerformanceObserver(list=>{for(const e of list.getEntries())probe.longTasks.push({atMs:e.startTime-probe.start,durationMs:e.duration});}).observe({type:'longtask',buffered:false});
 });
 console.log('Profiling every native frame for60seconds.');
 for(let i=0;i<6;i++)await page.waitForTimeout(10000);
 const sample=await page.evaluate(()=>{window.__nativeProfile.active=false;return {...window.__nativeProfile,durationMs:performance.now()-window.__nativeProfile.start,renderer:window.__dustlings.getPerformance()};});
 const sorted=sample.frames.map(f=>f.deltaMs).sort((a,b)=>a-b);
 report={...report,...sample,summary:{samples:sorted.length,meanMs:sorted.reduce((a,b)=>a+b,0)/sorted.length,p95Ms:sorted[Math.floor(sorted.length*.95)],p99Ms:sorted[Math.floor(sorted.length*.99)],worstMs:sorted.at(-1),over33_4:sample.frames.filter(f=>f.deltaMs>33.4),over500:sample.frames.filter(f=>f.deltaMs>=500)},status:'recorded'};
}catch(error){report.status='failed';report.error=error.stack;throw error;}
finally{await app.close();await writeFile(`${output}/desktop-profile.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,frames:`${report.frames.length} raw intervals retained in JSON`},null,2));}
