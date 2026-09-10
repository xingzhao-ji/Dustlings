import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const report={recordedAt:new Date().toISOString(),browser:await browser.version(),conditions:'Fresh isolated headless browser contexts. Real keyboard brush input and navigation; no q.save or simulation advance. Not physical-device lifecycle or human usability evidence.',interruptions:[],settings:[],errors:[]};
const url='http://127.0.0.1:4173/?qa=1',away='http://127.0.0.1:4173/interruption-away.html';
async function contextFor(settings){const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});await context.route('**/interruption-away.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Audit away page</title><p>Same-origin lifecycle test destination.</p>'}));if(settings!==undefined)await context.addInitScript(value=>{if(!sessionStorage.getItem('audit-settings-seeded')){localStorage.setItem('dustlings.settings',value);sessionStorage.setItem('audit-settings-seeded','true');}},settings);return context;}
async function attach(context){const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));return page;}
async function launchGame(page){await page.goto(url);await page.waitForFunction(()=>!!window.__dustlings);await page.locator('#start-button').click();await page.waitForFunction(()=>!!localStorage.getItem('dustlings.courtyard.v1'));}
async function snapshot(page){return page.evaluate(()=>{const stored=JSON.parse(localStorage.getItem('dustlings.courtyard.v1')||'null');return {cleaned:window.__dustlings?.state.cleaned,elapsed:window.__dustlings?.state.elapsed,brushed:window.__dustlings?.state.stats.brushed,storedCleaned:stored?stored.dust.reduce((n,amount)=>n+1-amount,0):null,storedElapsed:stored?.elapsed};});}
async function brush(page){await page.locator('#world').focus();await page.keyboard.press('n');await page.keyboard.press('Space');await page.waitForTimeout(450);await page.keyboard.press('Space');return snapshot(page);}
try{
 for(let trial=1;trial<=3;trial++){
  const context=await contextFor(),page=await attach(context);await launchGame(page);const before=await brush(page);await page.reload();await page.waitForFunction(()=>!!window.__dustlings);const after=await snapshot(page);
  report.interruptions.push({case:'reload-after-fresh-brushing',trial,before,after,retained:after.cleaned>=before.cleaned-.000001,lostCleaned:Math.max(0,before.cleaned-after.cleaned)});await context.close();
 }
 {
  const context=await contextFor(),page=await attach(context);await page.goto(away);await launchGame(page);const before=await brush(page);await page.goBack();
  const awayStored=await page.evaluate(()=>{const raw=localStorage.getItem('dustlings.courtyard.v1'),value=JSON.parse(raw),journal=JSON.parse(localStorage.getItem('dustlings.courtyard.v1.interrupted')||'null');const cleaned=value.dust.reduce((n,a)=>n+1-a,0),journalMatches=journal?.baseline===raw,journalCleaned=journalMatches?journal.state.dust.reduce((n,a)=>n+1-a,0):null;return {cleaned,elapsed:value.elapsed,journalMatches,journalCleaned,recoverableCleaned:journalMatches?journalCleaned:cleaned};});
  await page.goForward();await page.waitForFunction(()=>!!window.__dustlings);const after=await snapshot(page);
  report.interruptions.push({case:'history-back-and-forward-after-fresh-brushing',before,awayStored,after,retained:after.cleaned>=before.cleaned-.000001,durablyStored:awayStored.recoverableCleaned>=before.cleaned-.000001});await context.close();
 }
 {
  const context=await contextFor(),a=await attach(context);await launchGame(a);const b=await attach(context);await b.goto(url);await b.waitForFunction(()=>!!window.__dustlings);
  const progress=await brush(a);await a.reload();await a.waitForFunction(()=>!!window.__dustlings);
  const before=await a.evaluate(()=>({primary:localStorage.getItem('dustlings.courtyard.v1'),backup:localStorage.getItem('dustlings.courtyard.v1.backup'),journal:localStorage.getItem('dustlings.courtyard.v1.interrupted')}));
  await b.locator('#start-button').click();await b.locator('#save-conflict').waitFor({state:'visible'});
  const after=await b.evaluate(()=>({primary:localStorage.getItem('dustlings.courtyard.v1'),backup:localStorage.getItem('dustlings.courtyard.v1.backup'),journal:localStorage.getItem('dustlings.courtyard.v1.interrupted')}));
  await b.locator('#load-latest-save').click();await b.waitForFunction(()=>!document.querySelector('#settings').open);const recovered=await snapshot(b);
  report.journalConflict={kind:'Two actual tabs: B loaded the same canonical revision before A wrote a newer interruption journal',primaryUnchanged:before.primary===after.primary,backupUnchanged:before.backup===after.backup,journalUnchanged:before.journal===after.journal,conflictShown:true,beforeCleaned:progress.cleaned,recoveredCleaned:recovered.cleaned,passed:before.primary===after.primary&&before.backup===after.backup&&before.journal===after.journal&&recovered.cleaned>=progress.cleaned-.000001};await context.close();
 }
 {
  const context=await contextFor();let page=await attach(context);await launchGame(page);const before=await brush(page);await page.close();page=await attach(context);await page.goto(url);await page.waitForFunction(()=>!!window.__dustlings);const after=await snapshot(page);
  report.interruptions.push({case:'close-and-reopen-after-fresh-brushing',before,after,retained:after.cleaned>=before.cleaned-.000001,lostCleaned:Math.max(0,before.cleaned-after.cleaned)});await context.close();
 }
 for(const [kind,value] of [['malformed-json','{bad'],['wrong-types',JSON.stringify({music:'loud',sfx:{},ambience:-8,muted:'false',tapSweep:'false',lowQuality:'false',reducedMotion:'false'})]]){
  const context=await contextFor(value),page=await attach(context);await launchGame(page);await page.locator('#pause-button').click();
  const initial=await page.evaluate(()=>{let stored=null;try{stored=JSON.parse(localStorage.getItem('dustlings.settings'));}catch{}return {stored,controls:['music','sfx','ambience'].map(id=>({id,value:document.querySelector(`#${id}-volume`).value,label:document.querySelector(`#${id}-value`).textContent})),audio:window.__dustlings.audio.getDiagnostics(),tap:document.querySelector('#tap-sweep').checked,motion:document.querySelector('#reduced-motion').checked,lightweight:document.querySelector('#low-quality').checked};});
  await page.locator('#music-volume').fill('23');await page.locator('#resume-button').click();await page.locator('#sound-toggle').click();
  const changed=await page.evaluate(()=>JSON.parse(localStorage.getItem('dustlings.settings')));
  await page.reload();await page.waitForFunction(()=>!!window.__dustlings);const reloaded=await page.evaluate(()=>({settings:JSON.parse(localStorage.getItem('dustlings.settings')),musicLabel:document.querySelector('#music-value').textContent,sfxLabel:document.querySelector('#sfx-value').textContent,ambienceLabel:document.querySelector('#ambience-value').textContent,audio:window.__dustlings.audio.getDiagnostics()}));
  const validVolumes=['music','sfx','ambience'].every(key=>typeof reloaded.settings[key]==='number'&&Number.isFinite(reloaded.settings[key])&&reloaded.settings[key]>=0&&reloaded.settings[key]<=1);
  const validFlags=['muted','tapSweep','lowQuality','reducedMotion'].every(key=>typeof reloaded.settings[key]==='boolean');
  report.settings.push({kind,initial,changed,reloaded,validVolumes,validFlags,changedVolumeRetained:reloaded.settings.music===.23,changedMuteRetained:reloaded.settings.muted===changed.muted});await context.close();
 }
}catch(error){report.errors.push(error.stack);}
finally{report.summary={interruptionsRetained:report.interruptions.filter(c=>c.retained).length,interruptionsTested:report.interruptions.length,validSettingsCases:report.settings.filter(c=>c.validVolumes&&c.validFlags).length,settingsCases:report.settings.length,journalConflictPassed:report.journalConflict?.passed??null,errors:report.errors.length};await mkdir('evidence',{recursive:true});await writeFile('evidence/interruption-checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));await browser.close();}
