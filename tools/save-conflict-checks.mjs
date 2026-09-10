import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const context=await browser.newContext({viewport:{width:1440,height:900}});const errors=[];const checks=[];
const a=await context.newPage(),b=await context.newPage();for(const p of[a,b])p.on('pageerror',e=>errors.push(e.message));
try{
  await a.goto('http://localhost:4173/?qa=1');await a.locator('#start-button').click();await a.evaluate(()=>window.__dustlings.save());
  await b.goto('http://localhost:4173/?qa=1'); // B now holds a valid but soon stale snapshot.
  await a.evaluate(async()=>{const q=window.__dustlings;q.state.elapsed=60;await q.save();q.state.elapsed=75;await q.save();q.pause(true);});
  const before=await a.evaluate(()=>({primary:localStorage.getItem('dustlings.courtyard.v1'),backup:localStorage.getItem('dustlings.courtyard.v1.backup')}));
  await b.locator('#start-button').click();await b.locator('#save-conflict').waitFor({state:'visible'});
  await b.evaluate(()=>window.__dustlings.save());await b.evaluate(()=>window.__dustlings.save());
  const after=await b.evaluate(()=>({primary:localStorage.getItem('dustlings.courtyard.v1'),backup:localStorage.getItem('dustlings.courtyard.v1.backup')}));assert.deepEqual(after,before);checks.push('Stale startup and repeated saves preserve both primary and previous valid backup');
  const time=await b.evaluate(()=>window.__dustlings.state.elapsed);await b.waitForTimeout(300);assert.equal(await b.evaluate(()=>window.__dustlings.state.elapsed),time);checks.push('Conflicting window pauses and exposes export plus load-latest recovery');
  await b.screenshot({path:'evidence/save-conflict-dialog.png'});
  await b.locator('#restart-button').click();await b.locator('#confirm-restart').click();assert.equal(await b.evaluate(()=>localStorage.getItem('dustlings.courtyard.v1')),before.primary);checks.push('Stale restart cannot erase another window');
  const downloadPromise=b.waitForEvent('download');await b.locator('#export-save').click();const download=await downloadPromise;assert(download.suggestedFilename().endsWith('.json'));checks.push('The local branch can still be exported from the conflict dialog');
  await b.locator('#load-latest-save').click();await b.waitForFunction(()=>!document.querySelector('#settings').open);assert((await b.evaluate(()=>window.__dustlings.state.elapsed))>=75);
  await a.locator('#save-conflict').waitFor({state:'visible'});checks.push('Explicit load-latest restores newer progress and transfers writing to that window');
  await b.evaluate(()=>window.__dustlings.save());assert.equal(await b.locator('#save-conflict').isVisible(),false);checks.push('Recovered current window can save normally');
  assert.equal(errors.length,0);
  await writeFile('evidence/save-conflict-checks.json',JSON.stringify({kind:'Two real tabs sharing one browser context; automated, no human testing',browser:await browser.version(),webLocks:await b.evaluate(()=>!!navigator.locks),checks,errors},null,2));
  console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();}
