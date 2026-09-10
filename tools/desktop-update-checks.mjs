import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {once} from 'node:events';
import path from 'node:path';

const output='evidence/v0.3/native';
const archive='builds/Dustlings-Courtyard-0.2.0-darwin-arm64-Development.zip';
const expectedOldGame='cb4b9d7bc6174a96bd203a22f9a8a5a766f3fa0eca10475e80c8e4d681f5feea';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
await mkdir(output,{recursive:true});await mkdir('builds/native',{recursive:true});
const temp=await mkdtemp(path.resolve('builds/native/update-check-'));
const profile=path.join(temp,'profile');
const newExecutable=path.resolve('builds/native/Dustlings-darwin-arm64/Dustlings.app/Contents/MacOS/Dustlings');
const oldExecutable=path.join(temp,'old','Dustlings.app','Contents','MacOS','Dustlings');
const report={date:new Date().toISOString(),kind:'Automated packaged macOS ARM64 app update from 0.2.0 to 0.3.0 across different bundle paths. A labeled existing simulation fixture exercises all upgrades and 50 helpers; this is not human play, physical-device input, store delivery or performance evidence.',temporaryDirectory:path.relative(process.cwd(),temp),profile:path.relative(process.cwd(),profile),archive:{path:archive},newBuild:null,checks:[],errors:[]};
let app,page;
async function launch(executablePath){
 app=await electron.launch({executablePath,env:{...process.env,DUSTLINGS_TEST_USER_DATA:profile,DUSTLINGS_TEST_QA:'1'},timeout:30000});
 page=await app.firstWindow();page.on('pageerror',e=>report.errors.push(e.message));await page.waitForFunction(()=>!!window.__dustlings);
 const runtime=await app.evaluate(({app})=>({version:app.getVersion(),packaged:app.isPackaged,electron:process.versions.electron,chrome:process.versions.chrome,os:process.getSystemVersion(),arch:process.arch,path:app.getAppPath(),userData:app.getPath('userData')}));
 assert.equal(runtime.packaged,true);assert.equal(runtime.userData,profile);
 assert.equal(await page.evaluate(()=>location.origin),'dustlings://courtyard');
 const gameHash=await app.evaluate(({app})=>process.getBuiltinModule('crypto').createHash('sha256').update(process.getBuiltinModule('fs').readFileSync(process.getBuiltinModule('path').join(app.getAppPath(),'game.html'))).digest('hex'));
 return {...runtime,gameHash};
}
async function quit(){
 const process=app.process(),exited=once(process,'exit');
 await app.evaluate(({app})=>{setTimeout(()=>app.quit(),0);});
 let timer;
 try{await Promise.race([exited,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Native quit exceeded 15 seconds; save/close may be blocked.')),15000);})]);}
 finally{clearTimeout(timer);}
 await app.close().catch(()=>{});app=null;
}
async function snapshot(){return page.evaluate(()=>({state:window.__dustlings.serialise(),settings:JSON.parse(localStorage.getItem('dustlings.settings')),saved:JSON.parse(localStorage.getItem('dustlings.courtyard.v1'))}));}
function stable(state){const {savedAt,saveRevision,...fields}=state;return fields;}
try{
 report.newBuild=JSON.parse(await readFile('builds/desktop-build-manifest.json','utf8'));
 assert.equal(report.newBuild.game.version,'0.3.0','Package the 0.3.0 app before running this check.');
 const archiveBytes=await readFile(archive);report.archive.bytes=archiveBytes.length;report.archive.sha256=hash(archiveBytes);
 await mkdir(path.join(temp,'old'));execFileSync('/usr/bin/ditto',['-x','-k',path.resolve(archive),path.join(temp,'old')],{timeout:30000});
 report.oldRuntime=await launch(oldExecutable);assert.equal(report.oldRuntime.version,'0.2.0');assert.equal(report.oldRuntime.gameHash,expectedOldGame);
 await page.locator('#start-button').click();
 const brush=await page.evaluate(()=>{const p=window.__dustlings.renderer.worldToScreen(265,505),r=document.querySelector('#world').getBoundingClientRect();return {x:p.x+r.x,y:p.y+r.y};});
 await page.mouse.move(brush.x,brush.y);await page.mouse.down();await page.waitForTimeout(1200);await page.mouse.up();
 assert(await page.evaluate(()=>window.__dustlings.state.cleaned)>0);
 report.checks.push('Archived 0.2.0 app launched from extracted path; exact frozen game hash matched and normal pointer brushing cleaned dust.');
 await page.locator('#pause-button').click();
 const fixture={...JSON.parse(await readFile('evidence/v0.2/busy-test-save.json','utf8')),ritual:false,ritualTime:0,restoration:0};
 await writeFile(`${output}/update-preritual-fixture.json`,JSON.stringify(fixture,null,2)+'\n');
 report.fixture={source:'evidence/v0.2/busy-test-save.json',derived:`${output}/update-preritual-fixture.json`,changes:'Set ritual=false, ritualTime=0 and restoration=0 so actual crew redirection is permitted; dust, 50 helpers and all upgrades retained.'};
 await page.locator('#save-file').setInputFiles(`${output}/update-preritual-fixture.json`);await page.waitForFunction(()=>window.__dustlings.state.creatures.length===50);
 for(const [id,keys] of [['music-volume',['End','ArrowLeft']],['sfx-volume',['Home','ArrowRight']],['ambience-volume',['Home','ArrowRight','ArrowRight']]]){
  await page.locator('#'+id).focus();for(const key of keys)await page.keyboard.press(key);
 }
 for(const id of ['reduced-motion','tap-sweep','low-quality'])await page.locator('#'+id).check();
 await page.locator('#resume-button').click();await page.locator('#sound-toggle').click();await page.locator('#direct-tool').click();
 const destination=await page.evaluate(()=>{const p=window.__dustlings.renderer.worldToScreen(270,505),r=document.querySelector('#world').getBoundingClientRect();return {x:p.x+r.x,y:p.y+r.y};});
 await page.mouse.click(destination.x,destination.y);await page.locator('#pause-button').click();
 await page.evaluate(async()=>{await navigator.locks.request('dustlings.courtyard.v1',()=>{});});
 const before=await snapshot();assert.equal(before.state.creatures.length,50);assert.deepEqual(before.state.upgrades,{brush:true,teamwork:true,bloom:true});assert(before.state.assignment);assert.deepEqual(before.settings,{music:.99,sfx:.01,ambience:.02,muted:true,reducedMotion:true,tapSweep:true,lowQuality:true});assert.deepEqual(stable(before.saved),stable(before.state));
 await writeFile(`${output}/update-before-save.json`,JSON.stringify(before,null,2)+'\n');await page.screenshot({path:`${output}/update-before-settings.png`});
 report.checks.push('Old app imported the labeled 50-helper/all-upgrade fixture through the file input; actual controls changed every preference and assigned the crew; paused live state matched the canonical save.');
 await quit();
 report.newRuntime=await launch(newExecutable);assert.equal(report.newRuntime.version,'0.3.0');assert.equal(report.newRuntime.gameHash,report.newBuild.game.sha256);assert.notEqual(report.newRuntime.path,report.oldRuntime.path);
 assert.match(await page.locator('#start-button').innerText(),/Return/);
 const after=await snapshot();assert.deepEqual(stable(after.state),stable(before.state));assert.deepEqual(after.settings,before.settings);assert.deepEqual(after.saved,before.saved);
 assert.equal(await page.locator('#music-volume').inputValue(),'99');assert.equal(await page.locator('#sfx-volume').inputValue(),'1');assert.equal(await page.locator('#ambience-volume').inputValue(),'2');for(const id of ['reduced-motion','tap-sweep','low-quality'])assert.equal(await page.locator('#'+id).isChecked(),true);
 await writeFile(`${output}/update-after-save.json`,JSON.stringify(after,null,2)+'\n');await page.screenshot({path:`${output}/update-after-welcome.png`});
 report.checks.push('0.3.0 launched from a different app bundle using the same isolated profile; all serialized game fields (including 466 dust values, three upgrades, 50 creature records, assignment, elapsed progress and stats) and all settings matched exactly before play resumed.');
 await page.locator('#start-button').click();await page.waitForTimeout(1000);
 const resumed=await snapshot();assert(resumed.state.elapsed>after.state.elapsed);assert(resumed.state.dust.every((n,i)=>n<=after.state.dust[i]+1e-8));assert.equal(resumed.state.creatures.length,50);assert.deepEqual(resumed.state.assignment,after.state.assignment);
 await page.locator('#pause-button').click();await page.screenshot({path:`${output}/update-after-settings.png`});
 report.resumption={beforeElapsed:after.state.elapsed,afterElapsed:resumed.state.elapsed,beforeDust:after.state.dust.reduce((a,b)=>a+b,0),afterDust:resumed.state.dust.reduce((a,b)=>a+b,0),creatures:resumed.state.creatures.length,assignment:resumed.state.assignment};
 report.checks.push('The upgraded app resumed normal simulation without losing progress or crew direction; migrated controls displayed the saved preferences.');
 await quit();assert.equal(hash(await readFile(archive)),report.archive.sha256);assert.deepEqual(report.errors,[]);
 report.checks.push('Original 0.2.0 archive hash remained unchanged; both processes quit normally with no observed page errors.');report.status='passed';
}catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
finally{
 if(app){await app.close().catch(()=>{});}
 await writeFile(`${output}/update-checks.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
