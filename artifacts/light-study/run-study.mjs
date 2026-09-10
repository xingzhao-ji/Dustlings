// Isolated rendering comparison. All injected states are explicitly QA fixtures.
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { resolve, extname, join } from 'node:path';
import { createHash } from 'node:crypto';
const root=process.cwd(), out=resolve('artifacts/light-study'), sandbox='/tmp/dustlings-light-study';
await mkdir(join(out,'recordings'),{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const fixtures={busy:JSON.parse(await readFile('evidence/busy-test-save.json','utf8')),restored:JSON.parse(await readFile('evidence/completed-test-save.json','utf8'))};
fixtures.busy.ritual=false;fixtures.busy.ritualTime=0;fixtures.busy.restoration=0;
for(const [name,data]of Object.entries(fixtures))await writeFile(join(out,`${name}-fixture.json`),JSON.stringify(data,null,2));
const server=createServer(async(req,res)=>{try{const p=resolve(sandbox,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(sandbox+'/'))throw Error('Outside isolated study');const bytes=await readFile(p);res.setHeader('Content-Type',extname(p)==='.js'?'text/javascript':extname(p)==='.css'?'text/css':'text/html');res.end(bytes);}catch{res.statusCode=404;res.end('Not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const result={date:new Date().toISOString(),kind:'Isolated agent rendering experiment; controlled fixtures, no human aesthetic feedback',conditions:{viewport:'1280×796 CSS px',dpr:1,headless:true,browser:await browser.version(),sampleSeconds:8,host:'MacBook Pro Mac16,7 / M4 Pro /48GB /macOS26.6.2',concurrency:'Root UI work and other processes may run concurrently; not controlled',audio:'Original audio active; no listening claim; Playwright full-UI videos contain no audio'},hashes:{},runs:[]};
for(const file of ['index.html','style.css','src/main.js','src/game.js','src/renderer.js'])result.hashes[file]=hash(await readFile(join(sandbox,'baseline',file)));
result.hashes.variantRenderer=hash(await readFile(join(sandbox,'variant/src/renderer.js')));
try{
for(const scenario of (process.env.STUDY_SCENARIOS||'busy,restored').split(','))for(const variant of (process.env.STUDY_VARIANTS||'baseline,variant').split(',')){
  const name=`${variant}-${scenario}`,errors=[];
  const context=await browser.newContext({viewport:{width:1280,height:796},deviceScaleFactor:1,recordVideo:{dir:join(out,'recordings'),size:{width:1280,height:796}}});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/${variant}/index.html?qa=1`);
  await page.locator('#start-button').click();
  await page.evaluate(fixture=>{const q=window.__dustlings;q.pause(true);q.load(fixture);q.state.pointer.inside=false;q.renderer.render(q.state,q.state.elapsed);},fixtures[scenario]);
  await page.screenshot({path:join(out,`${name}.png`)});
  const geometry=await page.evaluate(()=>{const q=window.__dustlings;return{scale:q.renderer.scale,viewport:q.renderer.viewport,canvas:{w:document.getElementById('world').clientWidth,h:document.getElementById('world').clientHeight},dust:q.state.dust.length,creatures:q.state.creatures.length,stateElapsed:q.state.elapsed};});
  await page.evaluate(()=>{const q=window.__dustlings;window.studyRenderTimes=[];const render=q.renderer.render.bind(q.renderer);q.renderer.render=(...args)=>{const start=performance.now();render(...args);window.studyRenderTimes.push(performance.now()-start);};q.pause(false);q.resetPerformance();});
  await page.waitForTimeout(8000);
  const stats=await page.evaluate(()=>{const sorted=window.studyRenderTimes.toSorted((a,b)=>a-b);return{frames:window.__dustlings.getPerformance(),renderCallCpuMs:{samples:sorted.length,mean:sorted.reduce((s,n)=>s+n,0)/sorted.length,p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1)}};});
  result.runs.push({variant,scenario,rendererSha256:hash(await readFile(join(sandbox,variant,'src/renderer.js'))),errors,geometry,...stats});
  const video=page.video();await context.close();await rename(await video.path(),join(out,'recordings',`${name}.webm`));
  console.log(`${name}: ${stats.frames.samples} intervals, ${stats.renderCallCpuMs.mean.toFixed(3)}ms mean renderer JS call, ${errors.length} errors`);
}
}finally{await writeFile(join(out,process.env.STUDY_RESULT||'results.json'),JSON.stringify(result,null,2));await browser.close();server.close();}
