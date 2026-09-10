import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const fixtures=process.env.DUSTLINGS_FIXTURE_DIR||'evidence';
const output=process.env.DUSTLINGS_EVIDENCE_DIR||'evidence';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const result={build:JSON.parse(await readFile('builds/build-manifest.json','utf8')),checks:[],errors:[],requests:[]};
const p=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});
p.on('pageerror',e=>result.errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))result.requests.push(r.url());});
try{
  await p.goto(pathToFileURL(resolve('builds/Dustlings Courtyard.html')).href+'?qa=1');await p.locator('#start-button').click();await p.waitForTimeout(100);await p.screenshot({path:`${output}/final-dirty.png`});
  const save=JSON.parse(await readFile(`${fixtures}/completed-test-save.json`,'utf8'));await p.evaluate(save=>window.__dustlings.load(save),save);await p.waitForTimeout(7000);
  assert.equal(await p.locator('#scene-caption-text').textContent(),'A little place, alive again');await p.screenshot({path:`${output}/final-restored.png`});result.checks.push('Restored caption matches completed game state');
  await p.evaluate(()=>window.__dustlings.save());await p.reload();await p.locator('#start-button').click();assert(await p.evaluate(()=>window.__dustlings.state.completed));result.checks.push('Exact final artifact offline launch and save/return');
  for(const [name,width,height] of [['macbook',1280,800],['ipad',820,1180],['iphone',390,844],['iphone-landscape',844,390]]){
    await p.setViewportSize({width,height});await p.waitForTimeout(100);
    for(const selector of ['#sound-toggle','#pause-button','#brush-tool','#direct-tool','#zoom-in','#pan-toggle']){const r=await p.locator(selector).boundingBox();assert(r.width>=44&&r.height>=44,`${name} ${selector} ${r.width}x${r.height}`);}
    assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:`${output}/final-${name}.png`});result.checks.push(`${name}: primary header/tool/camera controls >=44px, no horizontal overflow`);
  }
  await p.setViewportSize({width:390,height:844});await p.locator('#zoom-in').click();await p.screenshot({path:`${output}/final-iphone-zoom.png`});await p.locator('#mobile-journal').click();await p.screenshot({path:`${output}/final-phone-journal.png`});
  await p.locator('#close-journal').click();await p.keyboard.press('Escape');assert(await p.locator('#settings').evaluate(e=>e.open));await p.locator('#resume-button').click();result.checks.push('Final phone drawer and Escape pause/resume');
  assert.equal(result.errors.length,0);assert.equal(result.requests.length,0);result.checks.push('Zero network requests or JS exceptions');
}finally{await browser.close();await writeFile(`${output}/final-smoke.json`,JSON.stringify(result,null,2));}
console.log(JSON.stringify(result,null,2));
