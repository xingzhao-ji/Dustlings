import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const evidence = {timestamp:new Date().toISOString(), kind:'Automated browser interaction checks; touch and layouts are emulated, not physical-device or human playtests', conditions:'Headless installed Google Chrome, DPR 1, fresh isolated browser contexts. May overlap the main gameplay capture/performance run; this suite reports interaction correctness, not FPS or human task timings.', browser:await browser.version(), checks:[], errors:[]};
const result=(name,pass,details={})=>evidence.checks.push({name,pass,...details});
const url=process.env.DUSTLINGS_URL||'http://127.0.0.1:4173/?qa=1';
const contexts=[];
async function setup(viewport,touch){
 const context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch,deviceScaleFactor:1});contexts.push(context);
 const page=await context.newPage();page.on('pageerror',error=>evidence.errors.push({type:'pageerror',message:error.message,viewport}));page.on('console',message=>{if(message.type()==='error')evidence.errors.push({type:'console',message:message.text(),viewport});});
 await page.goto(url);await page.waitForFunction(()=>!!window.__dustlings);await page.locator('#start-button').click();await page.waitForTimeout(150);return page;
}
async function screenPoint(page,x,y,touch=false){return page.evaluate(({x,y,touch})=>{const q=window.__dustlings,p=q.renderer.worldToScreen(x,y),r=document.querySelector('#world').getBoundingClientRect();return {x:p.x+r.left,y:p.y+r.top+(touch?42:0)};},{x,y,touch});}
async function overflow(page,label){const dimensions=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,height:innerHeight}));result(label,dimensions.document<=dimensions.viewport&&dimensions.body<=dimensions.viewport,dimensions);}
try{
 const page=await setup({width:390,height:844},true);const cdp=await page.context().newCDPSession(page);
 const touch=async(type,p)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:p?[{x:p.x,y:p.y,id:1,radiusX:6,radiusY:6}]:[]});
 await overflow(page,'390×844 gameplay has no horizontal overflow');
 let p=await screenPoint(page,270,505,true);await touch('touchStart',p);
 const brush=await page.evaluate(p=>{const q=window.__dustlings,r=document.querySelector('#world').getBoundingClientRect(),s=q.renderer.worldToScreen(q.state.pointer.x,q.state.pointer.y);return {pointer:{...q.state.pointer},screenOffsetY:p.y-(s.y+r.top),screenOffsetX:p.x-(s.x+r.left)};},p);
 result('Touch brush target is 42 CSS px above finger',brush.pointer.active&&brush.pointer.touch&&Math.abs(brush.screenOffsetY-42)<.01&&Math.abs(brush.screenOffsetX)<.01,brush);
 await page.evaluate(()=>window.__dustlings.advance(2));await touch('touchCancel');
 const canceled=await page.evaluate(()=>{const q=window.__dustlings,before=q.state.stats.brushed,active=q.state.pointer.active;q.advance(2);return {active,before,after:q.state.stats.brushed};});
 result('Pointer cancellation stops manual cleaning',!canceled.active&&canceled.before===canceled.after,canceled);
 // Fixture grants two helpers through the real restore validator; this is setup,
 // not evidence for human opening pacing.
 await page.evaluate(()=>{const q=window.__dustlings,s=q.serialise();s.dust=s.dust.map((n,i)=>i<14?0:n);q.load(s);});
 await page.locator('#direct-tool').click();p=await screenPoint(page,690,510,true);await touch('touchStart',p);
 const preview=await page.evaluate(()=>{const q=window.__dustlings,s=q.state,r=q.renderer,inside=s.pointer.inside;r.render(s,s.elapsed);const shown=r.canvas.toDataURL();s.pointer.inside=false;r.render(s,s.elapsed);const hidden=r.canvas.toDataURL();s.pointer.inside=inside;r.render(s,s.elapsed);return {pointer:{...s.pointer},mode:s.mode,renderChangesWithPreview:shown!==hidden,assignmentBeforeRelease:s.assignment};});
 result('Touch direct destination preview is visible before release',preview.renderChangesWithPreview&&preview.mode==='direct',preview);
 await touch('touchEnd');
 const direct=await page.evaluate(()=>({assignment:window.__dustlings.state.assignment,pointer:{...window.__dustlings.state.pointer}}));
 result('Touch release directs crew to the offset destination',Math.hypot((direct.assignment?.x??0)-690,(direct.assignment?.y??0)-510)<.1,direct);
 p=await screenPoint(page,500,370,true);await touch('touchStart',p);await touch('touchEnd');
 const blocked=await page.evaluate(()=>({assignment:window.__dustlings.state.assignment,notice:window.__dustlings.state.notice}));
 result('Blocked touch destination preserves assignment and explains rejection',JSON.stringify(blocked.assignment)===JSON.stringify(direct.assignment)&&blocked.notice.includes('blocked'),blocked);
 await page.locator('#mobile-journal').click();
 result('Mobile Grow drawer opens',await page.locator('#journal').isVisible());
 await page.locator('#close-journal').click();result('Mobile Grow drawer closes',!(await page.locator('#journal').isVisible()));
 await page.locator('#pause-button').click();await overflow(page,'390×844 settings has no horizontal overflow');
 const beforePause=await page.evaluate(()=>window.__dustlings.state.elapsed);await page.waitForTimeout(400);const afterPause=await page.evaluate(()=>window.__dustlings.state.elapsed);
 result('Settings pause preserves elapsed time',beforePause===afterPause,{beforePause,afterPause});
 const focus=[];for(let i=0;i<18;i++){await page.keyboard.press('Tab');focus.push(await page.evaluate(()=>({id:document.activeElement?.id,tag:document.activeElement?.tagName,documentFocused:document.hasFocus(),inside:document.querySelector('#settings').contains(document.activeElement)})));}
 result('Native settings dialog prevents keyboard focus on background controls',focus.every(f=>f.inside||f.tag==='BODY'),{focus,note:'Native Chrome dialog traversal may include a browser-chrome step represented by BODY. This is recorded separately from focus on background app controls.'});
 await page.locator('#music-volume').fill('23');await page.locator('#tap-sweep').check();await page.locator('#reduced-motion').check();await page.locator('#resume-button').click();
 result('Closing settings returns focus to game',await page.evaluate(()=>document.activeElement?.id==='world'));
 const saved=await page.evaluate(async()=>{const q=window.__dustlings;q.pause(true);await q.save();return {save:q.serialise(),settings:JSON.parse(localStorage.getItem('dustlings.settings'))};});
 await page.reload();await page.waitForFunction(()=>!!window.__dustlings);
 const restored=await page.evaluate(()=>({save:window.__dustlings.serialise(),settings:JSON.parse(localStorage.getItem('dustlings.settings')),music:document.querySelector('#music-volume').value,tap:document.querySelector('#tap-sweep').checked,motion:document.querySelector('#reduced-motion').checked}));
 result('Reload restores progress and crew assignment',JSON.stringify(saved.save.dust)===JSON.stringify(restored.save.dust)&&saved.save.elapsed===restored.save.elapsed&&JSON.stringify(saved.save.assignment)===JSON.stringify(restored.save.assignment),{before:{elapsed:saved.save.elapsed,creatures:saved.save.creatures.length,assignment:saved.save.assignment},after:{elapsed:restored.save.elapsed,creatures:restored.save.creatures.length,assignment:restored.save.assignment}});
 result('Settings persist through reload',restored.music==='23'&&restored.tap&&restored.motion,{settings:restored.settings,controls:{music:restored.music,tap:restored.tap,motion:restored.motion}});
 await page.locator('#start-button').click();await page.locator('#brush-tool').click();p=await screenPoint(page,650,560,true);await touch('touchStart',p);await touch('touchCancel');
 result('Pointer cancellation stops tap-sweep assistance',await page.evaluate(()=>{const q=window.__dustlings,before=q.state.stats.brushed;q.advance(1.5);return !q.state.pointer.active&&q.state.stats.brushed===before;}));
 await page.locator('#zoom-in').click();await page.locator('#zoom-in').click();
 const mapping=await page.evaluate(()=>{const r=window.__dustlings.renderer;return {camera:r.camera,points:[[270,505],[690,510],[500,370]].map(([x,y])=>{const p=r.worldToScreen(x,y),w=r.screenToWorld(p.x,p.y);return {x,y,error:Math.hypot(w.x-x,w.y-y)};})};});
 result('Zoom preserves round-trip world mapping',mapping.camera.zoom>1&&mapping.points.every(p=>p.error<1e-8),mapping);
 const panBefore=await page.evaluate(()=>({...window.__dustlings.renderer.camera}));await page.locator('#pan-toggle').click();p=await screenPoint(page,500,420,true);await touch('touchStart',p);await touch('touchMove',{x:p.x+30,y:p.y+12});await touch('touchEnd');
 const panAfter=await page.evaluate(()=>({...window.__dustlings.renderer.camera}));
 result('Touch pan moves camera without activating brush',panBefore.centerX!==panAfter.centerX&&await page.evaluate(()=>!window.__dustlings.state.pointer.active),{panBefore,panAfter});
 await page.locator('#pan-toggle').click();await page.locator('#direct-tool').click();p=await screenPoint(page,570,530,true);await touch('touchStart',p);await touch('touchEnd');
 const panAssignment=await page.evaluate(()=>window.__dustlings.state.assignment);
 result('Touch destination mapping remains accurate after zoom and pan',Math.hypot((panAssignment?.x??0)-570,(panAssignment?.y??0)-530)<.1,{assignment:panAssignment});

 const landscape=await setup({width:844,height:390},true);await overflow(landscape,'844×390 gameplay has no horizontal overflow');await landscape.locator('#mobile-journal').click();
 const drawer=await landscape.locator('#journal').boundingBox();result('Landscape drawer fits viewport',!!drawer&&drawer.y>=0&&drawer.y+drawer.height<=390,{drawer});await landscape.locator('#close-journal').click();await landscape.locator('#pause-button').click();await overflow(landscape,'844×390 settings has no horizontal overflow');
 const modal=await landscape.locator('#settings').boundingBox();await landscape.locator('#resume-button').scrollIntoViewIfNeeded();result('Landscape settings stays bounded and resume is reachable',!!modal&&modal.y>=0&&modal.height<=390&&await landscape.locator('#resume-button').isVisible(),{modal});await landscape.locator('#resume-button').click();

 const desktop=await setup({width:1440,height:900},false);await desktop.locator('#zoom-in').click();const desktopPoint=await screenPoint(desktop,270,505);await desktop.mouse.move(desktopPoint.x,desktopPoint.y);await desktop.mouse.down();
 const mouseMapping=await desktop.evaluate(()=>({...window.__dustlings.state.pointer}));result('Mouse brushing maps canvas-relative coordinates at zoom',mouseMapping.active&&Math.hypot(mouseMapping.x-270,mouseMapping.y-505)<.1,mouseMapping);await desktop.mouse.up();
 await desktop.keyboard.press('Escape');result('Escape opens pause settings',await desktop.locator('#settings').isVisible());await desktop.keyboard.press('Escape');result('Escape closes settings and resumes focus',!(await desktop.locator('#settings').isVisible())&&await desktop.evaluate(()=>document.activeElement?.id==='world'));
 result('No browser console errors or uncaught exceptions',evidence.errors.length===0,{count:evidence.errors.length});
}catch(error){evidence.errors.push({type:'test-runner',message:error.stack});}
finally{
 evidence.summary={passed:evidence.checks.filter(c=>c.pass).length,failed:evidence.checks.filter(c=>!c.pass).length,errors:evidence.errors.length};
 await mkdir('evidence',{recursive:true});await writeFile('evidence/browser-checks.json',JSON.stringify(evidence,null,2)+'\n');
 console.log(JSON.stringify({summary:evidence.summary,failed:evidence.checks.filter(c=>!c.pass),errors:evidence.errors},null,2));await browser.close();
 if(evidence.summary.failed||evidence.summary.errors)process.exitCode=1;
}
