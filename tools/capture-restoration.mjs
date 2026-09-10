import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const output=process.env.DUSTLINGS_EVIDENCE_DIR||'evidence';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const save=JSON.parse(await readFile('evidence/completed-test-save.json','utf8'));
Object.assign(save,{restoration:0,ritual:false,ritualTime:0,completed:false,completedAt:null});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});
try{
  await page.goto(pathToFileURL(resolve('builds/Dustlings Courtyard.html')).href+'?qa=1');
  await page.getByRole('button',{name:'Bring it to life'}).click();await page.evaluate(save=>window.__dustlings.load(save),save);await page.waitForTimeout(300);
  await page.evaluate(()=>{
    const stream=document.querySelector('canvas').captureStream(30);for(const t of window.__dustlings.audio.getCaptureStream().getAudioTracks())stream.addTrack(t);
    window.__ritualChunks=[];window.__ritualRecorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9,opus',videoBitsPerSecond:2200000});window.__ritualRecorder.ondataavailable=e=>window.__ritualChunks.push(e.data);window.__ritualRecorder.start(1000);
  });
  await page.locator('#restore-button').click();console.log('Recording normal-speed fountain ritual from an explicitly automated completed-cleanup fixture.');
  for(let i=0;i<5;i++)await page.waitForTimeout(10000);
  const data=await page.evaluate(async()=>{await new Promise(r=>{window.__ritualRecorder.onstop=r;window.__ritualRecorder.stop();});return await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result.split(',')[1]);f.readAsDataURL(new Blob(window.__ritualChunks,{type:'video/webm'}));});});
  await writeFile(`${output}/restoration-with-sound.webm`,Buffer.from(data,'base64'));
  await page.screenshot({path:`${output}/final-completion-dialog.png`});
  const result=await page.evaluate(()=>({completed:window.__dustlings.state.completed,restoration:window.__dustlings.state.restoration,crew:window.__dustlings.state.creatures.length,dialog:document.querySelector('#completion').open}));
  await writeFile(`${output}/restoration-recording.json`,JSON.stringify({kind:'Normal-speed ritual playback from automated save; no human playtest',build:JSON.parse(await readFile('builds/build-manifest.json','utf8')),...result},null,2));
  if(!result.completed||!result.dialog)throw Error('Completion recording did not reach ending dialog.');
}finally{await browser.close();}
