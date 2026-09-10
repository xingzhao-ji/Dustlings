import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';

const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const report={timestamp:new Date().toISOString(),browser:await browser.version(),kind:'Focused automated accessibility and interaction audit. No screen reader was operated, no human enjoyment or usability claim, and touch is CDP emulation.',conditions:'Fresh isolated contexts, DPR 1. May overlap root performance/capture work. These are functional observations, not timing or performance benchmarks.',checks:[],errors:[]};
const record=(id,pass,details={})=>report.checks.push({id,pass,...details});
const url=process.env.DUSTLINGS_URL||'http://127.0.0.1:4173/?qa=1';
async function pageFor(touch=false,init=null){const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1440,height:900},hasTouch:touch,isMobile:touch,deviceScaleFactor:1});if(init)await context.addInitScript(init);const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>!!window.__dustlings);return page;}
async function start(page){await page.locator('#start-button').click();await page.waitForTimeout(100);}
async function point(page,x,y){return page.evaluate(({x,y})=>{const r=document.querySelector('#world').getBoundingClientRect(),p=window.__dustlings.renderer.worldToScreen(x,y);return {x:p.x+r.left,y:p.y+r.top+42};},{x,y});}
try{
 const desktop=await pageFor();const ax=await desktop.context().newCDPSession(desktop);
 const welcomeAX=(await ax.send('Accessibility.getFullAXTree')).nodes.filter(n=>n.role?.value==='dialog').map(n=>({role:n.role.value,name:n.name?.value||''}));
 record('welcome-dialog-has-accessible-name',welcomeAX.length>0&&welcomeAX.every(n=>n.name.trim()),{nodes:welcomeAX});
 await start(desktop);
 const initial=await desktop.evaluate(()=>window.__dustlings.serialise());
 await desktop.locator('#world').focus();await desktop.keyboard.press('b');await desktop.keyboard.down('Space');
 const keyboard=await desktop.evaluate(()=>{const q=window.__dustlings,before=q.state.stats.brushed;q.advance(1);return {before,after:q.state.stats.brushed,pointer:{...q.state.pointer}};});await desktop.keyboard.up('Space');
 record('keyboard-can-perform-first-brush',keyboard.after>keyboard.before,keyboard);
 await desktop.keyboard.press('Space');
 await desktop.evaluate(()=>{const q=window.__dustlings;q.state.notice='Your little crew is ready.';q.state.noticeTime=5;});
 const live=await desktop.evaluate(async()=>{const node=document.querySelector('#toast');let replacements=0;const observer=new MutationObserver(changes=>{replacements+=changes.filter(c=>c.type==='childList'||c.type==='characterData').length;});observer.observe(node,{childList:true,characterData:true,subtree:true});await new Promise(resolve=>setTimeout(resolve,750));observer.disconnect();return {unchangedMessage:node.textContent,replacements,windowMs:750,ariaLive:node.getAttribute('aria-live')};});
 record('unchanged-status-is-not-repeatedly-replaced',live.replacements<=1,live);
 await desktop.locator('#pause-button').click();await desktop.waitForTimeout(150);
 const settingsAX=(await ax.send('Accessibility.getFullAXTree')).nodes.filter(n=>n.role?.value==='dialog').map(n=>({role:n.role.value,name:n.name?.value||''}));
 record('settings-dialog-has-accessible-name',settingsAX.length>0&&settingsAX.every(n=>n.name.trim()),{nodes:settingsAX});
 const scoreQuiet=await desktop.evaluate(()=>({paused:window.__dustlings.audio.paused,master:window.__dustlings.audio.master.gain.value}));
 await desktop.waitForTimeout(550);const audioPaused=await desktop.evaluate(()=>window.__dustlings.audio.getDiagnostics());record('settings-pauses-audio',scoreQuiet.paused&&scoreQuiet.master<.001&&audioPaused.paused&&audioPaused.contextState==='suspended',{...audioPaused,scoreQuiet,note:'Explicit pause-button UI cue may briefly play; game score stays silent and context then suspends.'});
 const beforeImport=await desktop.evaluate(()=>window.__dustlings.serialise());
 await desktop.locator('#save-file').setInputFiles({name:'damaged.json',mimeType:'application/json',buffer:Buffer.from('{broken')});
 const invalid=await desktop.evaluate(()=>({save:window.__dustlings.serialise(),status:document.querySelector('#settings-save-note').textContent}));
 record('invalid-import-keeps-current-courtyard',JSON.stringify(beforeImport.dust)===JSON.stringify(invalid.save.dust)&&invalid.status.includes('Could not import'),{status:invalid.status});
 const restored={...initial,dust:initial.dust.map((n,i)=>i<400?0:n),elapsed:120,upgrades:{brush:true,teamwork:true,bloom:true},restoration:.4,ritual:true};
 await desktop.locator('#save-file').setInputFiles({name:'restore.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(restored))});
 await desktop.waitForFunction(()=>window.__dustlings.state.restoration===.4&&window.__dustlings.audio.getDiagnostics().progress===.4);
 const imported=await desktop.evaluate(()=>({restoration:window.__dustlings.state.restoration,cleaned:window.__dustlings.state.cleaned,audio:window.__dustlings.audio.getDiagnostics(),status:document.querySelector('#settings-save-note').textContent}));
 record('import-restores-progress-and-audio-stage-while-paused',imported.restoration===.4&&imported.cleaned===400&&imported.audio.progress===.4&&imported.audio.paused,imported);
 await desktop.locator('#resume-button').click();await desktop.locator('#pan-toggle').click();await desktop.locator('#pause-button').click();await desktop.locator('#restart-button').click();await desktop.locator('#confirm-restart').click();
 await desktop.waitForFunction(()=>!document.querySelector('#settings').open&&window.__dustlings.state.cleaned===0);
 const restart=await desktop.evaluate(()=>({cleaned:window.__dustlings.state.cleaned,restoration:window.__dustlings.state.restoration,upgrades:window.__dustlings.state.upgrades,mode:window.__dustlings.state.mode,panPressed:document.querySelector('#pan-toggle').getAttribute('aria-pressed'),audio:window.__dustlings.audio.getDiagnostics()}));
 record('restart-restores-brush-control-as-well-as-progress',restart.cleaned===0&&restart.restoration===0&&restart.audio.progress===0&&restart.panPressed==='false'&&restart.mode==='brush',restart);

 const mobile=await pageFor(true);await start(mobile);const cdp=await mobile.context().newCDPSession(mobile);
 const touch=(type,points=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map((p,i)=>({...p,id:p.id||i+1,radiusX:5,radiusY:5}))});
 await mobile.locator('#pan-toggle').click();await mobile.locator('#brush-tool').click();let p=await point(mobile,270,505);await touch('touchStart',[p]);
 const selectedBrush=await mobile.evaluate(()=>({brushSelected:document.querySelector('#brush-tool').getAttribute('aria-pressed'),panSelected:document.querySelector('#pan-toggle').getAttribute('aria-pressed'),pointer:{...window.__dustlings.state.pointer}}));
 record('choosing-brush-exits-pan-mode',selectedBrush.brushSelected==='true'&&selectedBrush.panSelected==='false'&&selectedBrush.pointer.active,selectedBrush);await touch('touchCancel');
 if(await mobile.locator('#pan-toggle').getAttribute('aria-pressed')==='true')await mobile.locator('#pan-toggle').click();
 p=await point(mobile,270,505);const second=await point(mobile,730,530);await touch('touchStart',[{...p,id:1}]);
 const primary=await mobile.evaluate(()=>({...window.__dustlings.state.pointer}));await touch('touchStart',[{...p,id:1},{...second,id:2}]);await touch('touchMove',[{...p,id:1},{x:second.x-12,y:second.y+10,id:2}]);
 const multi=await mobile.evaluate(()=>({...window.__dustlings.state.pointer}));
 record('second-finger-does-not-steal-active-brush',Math.hypot(multi.x-primary.x,multi.y-primary.y)<1,{primary,afterSecondFingerMove:multi});await touch('touchCancel');
 await mobile.locator('#mobile-journal').click();
 const grow=await mobile.evaluate(()=>({expanded:document.querySelector('#mobile-journal').getAttribute('aria-expanded'),controls:document.querySelector('#mobile-journal').getAttribute('aria-controls'),journalOpen:document.querySelector('#journal').classList.contains('open'),focused:document.activeElement?.id}));
 record('grow-button-exposes-drawer-state',grow.expanded==='true'&&grow.controls==='journal',grow);await mobile.locator('#close-journal').click();

 // Test the exact visibility handler branch after the real completion modal opens.
 // This changes document.hidden through a test override, not an OS/app background switch.
 await desktop.evaluate(()=>{const s=window.__dustlings.state;s.completed=true;s.restoration=1;s.cleaned=s.totalDust;s.dust.forEach(d=>d.amount=0);s.celebration=0;});await desktop.waitForTimeout(100);
 const completionAX=(await ax.send('Accessibility.getFullAXTree')).nodes.filter(n=>n.role?.value==='dialog').map(n=>({role:n.role.value,name:n.name?.value||''}));
 record('completion-dialog-has-accessible-name',completionAX.length>0&&completionAX.every(n=>n.name.trim()),{nodes:completionAX});
 const hidden=await desktop.evaluate(async()=>{const before=window.__dustlings.audio.getDiagnostics();Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));await new Promise(r=>setTimeout(r,150));const after=window.__dustlings.audio.getDiagnostics();delete document.hidden;return {before,after,completionOpen:document.querySelector('#completion').open,visibility:'Synthetic document.hidden + visibilitychange'};});
 record('backgrounding-completion-pauses-audio',hidden.after.paused&&hidden.after.contextState==='suspended',hidden);

 const recovery=await pageFor(false,`localStorage.setItem('dustlings.courtyard.v1','{bad');localStorage.setItem('dustlings.courtyard.v1.backup',${JSON.stringify(JSON.stringify(restored))});`);
 const recovered=await recovery.evaluate(()=>({cleaned:window.__dustlings.state.cleaned,restoration:window.__dustlings.state.restoration,note:document.querySelector('#recovery-note').textContent,visible:!document.querySelector('#recovery-note').hidden}));
 record('corrupt-primary-recovers-backup-with-explanation',recovered.cleaned===400&&recovered.restoration===.4&&recovered.visible&&recovered.note.includes('backup'),recovered);
 const unavailable=await pageFor(false,()=>Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Storage disabled','SecurityError');}}));
 const unavailableNotice=await unavailable.locator('#recovery-note').textContent();await start(unavailable);await unavailable.locator('#pause-button').click();const downloadPromise=unavailable.waitForEvent('download');await unavailable.locator('#export-save').click();const download=await downloadPromise;const exported=JSON.parse(await readFile(await download.path(),'utf8'));
 record('storage-unavailable-still-plays-and-exports-recovery',unavailableNotice.includes('unavailable')&&exported.version===1&&Array.isArray(exported.dust),{notice:unavailableNotice,exportVersion:exported.version,dustEntries:exported.dust.length,filename:download.suggestedFilename()});

 // Real browser key events choose every action. Only elapsed simulation is
 // advanced by QA; these seconds are not human task timings or playtest results.
 const route=await pageFor();await start(route);await route.locator('#world').focus();await route.keyboard.press('n');
 const aimBefore=await route.evaluate(()=>({...window.__dustlings.state.pointer}));await route.keyboard.down('ArrowRight');await route.waitForTimeout(100);await route.keyboard.up('ArrowRight');
 const aimAfter=await route.evaluate(()=>{const q=window.__dustlings,p=q.renderer.worldToScreen(q.state.pointer.x,q.state.pointer.y);return {pointer:{...q.state.pointer},screen:p,width:q.renderer.width,height:q.renderer.height};});
 record('browser-keyboard-arrows-move-visible-cursor',aimAfter.pointer.x>aimBefore.x&&aimAfter.pointer.inside&&aimAfter.screen.x>0&&aimAfter.screen.x<aimAfter.width&&aimAfter.screen.y>0&&aimAfter.screen.y<aimAfter.height,{before:aimBefore,after:aimAfter});
 await route.keyboard.press('n');await route.keyboard.press('Space');
 let segments=0;
 while(segments<16&&await route.evaluate(()=>window.__dustlings.state.motes<32)){
  await route.evaluate(()=>window.__dustlings.advance(5));segments++;await route.keyboard.press('n');
 }
 const growth=await route.evaluate(()=>({helpers:window.__dustlings.state.creatures.length,motes:window.__dustlings.state.motes,firstHelperAt:window.__dustlings.state.firstHelperAt,elapsed:window.__dustlings.state.elapsed,brushed:window.__dustlings.state.stats.brushed}));
 record('browser-keyboard-route-earns-helper-and-upgrade-choice',growth.helpers>0&&growth.motes>=32,{...growth,explicitlyAdvancedSeconds:segments*5,note:'Real N/Space key input, accelerated simulation; not human pacing evidence.'});
 await route.keyboard.press('Space');
 const stopped=await route.evaluate(()=>{const q=window.__dustlings,before=q.state.stats.brushed;q.advance(1);return {before,after:q.state.stats.brushed,active:q.state.pointer.active};});
 record('browser-keyboard-space-halts-brushing',stopped.before===stopped.after&&!stopped.active,stopped);
 await route.keyboard.press('d');await route.keyboard.press('n');const target=await route.evaluate(()=>({...window.__dustlings.state.pointer}));await route.keyboard.press('Enter');
 const directed=await route.evaluate(()=>({assignment:window.__dustlings.state.assignment,mode:window.__dustlings.state.mode}));
 record('browser-keyboard-d-enter-directs-crew',directed.mode==='direct'&&Math.hypot((directed.assignment?.x??0)-target.x,(directed.assignment?.y??0)-target.y)<.01,{target,...directed});
 const tabRoute=[];
 for(let i=0;i<20;i++){await route.keyboard.press('Tab');const id=await route.evaluate(()=>document.activeElement?.id);tabRoute.push(id);if(id==='mobile-journal'){await route.keyboard.press('Enter');tabRoute.push('opened-discoveries');}if(id==='upgrade-brush')break;}
 const reached=await route.evaluate(()=>document.activeElement?.id==='upgrade-brush');
 if(reached)await route.keyboard.press('Enter');
 const upgraded=await route.evaluate(()=>({upgrades:window.__dustlings.state.upgrades,firstUpgradeAt:window.__dustlings.state.firstUpgradeAt}));
 record('browser-keyboard-tab-enter-buys-upgrade',reached&&upgraded.upgrades.brush,{tabRoute,...upgraded});
 await route.evaluate(async()=>{await window.__dustlings.save();});
}catch(error){report.errors.push(error.stack);}
finally{report.summary={passed:report.checks.filter(c=>c.pass).length,issues:report.checks.filter(c=>!c.pass).length,errors:report.errors.length};await mkdir('evidence',{recursive:true});await writeFile('evidence/accessibility-audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({summary:report.summary,issues:report.checks.filter(c=>!c.pass),errors:report.errors},null,2));await browser.close();if(report.summary.issues||report.summary.errors)process.exitCode=1;}
