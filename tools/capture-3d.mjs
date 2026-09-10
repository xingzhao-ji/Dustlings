#!/usr/bin/env node
// Freeze source before recording so concurrent specialist work cannot change provenance.
import {promises as fs} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
const [scenario='opening',label='current',...extra]=process.argv.slice(2);
if(!/^[a-z0-9_-]+$/.test(label)||!['opening','overview','ritual','profile','helper','full','workcrowd'].includes(scenario))throw Error('Invalid capture scenario/label');
const requestedWindow=process.env.DUSTLINGS_CAPTURE_WINDOW;
if(requestedWindow&&!/^\d{3,4}x\d{3,4}$/.test(requestedWindow))throw Error('Invalid capture window');
const output=path.resolve('evidence/3d',label),snapshot=path.resolve('builds/3d/capture-snapshots',label);
try{await fs.access(path.join(output,'capture-manifest.json'));throw Error('Capture label already exists; choose a new label to preserve evidence.');}catch(error){if(error.code!=='ENOENT')throw error;}
await fs.mkdir(output,{recursive:true});await fs.mkdir(snapshot,{recursive:true});
const files={};
async function freeze(source,destination,prefix=''){
 for(const item of await fs.readdir(source,{withFileTypes:true})){
  if(['.godot','.DS_Store'].includes(item.name))continue;
  if(item.isSymbolicLink())throw Error('Unexpected source symlink');
  const from=path.join(source,item.name),to=path.join(destination,item.name),rel=prefix+item.name;
  if(item.isDirectory()){await fs.mkdir(to,{recursive:true});await freeze(from,to,rel+'/');}
  else{const bytes=await fs.readFile(from);await fs.writeFile(to,bytes);files[rel]=crypto.createHash('sha256').update(bytes).digest('hex');}
 }
}
await freeze(process.env.DUSTLINGS_CAPTURE_SOURCE || 'godot',snapshot);
const sourceHash=crypto.createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(files).sort()))).digest('hex');
const manifest={created:new Date().toISOString(),scenario,label,sourceDirectory:path.resolve(process.env.DUSTLINGS_CAPTURE_SOURCE || 'godot'),runtimeArguments:extra,nativeArguments:requestedWindow?['--resolution',requestedWindow]:[],sourceHash,files,method:scenario==='profile'?'Wall-clock native run; no movie recording.':'Godot MovieMaker30fps fixed engine-time with generated native InputEvents or explicitly labelled fixtures. Rendering may run faster than wall-clock; no human input.',humanTests:0};
await fs.writeFile(path.join(output,'capture-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
async function run(exe,args,log){return await new Promise((resolve,reject)=>{const child=spawn(exe,args,{stdio:['ignore','pipe','pipe']});let result='';child.stdout.on('data',d=>result+=d);child.stderr.on('data',d=>result+=d);child.on('error',reject);child.on('close',async code=>{await fs.writeFile(path.join(output,log),result);if(code!==0||/SCRIPT ERROR:|ERROR:/m.test(result))reject(Error(`${log} failed (${code}); inspect preserved log`));else resolve(result);});});}
const engine=path.resolve('.tools/Godot.app/Contents/MacOS/Godot');
await run(engine,['--headless','--path',snapshot,'--import'],'import.log');
const args=['--path',snapshot,...manifest.nativeArguments];
if(scenario!=='profile')args.push('--write-movie',path.join(output,scenario+'.avi'),'--fixed-fps','30');
args.push('--','--qa','--qa-case='+scenario,'--evidence='+output,...extra);
try{
 await run(engine,args,'native.log');
 manifest.result=JSON.parse(await fs.readFile(path.join(output,'results.json'),'utf8'));
 if(scenario!=='profile')await run('ffmpeg',['-hide_banner','-loglevel','error','-i',path.join(output,scenario+'.avi'),'-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart','-y',path.join(output,scenario+'.mp4')],'encode.log');
 manifest.status='recorded';
}catch(error){manifest.status='failed';manifest.failure=error.message;process.exitCode=1;}
manifest.finished=new Date().toISOString();await fs.writeFile(path.join(output,'capture-manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({output,scenario,sourceHash,status:manifest.status,failure:manifest.failure,result:manifest.result},null,2));
