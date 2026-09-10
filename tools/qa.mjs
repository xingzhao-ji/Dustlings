import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {createState,tick,buyUpgrade,beginRitual,serialise,assignCrew} from '../src/game.js';
import assert from 'node:assert/strict';

const output='evidence';await mkdir(output,{recursive:true});
const executablePath=process.env.PLAYWRIGHT_EXECUTABLE_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await chromium.launch({executablePath,headless:true});
const errors=[], results={kind:'Automated browser/simulation evidence. Not human playtesting.',date:new Date().toISOString(),environment:{host:'MacBook Pro Mac16,7',chip:'Apple M4 Pro',memoryGB:48,os:'macOS 26.6.2',browser:await browser.version(),mode:'headless Chrome; native screen/audio review unavailable',viewport:{width:1440,height:900},deviceScaleFactor:2},checks:[],pacing:[]};
function runSimulation(duty){
  const s=createState();let busy=null,ritualAt=null;
  for(let i=0;i<48000&&!s.completed;i++){
    s.pointer.active=s.elapsed%10<duty*10;
    if(i%60===0){const d=s.dust.filter(d=>d.amount>.01).sort((a,b)=>b.amount-a.amount)[0];if(d)Object.assign(s.pointer,{x:d.x,y:d.y});}
    tick(s,.05);for(const id of ['brush','teamwork','bloom'])buyUpgrade(s,id);
    if(!busy&&s.creatures.length===50)busy=serialise(s);
    if(beginRitual(s))ritualAt=s.elapsed;
  }
  assert(s.completed);return {save:serialise(s),busy,metrics:{brushDutyCycle:duty,firstHelperSeconds:s.firstHelperAt,firstUpgradeSeconds:s.firstUpgradeAt,ritualStartSeconds:ritualAt,completionSeconds:s.completedAt,helpers:s.creatures.length,description:'Automated target selection every 3 simulation seconds, immediate purchases, immediate ritual. No human decisions.'}};
}
const sims=[1,.4,.15].map(runSimulation);results.pacing=sims.map(s=>s.metrics);
await writeFile(`${output}/completed-test-save.json`,JSON.stringify(sims[0].save,null,2));
await writeFile(`${output}/busy-test-save.json`,JSON.stringify(sims[0].busy,null,2));
const context=await browser.newContext({viewport:results.environment.viewport,deviceScaleFactor:2,recordVideo:{dir:`${output}/raw-video`,size:{width:1440,height:900}}});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto('http://localhost:4173/?qa=1');
  await page.screenshot({path:`${output}/00-welcome.png`});
  await page.getByRole('button',{name:'Bring it to life'}).click();
  await page.waitForTimeout(300);
  await page.screenshot({path:`${output}/01-dirty-courtyard.png`});
  // Capture the actual canvas and the game's own live audio. No microphone.
  await page.evaluate(()=>{
    const stream=document.querySelector('canvas').captureStream(30);
    for(const track of window.__dustlings.audio.getCaptureStream().getAudioTracks())stream.addTrack(track);
    window.__captureChunks=[];window.__captureRecorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9,opus',videoBitsPerSecond:2500000});
    window.__captureRecorder.ondataavailable=e=>{if(e.data.size)window.__captureChunks.push(e.data);};
    window.__captureRecorder.start(1000);
  });
  const worldPoint=async(x,y)=>page.evaluate(({x,y})=>{const p=window.__dustlings.renderer.worldToScreen(x,y),r=document.querySelector('canvas').getBoundingClientRect();return{x:p.x+r.x,y:p.y+r.y};},{x,y});
  let p=await worldPoint(265,505);await page.mouse.move(p.x,p.y);await page.mouse.down();
  for(let segment=0;segment<10;segment++){
    const target=await worldPoint(190+(segment%5)*45,480+Math.floor(segment/5)*65);
    await page.mouse.move(target.x,target.y,{steps:15});await page.waitForTimeout(3600);
    if(segment===3)await page.screenshot({path:`${output}/02-first-helpers.png`});
  }
  await page.mouse.up();
  const opening=await page.evaluate(()=>({elapsed:window.__dustlings.state.elapsed,firstHelperAt:window.__dustlings.state.firstHelperAt,crew:window.__dustlings.state.creatures.length,motes:window.__dustlings.state.motes}));
  results.opening=opening;assert(opening.firstHelperAt<=30);assert(opening.crew>=3);
  if(await page.locator('#upgrade-brush').isEnabled()){await page.locator('#upgrade-brush').click();results.checks.push('Bought first upgrade through actual UI after normal-speed brush input');}
  await page.locator('#direct-tool').click();p=await worldPoint(745,495);await page.mouse.click(p.x,p.y);await page.waitForTimeout(3500);
  assert((await page.evaluate(()=>window.__dustlings.state.stats.assignments))>=1);
  await page.screenshot({path:`${output}/03-upgrade-and-direction.png`});
  const liveRecording=await page.evaluate(async()=>{
    await new Promise(resolve=>{window.__captureRecorder.onstop=resolve;window.__captureRecorder.stop();});
    const blob=new Blob(window.__captureChunks,{type:'video/webm'});return await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob);});
  });
  await writeFile(`${output}/opening-with-sound.webm`,Buffer.from(liveRecording,'base64'));
  const saved=await page.evaluate(()=>{window.__dustlings.save();return window.__dustlings.serialise();});
  await page.reload();await page.getByRole('button',{name:'Return to your courtyard'}).click();
  const returned=await page.evaluate(()=>window.__dustlings.serialise());assert(returned.elapsed>=saved.elapsed&&returned.elapsed<saved.elapsed+2);assert(returned.upgrades.brush===saved.upgrades.brush);
  results.checks.push('Reload preserved normal-play progress, crew and upgrade');
  // Fixtures are generated through the pure simulation and clearly labeled as automated.
  await page.evaluate(save=>window.__dustlings.load(save),sims[0].busy);
  await page.evaluate(()=>{window.__dustlings.state.pointer.active=false;window.__dustlings.resetPerformance();});
  await page.screenshot({path:`${output}/04-busy-50-fixture.png`});
  console.log('Opening captured; beginning 60-second 50-helper performance sample.');
  for(let i=0;i<6;i++)await page.waitForTimeout(10000);
  results.performance=await page.evaluate(()=>window.__dustlings.getPerformance());
  results.performance.durationSeconds=60;results.performance.fixture='50-helper cleaning scene generated by automated simulation';results.performance.quality='normal, DPR2, particles enabled, sound playing';
  await page.evaluate(save=>window.__dustlings.load(save),sims[0].save);await page.waitForTimeout(1200);
  await page.screenshot({path:`${output}/05-restored-courtyard.png`});
  results.checks.push('Restored scene rendered from fully completed automated simulation save');
  for(const [name,width,height] of [['macbook',1280,800],['ipad-portrait',820,1180],['iphone-portrait',390,844],['iphone-landscape',844,390]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(200);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:`${output}/layout-${name}.png`});
    results.checks.push(`${name} ${width}x${height}: no document horizontal overflow (simulated viewport)`);
  }
  await page.setViewportSize({width:390,height:844});await page.locator('#zoom-in').click();await page.screenshot({path:`${output}/layout-iphone-zoom.png`});
  results.consoleErrors=errors;assert.equal(errors.length,0);
}finally{
  await context.close();await browser.close();await writeFile(`${output}/qa-results.json`,JSON.stringify(results,null,2));
}
console.log(JSON.stringify(results,null,2));
