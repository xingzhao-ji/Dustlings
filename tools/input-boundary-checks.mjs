import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';

const browser=await chromium.launch({headless:true,executablePath:process.env.DUSTLINGS_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const results=[];
const snapshot=page=>page.evaluate(()=>{const q=window.__dustlings,s=q.state;return {brushed:s.stats.brushed,assignments:s.stats.assignments,pointer:{...s.pointer},elapsed:s.elapsed,camera:{...q.renderer.camera},viewport:{...q.renderer.viewport},mode:q.renderer.viewportMode}});
const open=async()=>{const p=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1});await p.goto('http://localhost:4173/?qa=1');await p.getByRole('button',{name:'Bring it to life'}).click();return p;};
const point=(page,x,y)=>page.evaluate(({x,y})=>{const q=window.__dustlings,p=q.renderer.worldToScreen(x,y),b=document.querySelector('#world').getBoundingClientRect();return {x:b.x+p.x,y:b.y+p.y}},{x,y});
const excluded=page=>page.evaluate(()=>{const b=document.querySelector('#world').getBoundingClientRect();return {x:b.x+293,y:b.y+206}});
try{
  for(const mode of ['brush','direct']){
    const p=await open();await p.evaluate(mode=>{const q=window.__dustlings,s=q.state;q.setZoom(2);q.renderer.setCamera(2,740,500);if(mode==='direct')s.creatures=[{id:0,x:300,y:500,tx:300,ty:500,born:-5,phase:0,work:0,dir:0,target:null}];q.advance(0)},mode);
    if(mode==='direct')await p.locator('#direct-tool').click();const target=await excluded(p),before=await snapshot(p);
    const hit=await p.evaluate(({x,y})=>{const e=document.elementFromPoint(x,y),b=document.querySelector('#world').getBoundingClientRect(),r=window.__dustlings.renderer;return {element:e.id,world:r.screenToWorld(x-b.x,y-b.y),inside:r.containsScreenPoint(x-b.x,y-b.y)}},target);
    await p.mouse.move(target.x,target.y);await p.mouse.down();await p.waitForTimeout(350);await p.mouse.up();const after=await snapshot(p);
    results.push({test:`excluded_${mode}_input`,hit,before,after,pass:after.brushed===before.brushed&&after.assignments===before.assignments});await p.close();
  }
  {
    const p=await open(),inside=await point(p,270,505),outside=await excluded(p);await p.mouse.move(inside.x,inside.y);await p.mouse.down();await p.waitForTimeout(250);await p.mouse.move(outside.x,outside.y,{steps:5});const before=await snapshot(p);await p.waitForTimeout(450);const after=await snapshot(p);await p.mouse.up();results.push({test:'brush_drag_outside_stops',before,after,pass:!after.pointer.active&&!after.pointer.inside&&after.brushed===before.brushed});await p.close();
  }
  {
    const p=await open();await p.evaluate(()=>{const q=window.__dustlings;q.state.creatures=[{id:0,x:300,y:500,tx:300,ty:500,born:-5,phase:0,work:0,dir:0,target:null}];q.advance(0)});await p.locator('#direct-tool').click();const inside=await point(p,600,500),outside=await excluded(p),before=await snapshot(p);await p.mouse.move(inside.x,inside.y);await p.mouse.down();await p.mouse.move(outside.x,outside.y,{steps:5});await p.mouse.up();const after=await snapshot(p);results.push({test:'direct_release_outside_ignored',before,after,pass:after.assignments===before.assignments});await p.close();
  }
  for(const [name,width,height] of [['orientation',390,844],['same_mode_resize',900,450]]){
    const p=await open(),inside=await point(p,270,505);await p.mouse.move(inside.x,inside.y);await p.mouse.down();await p.waitForTimeout(250);await p.setViewportSize({width,height});await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const before=await snapshot(p);await p.waitForTimeout(450);const after=await snapshot(p);await p.screenshot({path:`evidence/input-boundary-${name}.png`});await p.mouse.up();results.push({test:`${name}_while_holding_brush`,before,after,pass:!after.pointer.active&&after.brushed===before.brushed});await p.close();
  }
  await fs.writeFile('evidence/input-boundary-checks.json',JSON.stringify({browser:await browser.version(),input:'Actual Playwright mouse pointer down/drag/up; no tap-to-sweep testing',results},null,2));
  console.log(JSON.stringify(results.map(({test,pass,before,after})=>({test,pass,brushedDuringObservation:after.brushed-before.brushed,assignmentsDuringObservation:after.assignments-before.assignments,pointerActive:after.pointer.active,pointerInside:after.pointer.inside})),null,2));
  if(results.some(result=>!result.pass))process.exitCode=1;
}finally{await browser.close();console.log('Browser closed; no camera-agent browser workload remains.');}
