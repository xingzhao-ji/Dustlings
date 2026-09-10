// Normal-time, fresh-save integration run. Automated policy; never a human playtest.
// The only QA calls are read-only state/projection/performance/serialization reads.
import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

if (!process.argv.includes('--run')) {
  console.log('Endurance harness prepared. Run with --run only after the isolated profile is finished. No browser launched.');
  process.exit(0);
}

const label=(process.env.DUSTLINGS_ENDURANCE_LABEL||'normal-time').replace(/[^a-z0-9_-]/gi,'_');
const output=process.env.DUSTLINGS_EVIDENCE_DIR||'evidence/v0.2',prefix=path.join(output,`endurance-${label}`);
const artifactPath=path.resolve(process.env.DUSTLINGS_ARTIFACT||'builds/Dustlings Courtyard.html');
const url=process.env.DUSTLINGS_URL||`${pathToFileURL(artifactPath).href}?qa=1`;
const expectedHash=process.env.DUSTLINGS_EXPECTED_SHA256||'cb4b9d7bc6174a96bd203a22f9a8a5a766f3fa0eca10475e80c8e4d681f5feea';
const maximumMs=Math.min(900,Math.max(60,Number(process.env.DUSTLINGS_ENDURANCE_SECONDS)||900))*1000;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,Math.max(0,ms)));
const result={
  kind:'Normal-time automated policy using actual pointer and UI events. Not human pacing, pleasure, usability, or market evidence.',
  startedAt:new Date().toISOString(),url,
  policy:{freshContext:true,maximumSeconds:maximumMs/1000,cycleSeconds:3,brushHoldSeconds:1.2,intendedDutyBeforeChorus:.4,selection:'Highest-amount visible dust, stable id tie break, every cycle',upgrades:['brush','teamwork','bloom'],afterChorus:'Stop manual brushing and let helpers complete the courtyard'},
  instrumentation:'Passive rAF timing/long-task observer and30-second CDP heap reads. No simulation acceleration, loaded fixtures, game-state writes, forced GC, or full-run video recording.',
  heapCaveat:'Heap samples include normal allocation and garbage collection. This run is not a proof that no memory leak exists.',
  workload:'Non-isolated host workload: root may run ffmpeg conversions and review UI checks during endurance. Frame results are integration observations, not comparative FPS benchmarks.',
  progress:[],heapSamples:[],events:[],consoleErrors:[],pageErrors:[],failures:[],foregroundOutliers:[],longTasks:[],
};
await fs.mkdir(output,{recursive:true});
try{result.packageVersion=JSON.parse(await fs.readFile('package.json','utf8')).version;}catch{}
try{result.buildManifest=JSON.parse(await fs.readFile('builds/build-manifest.json','utf8'));}catch{}
let browser,context,page,cdp,stopRequested=false,mouseHeld=false,holdStarted=0,heldMs=0,policyStarted=0,lastProgressAt=0,chorusStartedAt=null;
let frameCursor=0,outlierCursor=0,longTaskCursor=0;
const foregroundFrames=[];
process.on('SIGINT',()=>{stopRequested=true;});process.on('SIGTERM',()=>{stopRequested=true;});

const summary=values=>{const v=[...values].sort((a,b)=>a-b);return {samples:v.length,meanMs:v.reduce((a,b)=>a+b,0)/(v.length||1),p95Ms:v[Math.floor(v.length*.95)]||0,p99Ms:v[Math.floor(v.length*.99)]||0,worstMs:v.at(-1)||0,over33ms:v.filter(n=>n>33.4).length,over500ms:v.filter(n=>n>=500).length};};
const release=async()=>{if(mouseHeld){await page.mouse.up();heldMs+=performance.now()-holdStarted;mouseHeld=false;}};
const readState=()=>page.evaluate(()=>{
  const q=window.__dustlings,s=q.state,r=q.renderer,b=document.querySelector('#world').getBoundingClientRect();
  const d=s.dust.filter(d=>d.amount>.00001).sort((a,b)=>b.amount-a.amount||a.id-b.id).find(d=>{const p=r.worldToScreen(d.x,d.y);return r.containsScreenPoint(p.x,p.y);});
  const projected=d?r.worldToScreen(d.x,d.y):null;
  return {elapsed:s.elapsed,cleaned:s.cleaned,totalDust:s.totalDust,ratio:s.cleaned/s.totalDust,helpers:s.creatures.length,motes:s.motes,upgrades:{...s.upgrades},restoration:s.restoration,ritual:s.ritual,completed:s.completed,firstHelperAt:s.firstHelperAt,firstUpgradeAt:s.firstUpgradeAt,completedAt:s.completedAt,stats:structuredClone(s.stats),remainingNodes:s.dust.filter(d=>d.amount>.00001).length,target:d?{id:d.id,amount:d.amount,x:b.x+projected.x,y:b.y+projected.y}:null,saveStatus:document.querySelector('#save-status').textContent,visibility:document.visibilityState};
});
const endingState=()=>page.evaluate(()=>{
  const s=window.__dustlings.state;
  return {completed:s.completed,cleaned:s.cleaned,totalDust:s.totalDust,restoration:s.restoration,ritual:s.ritual,elapsed:s.elapsed,completedAt:s.completedAt,firstHelperAt:s.firstHelperAt,firstUpgradeAt:s.firstUpgradeAt,motes:s.motes,earned:s.earned,upgrades:{...s.upgrades},dust:s.dust.map(d=>d.amount),creatures:s.creatures.map(({id,x,y,phase})=>({id,x,y,phase})),stats:structuredClone(s.stats)};
});
async function collectTelemetry(state,force=false){
  const wall=(performance.now()-policyStarted)/1000;
  const samples=await page.evaluate(({frameCursor,outlierCursor,longTaskCursor})=>{
    const d=window.__dustlingsEndurance;
    return {frames:d.frames.slice(frameCursor),outliers:d.outliers.slice(outlierCursor),longTasks:d.longTasks.slice(longTaskCursor),cursors:{frame:d.frames.length,outlier:d.outliers.length,longTask:d.longTasks.length},gameWindow:window.__dustlings.getPerformance()};
  },{frameCursor,outlierCursor,longTaskCursor});
  foregroundFrames.push(...samples.frames);result.foregroundOutliers.push(...samples.outliers);result.longTasks.push(...samples.longTasks);
  frameCursor=samples.cursors.frame;outlierCursor=samples.cursors.outlier;longTaskCursor=samples.cursors.longTask;
  const progress={wallSeconds:wall,...state,heldSeconds:heldMs/1000,rollingGameFrames:samples.gameWindow};delete progress.target;
  result.progress.push(progress);
  try{result.heapSamples.push({wallSeconds:wall,helpers:state.helpers,phase:state.completed?'completed':state.ritual?'ritual':chorusStartedAt!==null?'crew-finish':'brushing',...(await cdp.send('Runtime.getHeapUsage'))});}catch(error){result.events.push({type:'heap_sample_unavailable',message:error.message});}
  result.foregroundFrames=summary(foregroundFrames);
  await fs.writeFile(`${prefix}-progress.json`,JSON.stringify(result,null,2));
  console.log(JSON.stringify({type:'progress',wallSeconds:+wall.toFixed(1),gameSeconds:+state.elapsed.toFixed(1),cleanedPercent:+(state.ratio*100).toFixed(1),helpers:state.helpers,restoration:+state.restoration.toFixed(3),phase:progress.ritual?'chorus':chorusStartedAt!==null?'crew-finish':'brushing',foregroundWorstMs:+result.foregroundFrames.worstMs.toFixed(1),errors:result.consoleErrors.length+result.pageErrors.length}));
  lastProgressAt=performance.now();
}

try {
  const actualHash=createHash('sha256').update(await fs.readFile(artifactPath)).digest('hex');
  result.artifact={path:artifactPath,sha256:actualHash,expectedSha256:expectedHash,exactFileUrl:new URL(url).protocol==='file:'};
  if(actualHash!==expectedHash)throw Error('Frozen artifact hash does not match the expected version');
  if(!result.artifact.exactFileUrl)throw Error('This endurance run must use the exact standalone file artifact');
  browser=await chromium.launch({headless:true,executablePath:process.env.DUSTLINGS_CHROME||process.env.PLAYWRIGHT_EXECUTABLE_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  result.environment={browser:await browser.version(),viewport:{width:1440,height:900},dpr:2,mode:'Headless installed Chrome on development Mac; one fresh browser context; no video during the run'};
  context=await browser.newContext({viewport:result.environment.viewport,deviceScaleFactor:2,acceptDownloads:true});
  await context.addInitScript(()=>{
    const d={monitor:false,frames:[],outliers:[],longTasks:[],visibility:[]};window.__dustlingsEndurance=d;
    let previous=null;
    function frame(now){
      const active=d.monitor&&document.visibilityState==='visible'&&!document.querySelector('dialog[open]');
      if(active&&previous!==null){const ms=now-previous;d.frames.push(ms);if(ms>33.4)d.outliers.push({atMs:now,durationMs:ms,helpers:window.__dustlings?.state.creatures.length??null});}
      previous=active?now:null;requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    if(PerformanceObserver.supportedEntryTypes.includes('longtask')){
      const observer=new PerformanceObserver(list=>{if(d.monitor&&document.visibilityState==='visible')for(const e of list.getEntries())d.longTasks.push({atMs:e.startTime,durationMs:e.duration});});observer.observe({type:'longtask'});
    }
    document.addEventListener('visibilitychange',()=>d.visibility.push({atMs:performance.now(),visibility:document.visibilityState}));
  });
  page=await context.newPage();page.setDefaultTimeout(5000);
  page.on('console',message=>{if(message.type()==='error')result.consoleErrors.push({at:new Date().toISOString(),text:message.text()});});
  page.on('pageerror',error=>result.pageErrors.push({at:new Date().toISOString(),message:error.message}));
  page.on('crash',()=>{result.failures.push('Browser page crashed');stopRequested=true;});
  cdp=await context.newCDPSession(page);
  await page.goto(url);await page.waitForFunction(()=>!!window.__dustlings);
  result.freshState=await readState();
  if(result.freshState.cleaned!==0||result.freshState.helpers!==0)throw Error('Fresh context did not start with an untouched courtyard');
  await page.locator('#start-button').click();
  await page.evaluate(()=>{window.__dustlingsEndurance.monitor=true;});
  policyStarted=performance.now();lastProgressAt=policyStarted-30000;
  let firstScreenshot=false,nearEndScreenshot=false;
  while(!stopRequested&&performance.now()-policyStarted<maximumMs){
    const cycleStart=performance.now();let state=await readState();
    if(state.completed){result.completion={wallSeconds:(cycleStart-policyStarted)/1000,...state};break;}
    if(state.visibility!=='visible')throw Error('Page left the foreground during endurance run');
    if(await page.locator('dialog[open]').count())throw Error('Unexpected modal interrupted the policy');
    await release();
    for(const id of ['brush','teamwork','bloom'])if(!state.upgrades[id]&&await page.locator(`#upgrade-${id}`).isEnabled()){
      await page.locator(`#upgrade-${id}`).click();result.events.push({type:'upgrade_click',id,wallSeconds:(performance.now()-policyStarted)/1000});
    }
    if(chorusStartedAt===null&&await page.locator('#restore-button').isEnabled()){
      await page.locator('#restore-button').click();chorusStartedAt=performance.now();result.events.push({type:'chorus_click',wallSeconds:(chorusStartedAt-policyStarted)/1000});
    }
    state=await readState();
    if(!firstScreenshot){await page.screenshot({path:`${prefix}-opening.png`});firstScreenshot=true;}
    if(!nearEndScreenshot&&state.restoration===1&&state.remainingNodes<=15){await page.screenshot({path:`${prefix}-final-cleanup.png`});nearEndScreenshot=true;result.events.push({type:'final_cleanup_still',wallSeconds:(performance.now()-policyStarted)/1000});}
    if(chorusStartedAt===null&&!state.ritual&&state.target){
      await page.mouse.move(state.target.x,state.target.y);await page.mouse.down();mouseHeld=true;holdStarted=performance.now();
      await sleep(1200);await release();
    }
    if(performance.now()-lastProgressAt>=30000)await collectTelemetry(await readState());
    await sleep(3000-(performance.now()-cycleStart));
  }
  await release();let state=await readState();await collectTelemetry(state,true);
  result.runtimeSeconds=(performance.now()-policyStarted)/1000;
  result.manualBrushing={heldSeconds:heldMs/1000,beforeChorusSeconds:((chorusStartedAt||performance.now())-policyStarted)/1000,measuredDutyBeforeChorus:heldMs/((chorusStartedAt||performance.now())-policyStarted)};
  if(!state.completed){result.failures.push(stopRequested?'Run interrupted before completion':'Maximum normal-time budget reached without completion');}
  else {
    await page.screenshot({path:`${prefix}-completed.png`});
    await page.waitForFunction(()=>document.querySelector('#completion').open,{},{timeout:15000});
    await page.screenshot({path:`${prefix}-ending-dialog.png`});
    await page.locator('#enjoy-button').click();await page.locator('#pause-button').click();
    await page.waitForFunction(()=>{try{const saved=JSON.parse(localStorage.getItem('dustlings.courtyard.v1')),s=window.__dustlings.state;return saved.completed===true&&saved.elapsed===s.elapsed&&saved.stats.brushed===s.stats.brushed}catch{return false}});
    const before=await endingState();await fs.writeFile(`${prefix}-ending-before-return.json`,JSON.stringify(before,null,2));
    const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export-save').click()]);await download.saveAs(`${prefix}-completed-save.json`);
    if(createHash('sha256').update(await fs.readFile(artifactPath)).digest('hex')!==expectedHash)throw Error('Artifact changed before reload verification');
    await page.reload();await page.waitForFunction(()=>!!window.__dustlings);const after=await endingState();
    const equal=JSON.stringify(before)===JSON.stringify(after);
    result.returnCheck={exactEndingFieldsEqual:equal,compared:'completion, full dust amounts, restoration, elapsed/event times, motes/earned, upgrades, helper id/position/phase, and player stats',beforeCompleted:before.completed,afterCompleted:after.completed,helperCount:after.creatures.length};
    if(!equal){result.failures.push('Completed state differed after actual reload');await fs.writeFile(`${prefix}-ending-after-return.json`,JSON.stringify(after,null,2));}
    await page.locator('#start-button').click();await sleep(500);await page.screenshot({path:`${prefix}-returned.png`});
    result.returnCheck.stillCompletedAfterResume=(await readState()).completed;
    if(!result.returnCheck.stillCompletedAfterResume)result.failures.push('Ending did not survive resuming play');
  }
  await context.storageState({path:`${prefix}-storage-state.json`});
} catch(error) {
  result.failures.push(error.stack||error.message);console.error(error.message);
} finally {
  try{if(page&&!page.isClosed()){await release();result.lastState=await readState();if(!(await page.locator('dialog[open]').count()))await page.locator('#pause-button').click();await context.storageState({path:`${prefix}-storage-state.json`});}}catch(error){result.checkpointError=error.message;}
  result.finishedAt=new Date().toISOString();result.foregroundFrames=summary(foregroundFrames);result.passed=result.failures.length===0&&result.consoleErrors.length===0&&result.pageErrors.length===0&&result.returnCheck?.exactEndingFieldsEqual===true;
  if(browser)await browser.close();result.browserClosed=true;
  await fs.writeFile(`${prefix}-results.json`,JSON.stringify(result,null,2));
  console.log(JSON.stringify({type:'finished',passed:result.passed,runtimeSeconds:result.runtimeSeconds,completed:result.lastState?.completed,failures:result.failures,frameSummary:result.foregroundFrames,browserClosed:true,results:`${prefix}-results.json`}));
  if(!result.passed)process.exitCode=1;
}
