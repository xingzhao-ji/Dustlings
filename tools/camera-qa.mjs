// Local viewport and projection QA. Constructed crowd states are not playtests.
import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const browser = await chromium.launch({headless:true, executablePath:process.env.DUSTLINGS_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const output = [];
await fs.mkdir('evidence', {recursive:true});
for (const [name,width,height,touch] of [['desktop',1440,900,false],['landscape',844,390,true],['phone',390,844,true]]) {
  const page = await browser.newPage({viewport:{width,height},hasTouch:touch,deviceScaleFactor:1});
  const errors = []; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:4173/?qa=1');
  await page.getByRole('button',{name:'Bring it to life'}).click();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
  await page.screenshot({path:`evidence/camera-after-${name}.png`});
  const geometry = await page.evaluate(()=>{
    const q=window.__dustlings,r=q.renderer,s=q.state,original={...r.camera};
    const initial={mode:r.viewportMode,zoom:r.camera.zoom,recommendedZoom:r.recommendedZoom,viewport:{...r.viewport},scale:r.scale,canvas:{width:r.width,height:r.height}};
    let inverseError=0; const unreachable=[];
    for(const zoom of [1,1.7,2,3]) for(const [centerX,centerY] of [[180,220],[500,390],[820,600]]) {
      r.setCamera(zoom,centerX,centerY);
      for(const d of s.dust) {const p=r.worldToScreen(d.x,d.y),back=r.screenToWorld(p.x,p.y);inverseError=Math.max(inverseError,Math.abs(back.x-d.x),Math.abs(back.y-d.y));}
    }
    for(const zoom of [1,1.7,2]) for(const d of s.dust) {
      r.setCamera(zoom,Math.max(180,Math.min(820,d.x)),Math.max(220,Math.min(600,d.y)));
      const p=r.worldToScreen(d.x,d.y),v=r.viewport;
      if(p.x<v.x+12||p.x>v.x+v.width-12||p.y<v.y+12||p.y>v.y+v.height-12) unreachable.push({id:d.id,zoom});
    }
    r.setCamera(original);r.render(s,s.elapsed);
    const v=r.viewport;
    const controlsExcluded=!r.containsScreenPoint(v.x-1,v.y+v.height/2)&&!r.containsScreenPoint(v.x+v.width/2,v.y-1);
    return {...initial,dustNodes:s.dust.length,inverseError,unreachable,controlsExcluded,estimatedArtBounds:{width:927*r.scale,height:587*r.scale}};
  });
  assert.ok(geometry.inverseError<1e-9,`${name}: inverse transform drift`);
  assert.equal(geometry.unreachable.length,0,`${name}: dust outside allowed pan reach`);
  assert.ok(geometry.controlsExcluded,`${name}: control strip must be outside scene hit region`);
  assert.equal(geometry.zoom,geometry.recommendedZoom,`${name}: root initial zoom must match the responsive recommendation`);
  if(name==='landscape'){assert.ok(geometry.estimatedArtBounds.width>=300);assert.ok(geometry.estimatedArtBounds.height>=190);}
  if(touch){
    geometry.dragPanChecks=[];await page.locator('#pan-toggle').click();
    for(const [label,x,y] of [['top-left',110,155],['top-right',890,155],['bottom-left',110,660],['bottom-right',890,660]]){
      await page.evaluate(()=>{window.__dustlings.setZoom(1);window.__dustlings.setZoom(2)});
      for(let j=0;j<2;j++){
        const b=await page.evaluate(()=>{const r=window.__dustlings.renderer,v=r.viewport,c=document.querySelector('#world').getBoundingClientRect();return {x:c.x+v.x+v.width/2,y:c.y+v.y+v.height/2,dx:Math.min(155,v.width/2-20),dy:Math.min(95,v.height/2-20)}});
        await page.mouse.move(b.x,b.y);await page.mouse.down();await page.mouse.move(b.x+(x===110?b.dx:-b.dx),b.y+(y===155?b.dy:-b.dy),{steps:7});await page.mouse.up();
      }
      const check=await page.evaluate(({label,x,y})=>{const q=window.__dustlings,r=q.renderer,d=q.state.dust.reduce((a,b)=>Math.hypot(b.x-x,b.y-y)<Math.hypot(a.x-x,a.y-y)?b:a),p=r.worldToScreen(d.x,d.y);return {label,camera:{...r.camera},dustNode:d.id,visible:r.containsScreenPoint(p.x,p.y)}},{label,x,y});
      assert.ok(check.visible,`${name}: drag cannot reach ${label}`);geometry.dragPanChecks.push(check);
    }
    await page.locator('#pan-toggle').click();await page.evaluate(zoom=>{window.__dustlings.setZoom(1);window.__dustlings.setZoom(zoom)},geometry.zoom);
  }
  await page.evaluate(()=>{
    const q=window.__dustlings,s=q.state;q.pause(true);s.elapsed=100;s.noticeTime=0;
    s.dust.forEach((d,i)=>d.amount=i<350?0:1);s.cleaned=s.dust.reduce((a,d)=>a+1-d.amount,0);
    s.creatures=Array.from({length:50},(_,i)=>{const x=160+i%10*67,y=475+Math.floor(i/10)*32;return {id:i,x,y,tx:x,ty:y,born:0,phase:i*2.399,work:1,dir:0};});q.advance(0);
    q.renderer.render(s,s.elapsed);
  });
  await page.screenshot({path:`evidence/camera-after-${name}-swarm-fixture.png`});
  if(touch){if(await page.locator('#zoom-out').isEnabled())await page.locator('#zoom-out').click();await page.evaluate(()=>{window.__dustlings.setZoom(1);window.__dustlings.renderer.render(window.__dustlings.state,100)});await page.screenshot({path:`evidence/camera-after-${name}-fit-fixture.png`});}
  output.push({name,viewport:{width,height},touchEmulation:touch,geometry,pageErrors:errors});
  await page.close();
}
await fs.writeFile('evidence/camera-results.json',JSON.stringify({browser:await browser.version(),dpr:1,fixtures:true,results:output},null,2));
await browser.close();
console.log(JSON.stringify(output.map(({name,geometry:g,pageErrors})=>({name,mode:g.mode,zoom:g.zoom,scene:g.estimatedArtBounds,dustNodes:g.dustNodes,inverseError:g.inverseError,unreachable:g.unreachable.length,pageErrors})),null,2));
