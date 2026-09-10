import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const report={recordedAt:new Date().toISOString(),kind:'Focused corrected UI-video artifact check; headless Chrome muted playback, not a human playtest or native audio audition.',conditions:'Nonisolated browser work; no performance conclusion.',scope:'Supersedes only the UI-video/hash and current review-page-hash portions of the historical 18-check report. Layouts and other video playback were not repeated.',priorDefect:'The previous 45-second UI cut included subsequent QA fixture footage after its normal opening. Root recut the original recording to 43 seconds.',checks:[],errors:[],mediaReadAborts:[]};
const check=(name,pass,details={})=>report.checks.push({name,pass,...details});
const priorPath='evidence/v0.2/review-page-checks.json';
const priorBytes=await readFile(priorPath),prior=JSON.parse(priorBytes);
report.historicalReport={path:priorPath,sha256:hash(priorBytes),summary:prior.summary};
const manifest=JSON.parse(await readFile('evidence/v0.2/media-manifest.json','utf8'));
const build=JSON.parse(await readFile('builds/build-manifest.json','utf8'));
const review=await readFile('evidence/REVIEW.html');report.reviewSha256=hash(review);
const media=manifest.files.find(file=>file.path.endsWith('/interaction-ui.mp4'));
const bytes=await readFile(media.path),sha256=hash(bytes);
const probe=JSON.parse(execFileSync('/opt/homebrew/bin/ffprobe',['-v','error','-show_entries','stream=codec_type,codec_name,width,height:format=duration,size','-of','json',media.path],{encoding:'utf8'}));
check('Corrected UI movie matches current manifest and 43-second trim',sha256===media.sha256&&Number(probe.format.duration)===43&&Number(probe.format.duration)===Number(media.probe.format.duration)&&bytes.length===Number(media.probe.format.size)&&JSON.stringify(probe.streams)===JSON.stringify(media.probe.streams),{path:media.path,sha256,bytes:bytes.length,probe});
const artifact=await readFile(resolve('builds',build.artifact));
check('Playable artifact is unchanged and matches both manifests',hash(artifact)==='cb4b9d7bc6174a96bd203a22f9a8a5a766f3fa0eca10475e80c8e4d681f5feea'&&hash(artifact)===build.sha256&&build.sha256===manifest.build.sha256&&artifact.length===build.bytes,{sha256:hash(artifact),bytes:artifact.length});
for(const file of manifest.files.filter(file=>file!==media)){
 const current=hash(await readFile(file.path));
 const old=prior.checks.find(check=>check.name===`${file.path} hash and media metadata match`);
 check(`Other movie unchanged: ${file.path}`,current===file.sha256&&current===old?.sha256,{sha256:current,playback:'Not repeated; same bytes as historical check.'});
}
report.visualInspection={observer:'Assistant visual inspection of extracted frame artifacts, not human player feedback.',observations:'40-second, 42-second, and final frames show four helpers, one mote, 7% cleared, A softer sweep owned, and the crew direction flag/toast. Helpers move toward the right-side assignment across these frames; no restored/large-population fixture state is visible in these samples.',frames:[]};
for(const name of ['interaction-frame-40.png','interaction-frame-42.png','interaction-last-frame.png'])report.visualInspection.frames.push({path:`evidence/v0.2/${name}`,sha256:hash(await readFile(`evidence/v0.2/${name}`))});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
 report.browser=await browser.version();const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',error=>report.errors.push(error.message));
 page.on('requestfailed',request=>{const text=`${request.url()} ${request.failure()?.errorText}`;if(request.resourceType()==='media'&&request.failure()?.errorText==='net::ERR_ABORTED')report.mediaReadAborts.push(text);else report.errors.push(text);});
 await page.goto(pathToFileURL(resolve('evidence/REVIEW.html')).href);
 const element=page.locator('video').first();await element.scrollIntoViewIfNeeded();
 const result=await element.evaluate(async video=>{
  video.muted=true;video.volume=0;
  if(video.readyState<1)await new Promise((resolve,reject)=>{video.addEventListener('loadedmetadata',resolve,{once:true});video.addEventListener('error',()=>reject(Error('Metadata failed')),{once:true});});
  await video.play();await new Promise((resolve,reject)=>{const start=performance.now();const poll=()=>{if(video.currentTime>.1)resolve();else if(performance.now()-start>5000)reject(Error('Opening playback did not advance'));else setTimeout(poll,50);};poll();});video.pause();const playedTo=video.currentTime;
  const seeked=new Promise(resolve=>video.addEventListener('seeked',resolve,{once:true}));video.currentTime=video.duration-1.5;await seeked;
  const ended=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Endpoint timeout')),8000);video.addEventListener('ended',()=>{clearTimeout(timer);resolve();},{once:true});});
  await video.play();await ended;
  return {src:video.getAttribute('src'),duration:video.duration,width:video.videoWidth,height:video.videoHeight,playedTo,currentTime:video.currentTime,ended:video.ended,error:video.error?.message||null};
 });
 check('Current review UI movie plays and reaches its corrected endpoint',result.src==='v0.2/interaction-ui.mp4'&&result.duration===43&&result.width===1440&&result.height===900&&result.playedTo>0&&result.ended&&result.currentTime===result.duration&&!result.error,result);
 check('No script or failed-file errors',report.errors.length===0);
}catch(error){report.errors.push(error.stack);}finally{await browser.close();}
report.summary={passed:report.checks.filter(check=>check.pass).length,failed:report.checks.filter(check=>!check.pass).length,errors:report.errors.length};
await writeFile('evidence/v0.2/review-ui-media-recheck.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({summary:report.summary,reviewSha256:report.reviewSha256,errors:report.errors},null,2));
if(report.summary.failed||report.summary.errors)process.exitCode=1;
