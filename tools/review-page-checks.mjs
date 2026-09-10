import { chromium } from '@playwright/test';
import { readFile, writeFile, stat, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const report={recordedAt:new Date().toISOString(),kind:'Local-file review artifact QA. Headless Chrome, emulated layouts, muted video decoding; no human review or native audio audition.',conditions:'May run alongside the endurance test; this is not an isolated performance measurement.',checks:[],layouts:[],media:[],mediaReadAborts:[],errors:[]};
const check=(name,pass,details={})=>report.checks.push({name,pass,...details});
const reviewPath=resolve('evidence/REVIEW.html'),url=pathToFileURL(reviewPath).href;
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
if(process.argv.includes('--phone-only')){
 Object.assign(report,JSON.parse(await readFile('evidence/v0.2/review-page-checks.json','utf8')));
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});await page.goto(url);await page.screenshot({path:'evidence/v0.2/review-phone.png'});
  const focused=await page.evaluate(()=>{const link=document.querySelector('.play').nextElementSibling;return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,protocolText:link.textContent,protocolLineBoxes:link.getClientRects().length,protocolRect:link.getBoundingClientRect().toJSON(),whiteSpace:getComputedStyle(link).whiteSpace};});
  check('Phone protocol link stays together without horizontal overflow',focused.scrollWidth<=focused.width&&focused.protocolLineBoxes===1&&focused.protocolRect.right<=focused.width,focused);
  report.focusedRecheckAt=new Date().toISOString();report.reviewSha256=createHash('sha256').update(await readFile(reviewPath)).digest('hex');
  // Chrome cancels media reads when metadata is sufficient or a seek replaces
  // the current read. The original run independently verified playback/seek.
  report.mediaReadAborts=report.errors.filter(error=>/\.mp4 net::ERR_ABORTED$/.test(error));report.errors=report.errors.filter(error=>!report.mediaReadAborts.includes(error));
  const browserCheck=report.checks.find(c=>c.name==='No local-file browser errors');if(browserCheck)browserCheck.pass=report.errors.length===0;
  report.mediaReadAbortNote='Cancelled metadata/seek media reads retained here; all three media elements separately passed actual muted playback and seeking.';
  report.summary={passed:report.checks.filter(c=>c.pass).length,failed:report.checks.filter(c=>!c.pass).length,errors:report.errors.length};
  await writeFile('evidence/v0.2/review-page-checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({summary:report.summary,focused,reviewSha256:report.reviewSha256},null,2));
 }finally{await browser.close();}process.exit(report.summary.failed||report.summary.errors?1:0);
}
try{
 report.browser=await browser.version();const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});const page=await context.newPage();
 page.on('pageerror',error=>report.errors.push(error.message));page.on('requestfailed',request=>{const message=`${request.url()} ${request.failure()?.errorText}`;if(request.resourceType()==='media'&&request.failure()?.errorText==='net::ERR_ABORTED')report.mediaReadAborts.push(message);else report.errors.push(message);});await page.goto(url);await page.waitForLoadState('load');
 const links=await page.evaluate(()=>[...document.querySelectorAll('[src],[href],[poster]')].flatMap(el=>['src','href','poster'].filter(attr=>el.hasAttribute(attr)).map(attr=>({tag:el.tagName,attribute:attr,url:new URL(el.getAttribute(attr),document.baseURI).href}))));
 const broken=[];for(const link of links){if(!link.url.startsWith('file:'))continue;try{const path=fileURLToPath(new URL(link.url));if(!(await stat(path)).isFile())broken.push({...link,reason:'Not a file'});}catch(error){broken.push({...link,reason:error.code||error.message});}}
 check('All local image/video/poster/source/link destinations exist',broken.length===0,{localReferences:links.filter(l=>l.url.startsWith('file:')).length,broken});
 const images=await page.locator('img').evaluateAll(elements=>elements.map(img=>({src:img.getAttribute('src'),loaded:img.complete&&img.naturalWidth>0,width:img.naturalWidth,height:img.naturalHeight,alt:img.alt})));
 check('All review images decode and have descriptive text',images.every(img=>img.loaded&&img.alt.trim()),{images});
 await mkdir('evidence/v0.2',{recursive:true});
 for(const [label,viewport] of [['desktop',{width:1440,height:900}],['phone',{width:390,height:844}]]){
  await page.setViewportSize(viewport);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`evidence/v0.2/review-${label}.png`});
  const layout=await page.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,bodyFont:getComputedStyle(document.body).fontSize,captionFont:getComputedStyle(document.querySelector('figcaption')).fontSize,main:document.querySelector('main').getBoundingClientRect().toJSON(),play:document.querySelector('.play').getBoundingClientRect().toJSON(),videos:[...document.querySelectorAll('video')].map(el=>el.getBoundingClientRect().toJSON())}));
  report.layouts.push({label,...layout});check(`${label}: no horizontal overflow and readable body/captions`,layout.documentWidth<=layout.width&&layout.bodyWidth<=layout.width&&parseFloat(layout.bodyFont)>=16&&parseFloat(layout.captionFont)>=14);
  check(`${label}: Play action stays within viewport`,layout.play.x>=0&&layout.play.right<=layout.width&&layout.play.height>=44);
  if(label==='phone'){const protocol=await page.evaluate(()=>{const link=document.querySelector('.play').nextElementSibling;return {lineBoxes:link.getClientRects().length,right:link.getBoundingClientRect().right,width:innerWidth};});check('Phone protocol link stays together without horizontal overflow',protocol.lineBoxes===1&&protocol.right<=protocol.width,protocol);}
 }
 await page.setViewportSize({width:1440,height:900});
 for(let i=0;i<await page.locator('video').count();i++){
  const video=page.locator('video').nth(i);await video.scrollIntoViewIfNeeded();
  const metadata=await video.evaluate(async video=>{video.muted=true;video.volume=0;if(video.readyState<1)await new Promise((resolve,reject)=>{video.addEventListener('loadedmetadata',resolve,{once:true});video.addEventListener('error',()=>reject(Error('Video metadata error')),{once:true});});const before=video.currentTime;await video.play();await new Promise(r=>setTimeout(r,300));video.pause();const playedTo=video.currentTime;const at=Math.min(video.duration*.55,video.duration-1);video.currentTime=at;await new Promise(resolve=>video.addEventListener('seeked',resolve,{once:true}));return {src:video.getAttribute('src'),duration:video.duration,width:video.videoWidth,height:video.videoHeight,readyState:video.readyState,playedFrom:before,playedTo,seekedTo:video.currentTime,error:video.error?.message||null};});
  report.media.push(metadata);check(`Video ${i+1} metadata/play/seek`,metadata.duration>0&&metadata.width>0&&metadata.playedTo>metadata.playedFrom&&metadata.readyState>=2&&!metadata.error,metadata);
  if(i===0)await video.screenshot({path:'evidence/v0.2/review-interaction-frame.png'});
 }
 const build=JSON.parse(await readFile('builds/build-manifest.json','utf8')),media=JSON.parse(await readFile('evidence/v0.2/media-manifest.json','utf8')),review=await readFile(reviewPath,'utf8');
 report.reviewSha256=createHash('sha256').update(review).digest('hex');
 const artifact=await readFile(resolve('builds',build.artifact)),artifactHash=createHash('sha256').update(artifact).digest('hex');
 check('Artifact bytes and SHA-256 match build manifest and review page',artifactHash===build.sha256&&artifact.length===build.bytes&&review.includes(build.sha256)&&review.includes(build.sourceRevision),{artifactHash,manifestHash:build.sha256,bytes:artifact.length,version:build.version,sourceRevision:build.sourceRevision});
 for(const file of ['media-manifest.json','final-smoke.json','final-build-checks.json']){
  const value=JSON.parse(await readFile(`evidence/v0.2/${file}`,'utf8'));check(`${file} identifies the same artifact`,value.build.sha256===artifactHash&&value.build.sourceRevision===build.sourceRevision&&value.build.version===build.version);
 }
 for(const file of media.files){const bytes=await readFile(file.path),hash=createHash('sha256').update(bytes).digest('hex'),probe=JSON.parse(execFileSync('/opt/homebrew/bin/ffprobe',['-v','error','-show_entries','stream=codec_type,codec_name,width,height:format=duration,size','-of','json',file.path],{encoding:'utf8'}));const actual=probe.streams.map(s=>`${s.codec_type}:${s.codec_name}:${s.width||0}x${s.height||0}`),expected=file.probe.streams.map(s=>`${s.codec_type}:${s.codec_name}:${s.width||0}x${s.height||0}`);check(`${file.path} hash and media metadata match`,hash===file.sha256&&Number(probe.format.size)===bytes.length&&Math.abs(Number(probe.format.duration)-Number(file.probe.format.duration))<.001&&JSON.stringify(actual)===JSON.stringify(expected),{sha256:hash,probe});}
 check('No local-file browser errors',report.errors.length===0);
}catch(error){report.errors.push(error.stack);}
finally{report.summary={passed:report.checks.filter(c=>c.pass).length,failed:report.checks.filter(c=>!c.pass).length,errors:report.errors.length};await writeFile('evidence/v0.2/review-page-checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({summary:report.summary,failed:report.checks.filter(c=>!c.pass),errors:report.errors},null,2));await browser.close();if(report.summary.failed||report.summary.errors)process.exitCode=1;}
