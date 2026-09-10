import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import path from 'node:path';
const output='evidence/platforms';await mkdir(`${output}/profiles`,{recursive:true});
const profile=await mkdtemp(path.resolve(`${output}/profiles/recovery-`));
const executablePath=path.resolve('builds/native/Dustlings-darwin-arm64/Dustlings.app/Contents/MacOS/Dustlings');
const env={...process.env,DUSTLINGS_TEST_USER_DATA:profile,DUSTLINGS_TEST_QA:'1'};
let app,page;
const result={date:new Date().toISOString(),kind:'Automated packaged Mac lifecycle edge cases with explicit temporary profile; no human or physical-device approval.',build:JSON.parse(await readFile('builds/desktop-build-manifest.json','utf8')),checks:[],errors:[]};
async function launch(){app=await electron.launch({executablePath,env,timeout:30000});page=await app.firstWindow();page.on('pageerror',e=>result.errors.push(e.message));await page.locator('#start-button').click();}
async function holdLock(){await page.evaluate(()=>{window.__holding=false;navigator.locks.request('dustlings.courtyard.v1',()=>{window.__holding=true;return new Promise(resolve=>window.__release=resolve);});});await page.waitForFunction(()=>window.__holding);}
try{
 await launch();
 await page.evaluate(()=>{const p=window.__dustlings.state.pointer;p.x=265;p.y=505;});
 const p=await page.evaluate(()=>{const p=window.__dustlings.renderer.worldToScreen(265,505),r=document.querySelector('canvas').getBoundingClientRect();return {x:r.x+p.x,y:r.y+p.y};});
 await page.mouse.move(p.x,p.y);await page.mouse.down();await page.waitForTimeout(1200);
 const brushing=await page.evaluate(()=>window.__dustlings.serialise());await holdLock();
 await app.evaluate(({BrowserWindow})=>{const window=BrowserWindow.getAllWindows()[0];window.close();window.close();});
 await page.waitForTimeout(200);assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().length),1);assert(await page.locator('#settings').evaluate(e=>e.open));assert.equal(await page.evaluate(()=>window.__dustlings.state.pointer.active),false);
 const closed=page.waitForEvent('close');await page.evaluate(()=>window.__release());await closed;
 assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().length),0);
 result.checks.push('Repeated native window close while save lock is held retains window; input stops, pause opens, window closes only after lock release.');
 const reopened=app.waitForEvent('window');const second=spawn(executablePath,[],{env,stdio:'ignore'});const exited=once(second,'exit');page=await reopened;await exited;await page.locator('#start-button').click();
 const recovered=await page.evaluate(()=>window.__dustlings.serialise());assert(recovered.dust.every((n,i)=>n<=brushing.dust[i]+1e-8));
 assert.equal(await app.evaluate(({session})=>session.defaultSession.listenerCount('will-download')),1);
 result.checks.push('Launching a second process reopens a closed Mac window, preserves latest brushed dust and keeps one download handler.');
 // Explicit storage failure is injected in this temporary test profile only.
 await page.evaluate(()=>{window.__setItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('dustlings.courtyard'))throw new DOMException('Injected storage full','QuotaExceededError');return window.__setItem.call(this,key,value);};});
 await app.evaluate(({dialog})=>{globalThis.__nativeSaveErrors=[];dialog.showMessageBox=async(_window,options)=>{globalThis.__nativeSaveErrors.push(options);return {response:0,checkboxChecked:false};};});
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close());
 for(let i=0;i<30;i++){if(await app.evaluate(()=>globalThis.__nativeSaveErrors.length))break;await page.waitForTimeout(50);}
 assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().length),1);
 const errors=await app.evaluate(()=>globalThis.__nativeSaveErrors);assert.equal(errors.length,1);assert.match(errors[0].message,/could not finish saving/);assert.match(await page.locator('#save-status').textContent(),/Save unavailable/);
 result.checks.push('Storage-write failure retains the game and shows an export-backup recovery message instead of silently quitting.');
 await page.evaluate(()=>{Storage.prototype.setItem=window.__setItem;});await page.locator('#resume-button').click();
 // Repeated application Quit requests must obey the same pending-save guard.
 await holdLock();await app.evaluate(({app})=>{app.quit();app.quit();});await page.waitForTimeout(200);
 assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().length),1);
 const exit=once(app.process(),'exit');await page.evaluate(()=>window.__release());await exit;await app.close().catch(()=>{});
 result.checks.push('Repeated application quit while save lock is held waits; process exits only after the pending save can finish.');
 await launch();await page.locator('#pause-button').click();await page.locator('#save-file').setInputFiles('evidence/v0.2/completed-test-save.json');await page.waitForFunction(()=>window.__dustlings.state.completed);
 const final=await page.evaluate(()=>window.__dustlings.serialise());const finalExit=once(app.process(),'exit');await app.evaluate(({app})=>{setTimeout(()=>app.quit(),0);});await finalExit;await app.close().catch(()=>{});
 await launch();const restored=await page.evaluate(()=>window.__dustlings.serialise());assert.equal(restored.completed,true);assert.equal(restored.restoration,1);assert.deepEqual(restored.dust,final.dust);assert.deepEqual(restored.upgrades,final.upgrades);assert.equal(restored.creatures.length,50);
 await page.screenshot({path:`${output}/desktop-restored.png`});
 result.checks.push('Completed courtyard survives native process quit/relaunch with all dust, upgrades, fountain and 50 helpers intact.');
 assert.equal(result.errors.length,0);result.status='passed';
}catch(error){result.status='failed';result.failure=error.stack;throw error;}
finally{await app?.close().catch(()=>{});await writeFile(`${output}/desktop-recovery-checks.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));}
