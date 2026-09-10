import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,mkdtemp} from 'node:fs/promises';
import path from 'node:path';
import {once} from 'node:events';
import {createServer} from 'node:http';
const output='evidence/platforms';await mkdir(output,{recursive:true});await mkdir(`${output}/profiles`,{recursive:true});
const profile=await mkdtemp(path.resolve(`${output}/profiles/native-`));
const executablePath=path.resolve('builds/native/Dustlings-darwin-arm64/Dustlings.app/Contents/MacOS/Dustlings');
const result={date:new Date().toISOString(),kind:'Automated execution of packaged native Electron app on macOS. No human playtest, physical input, or listening claim.',profile:path.relative(process.cwd(),profile),build:JSON.parse(await readFile('builds/desktop-build-manifest.json','utf8')),checks:[],errors:[],performance:null};
let app,page;
async function launch(qa=true){
 app=await electron.launch({executablePath,env:{...process.env,DUSTLINGS_TEST_USER_DATA:profile,DUSTLINGS_TEST_QA:qa?'1':'0'},timeout:30000});
 page=await app.firstWindow();page.on('pageerror',e=>result.errors.push(e.message));await page.waitForSelector('#start-button');
}
async function quit(){const exited=once(app.process(),'exit');await app.evaluate(({app})=>{setTimeout(()=>app.quit(),0);});await exited;await app.close().catch(()=>{});}
try{
 await launch();
 result.runtime=await app.evaluate(({app,BrowserWindow})=>({electron:process.versions.electron,chrome:process.versions.chrome,os:process.getSystemVersion(),arch:process.arch,packaged:app.isPackaged,userData:app.getPath('userData'),webPreferences:((p)=>({sandbox:p.sandbox,contextIsolation:p.contextIsolation,nodeIntegration:p.nodeIntegration,webSecurity:p.webSecurity}))(BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences())}));
 assert.equal(result.runtime.packaged,true);assert.equal(result.runtime.webPreferences.sandbox,true);assert.equal(result.runtime.webPreferences.contextIsolation,true);assert.equal(result.runtime.webPreferences.nodeIntegration,false);
 assert.deepEqual(await page.evaluate(()=>[typeof require,typeof process,location.origin]),['undefined','undefined','dustlings://courtyard']);
 result.checks.push('Packaged native Mac ARM64 app launched with sandbox, isolated context, no page Node access and stable local origin.');
 await page.locator('#start-button').click();await page.waitForTimeout(300);
 await page.screenshot({path:`${output}/desktop-before.png`});
 await page.evaluate(()=>{const stream=document.querySelector('canvas').captureStream(30);for(const t of window.__dustlings.audio.getCaptureStream().getAudioTracks())stream.addTrack(t);window.__chunks=[];window.__recording=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9,opus',videoBitsPerSecond:2500000});window.__recording.ondataavailable=e=>{if(e.data.size)window.__chunks.push(e.data);};window.__recording.start(1000);});
 const point=await page.evaluate(()=>{const p=window.__dustlings.renderer.worldToScreen(265,505),r=document.querySelector('canvas').getBoundingClientRect();return {x:p.x+r.x,y:p.y+r.y};});
 await page.mouse.move(point.x,point.y);await page.mouse.down();await page.waitForTimeout(12000);await page.mouse.up();
 const opening=await page.evaluate(()=>({elapsed:window.__dustlings.state.elapsed,cleaned:window.__dustlings.state.cleaned,crew:window.__dustlings.state.creatures.length,firstHelperAt:window.__dustlings.state.firstHelperAt}));
 assert(opening.crew>=1);result.opening=opening;
 await page.screenshot({path:`${output}/desktop-after-brushing.png`});
 const video=await page.evaluate(async()=>{await new Promise(r=>{window.__recording.onstop=r;window.__recording.stop();});return await new Promise(r=>{const reader=new FileReader();reader.onload=()=>r(reader.result.split(',')[1]);reader.readAsDataURL(new Blob(window.__chunks,{type:'video/webm'}));});});
 await writeFile(`${output}/desktop-opening.webm`,Buffer.from(video,'base64'));
 result.checks.push('Normal-speed mouse brushing formed first helper; before/after native renderer captures and 12-second game/audio recording saved.');
 // Native suspension hook. This is an injected OS event, not a physical sleep test.
 await app.evaluate(({powerMonitor})=>powerMonitor.emit('suspend'));
 await page.waitForFunction(()=>document.querySelector('#settings').open);
 const paused=await page.evaluate(()=>window.__dustlings.state.elapsed);await page.waitForTimeout(500);
 assert.equal(await page.evaluate(()=>window.__dustlings.state.elapsed),paused);
 assert.equal(await page.evaluate(()=>window.__dustlings.audio.getDiagnostics().contextState),'suspended');
 result.checks.push('Injected native suspend event pauses simulation and WebAudio; physical lid sleep remains untested.');
 await page.locator('#resume-button').click();await page.waitForTimeout(200);
 const preQuit=await page.evaluate(()=>window.__dustlings.serialise());
 await quit();await launch();
 assert.match(await page.locator('#start-button').innerText(),/Return/);
 await page.locator('#start-button').click();
 const returned=await page.evaluate(()=>window.__dustlings.serialise());assert(returned.dust.every((amount,i)=>amount<=preQuit.dust[i]+1e-8));assert.equal(returned.creatures.length,preQuit.creatures.length);result.relaunch={beforeElapsed:preQuit.elapsed,afterElapsed:returned.elapsed,beforeDust:preQuit.dust.reduce((a,b)=>a+b,0),afterDust:returned.dust.reduce((a,b)=>a+b,0),helpers:returned.creatures.length};assert(returned.elapsed>=preQuit.elapsed&&returned.elapsed<preQuit.elapsed+2);
 result.checks.push('Native quit and process relaunch preserved normal-play progress using the same persistent profile.');
 // Exercise the actual file import UI using a labeled 50-helper simulation fixture.
 await page.locator('#pause-button').click();await page.locator('#save-file').setInputFiles('evidence/v0.2/busy-test-save.json');
 await page.waitForFunction(()=>window.__dustlings.state.creatures.length===50);
 await page.locator('#resume-button').click();await page.waitForTimeout(300);
 await page.screenshot({path:`${output}/desktop-50-fixture.png`});
 if(process.env.DUSTLINGS_SKIP_PROFILE!=='1'){
 await page.evaluate(()=>window.__dustlings.resetPerformance());
 console.log('Native import/relaunch checks passed; profiling 50 helpers for 60 seconds.');
 for(let i=0;i<6;i++)await page.waitForTimeout(10000);
 result.performance=await page.evaluate(()=>window.__dustlings.getPerformance());
 result.performance.conditions='60 seconds observed; game retains only the latest 3,600 frame intervals (about30s on120Hz host). Visible native Electron window, no video during sample, 50-helper simulation fixture; other host activity not controlled.';
 assert.equal(result.performance.creatures,50);
 result.checks.push('Native JSON file import restored 50 helpers; completed 60-second performance sample.');
 }else result.checks.push('Native JSON file import restored 50 helpers. Performance not repeated for save-only wrapper correction; see desktop-profile.json.');
 // Intercept destination only so automation does not operate a system Save dialog.
 const exportPath=path.join(profile,'export-save.json');
 await app.evaluate(({BrowserWindow},target)=>{BrowserWindow.getAllWindows()[0].webContents.session.once('will-download',(_event,item)=>item.setSavePath(target));},exportPath);
 await page.locator('#pause-button').click();const beforeExport=await page.evaluate(()=>window.__dustlings.serialise());await page.locator('#export-save').click();
 for(let i=0;i<40;i++){try{const exported=JSON.parse(await readFile(exportPath,'utf8'));const {savedAt:_a,...actual}=exported,{savedAt:_b,...expected}=beforeExport;assert.deepEqual(actual,expected);await writeFile(`${output}/desktop-export-save.json`,JSON.stringify(exported,null,2));result.checks.push('Native download export produced valid matching JSON (destination supplied by automation; native Save dialog usability untested).');break;}catch(error){if(i===39)throw error;await page.waitForTimeout(100);}}
 await page.locator('#resume-button').click();
 let requests=0;const server=createServer((_request,response)=>{requests++;response.setHeader('Access-Control-Allow-Origin','*');response.end('reachable');});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const url=`http://127.0.0.1:${server.address().port}/probe`;assert.equal(await (await fetch(url)).text(),'reachable');requests=0;const external=await page.evaluate(async url=>{try{await fetch(url);return false;}catch{return true;}},url);assert.equal(external,true);assert.equal(requests,0);}finally{await new Promise(resolve=>server.close(resolve));}
 result.checks.push('Runtime HTTP request blocked; courtyard is fully bundled and offline.');
 await quit();await launch(false);assert.equal(await page.evaluate(()=>typeof window.__dustlings),'undefined');
 result.checks.push('Normal packaged launch does not expose QA controls.');
 await quit();assert.equal(result.errors.length,0);
 result.status='passed';
}catch(error){result.status='failed';result.failure=error.stack;throw error;}
finally{await app?.close().catch(()=>{});await writeFile(`${output}/desktop-checks.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));}
