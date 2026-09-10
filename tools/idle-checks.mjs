import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});
const result={recordedAt:new Date().toISOString(),browser:await browser.version(),conditions:'Headless Chrome on host MacBook, 1440×900 DPR2. Instrumented rendering and state checks, not measured energy or human responsiveness.',checks:[],errors:[]};
const check=(name,pass,data)=>result.checks.push({name,pass,data});
page.on('pageerror',e=>result.errors.push(e.message));
try{
 await page.goto('http://localhost:4173/?qa=1');await page.waitForTimeout(1200);
 const prepared=await page.evaluate(()=>{const a=window.__dustlings.audio;return{contextState:a.context?.state,ready:a.ready,voices:a.voices.length,sources:a.continuous.length};});
 check('Welcome audio is suspended with no graph or sources',prepared.contextState==='suspended'&&!prepared.ready&&prepared.voices===0&&prepared.sources===0,prepared);
 await page.locator('#start-button').click();await page.waitForTimeout(300);
 await page.evaluate(()=>{window.__renders=0;const r=window.__dustlings.renderer,original=r.render.bind(r);r.render=(...args)=>{window.__renders++;return original(...args);};});
 await page.waitForTimeout(300);check('Active scene still animates',await page.evaluate(()=>window.__renders>5));
 await page.locator('#pause-button').click();await page.waitForTimeout(250);
 const paused=await page.evaluate(()=>{window.__renders=0;return window.__dustlings.state.elapsed;});
 await page.waitForTimeout(1000);
 check('Stationary pause performs zero canvas redraws and no simulation',await page.evaluate(elapsed=>window.__renders===0&&window.__dustlings.state.elapsed===elapsed,paused),await page.evaluate(()=>({renders:window.__renders,elapsed:window.__dustlings.state.elapsed})));
 await page.setViewportSize({width:1280,height:800});await page.waitForTimeout(250);
 check('Resize redraws paused scene at current dimensions',await page.evaluate(()=>window.__renders>0&&window.__dustlings.renderer.canvas.width===Math.round(document.querySelector('#world').clientWidth*2)));
 await page.evaluate(()=>window.__renders=0);await page.locator('#low-quality').check();await page.waitForTimeout(250);
 check('Quality change redraws paused scene at reduced resolution',await page.evaluate(()=>window.__renders>0&&window.__dustlings.renderer.canvas.width===Math.round(document.querySelector('#world').clientWidth)));
 await page.evaluate(()=>window.__renders=0);await page.waitForTimeout(500);check('Updated pause returns to zero redraws',await page.evaluate(()=>window.__renders===0));
 await page.locator('#resume-button').click();await page.waitForTimeout(300);
 check('Resume restores simulation, rendering, and sound',await page.evaluate(elapsed=>window.__renders>5&&window.__dustlings.state.elapsed>elapsed&&window.__dustlings.audio.context.state==='running',paused));
 check('No browser errors',result.errors.length===0);
} catch(e){result.errors.push(e.stack);}finally{
 result.summary={passed:result.checks.filter(c=>c.pass).length,failed:result.checks.filter(c=>!c.pass).length,errors:result.errors.length};
 await writeFile('evidence/idle-checks.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close();if(result.summary.failed||result.summary.errors)process.exitCode=1;
}
