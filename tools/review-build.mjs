import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const manifest=JSON.parse(await readFile('builds/build-manifest.json','utf8'));
const busy=JSON.parse(await readFile('evidence/busy-test-save.json','utf8'));
const complete=JSON.parse(await readFile('evidence/completed-test-save.json','utf8'));
busy.ritual=false;busy.ritualTime=0;busy.restoration=0;
const result={kind:'Final standalone build automation; no human review',build:manifest,checks:[],errors:[],externalRequests:[],performance:null};
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2});
const page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))result.externalRequests.push(r.url());});
try{
  await page.goto(pathToFileURL(resolve('builds/Dustlings Courtyard.html')).href+'?qa=1');
  await page.getByRole('button',{name:'Bring it to life'}).click();
  await page.screenshot({path:'evidence/final-dirty.png'});
  await page.evaluate(save=>window.__dustlings.load(save),busy);
  await page.waitForTimeout(1000);await page.screenshot({path:'evidence/final-50-helpers.png'});
  await page.evaluate(()=>window.__dustlings.resetPerformance());
  console.log('Final standalone build: 60-second active cleaning sample, 50 helpers.');
  for(let i=0;i<6;i++)await page.waitForTimeout(10000);
  result.performance=await page.evaluate(()=>window.__dustlings.getPerformance());
  result.performance.conditions={durationSeconds:60,host:'MacBook Pro Mac16,7, Apple M4 Pro, 48GB',os:'macOS 26.6.2',browser:await browser.version(),headless:true,viewport:'1440x900',dpr:2,quality:'normal',audio:'playing, native listening unverified',fixture:'50 helpers at ~75% clear; chorus held for controlled active cleaning sample',concurrency:'No other agents running browser checks during this sample'};
  await page.keyboard.press('Escape');assert(await page.locator('#settings').evaluate(e=>e.open));await page.locator('#resume-button').click();
  result.checks.push('Standalone file opened, started audio without errors, and Escape pause/resume worked');
  await page.evaluate(save=>window.__dustlings.load(save),complete);await page.waitForTimeout(6000);
  await page.screenshot({path:'evidence/final-restored.png'});
  await page.evaluate(()=>window.__dustlings.save());await page.reload();await page.getByRole('button',{name:'Return to your courtyard'}).click();
  assert(await page.evaluate(()=>window.__dustlings.state.completed));result.checks.push('Standalone save survived reload with completed courtyard');
  for(const [name,width,height] of [['macbook',1280,800],['ipad',820,1180],['iphone',390,844],['iphone-landscape',844,390]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(100);await page.screenshot({path:`evidence/final-${name}.png`});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.setViewportSize({width:390,height:844});await page.locator('#zoom-in').click();await page.screenshot({path:'evidence/final-iphone-zoom.png'});
  await page.locator('#mobile-journal').click();await page.screenshot({path:'evidence/final-phone-journal.png'});
  result.checks.push('Four final-build viewport layouts have no horizontal document overflow; phone journal/zoom captured');
  assert.equal(result.errors.length,0);assert.equal(result.externalRequests.length,0);result.checks.push('Zero JS exceptions and zero network requests: offline self-contained build');
}finally{await writeFile('evidence/final-build-checks.json',JSON.stringify(result,null,2));await browser.close();}
console.log(JSON.stringify(result,null,2));
