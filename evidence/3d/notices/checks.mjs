import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';import {writeGodotNotices,verifyNoticeArchive} from '../../../tools/godot-notices.mjs';
const folder=path.resolve('builds/3d/0.4.0-dev-2026-09-10T10-09-48-517Z-056dc75f00');const m=JSON.parse(await fs.readFile(path.join(folder,'manifest.json')));const stage=path.resolve('builds/3d/experiments/notices-stage');const output=path.join(stage,'Notices');const checks=[];const sha=async p=>crypto.createHash('sha256').update(await fs.readFile(p)).digest('hex');
const bundle=await writeGodotNotices({output,source:m.source,toolchain:m.toolchain});checks.push({name:'Exact audited bundle generated',passed:true,files:bundle.files});
const before=await fs.stat(path.join(output,'GODOT_LICENSE.txt'));await writeGodotNotices({output,source:m.source,toolchain:m.toolchain});checks.push({name:'Identical repeat preserves mtime',passed:before.mtimeMs===(await fs.stat(path.join(output,'GODOT_LICENSE.txt'))).mtimeMs});
async function reject(name,action){let rejected=false;try{await action();}catch{rejected=true;}checks.push({name,passed:rejected});}
await reject('Different engine rejected',()=>writeGodotNotices({output:stage+'/bad-engine',source:m.source,toolchain:{...m.toolchain,editorVersion:'other'}}));
await reject('Unknown source identity rejected',()=>writeGodotNotices({output:stage+'/bad-source',source:{...m.source,sha256:'unknown'},toolchain:m.toolchain}));
await fs.mkdir(stage+'/mixed',{recursive:true});await fs.writeFile(stage+'/mixed/unexpected.txt','fixture');await reject('Mixed existing output rejected',()=>writeGodotNotices({output:stage+'/mixed',source:m.source,toolchain:m.toolchain}));
const zipProof=[];
for(const [label,rel] of [['Mac',m.macOS.path],['Windows','Windows/Dustlings-Windows.zip']]){
 const original=path.join(folder,rel), target=path.join(stage,label+'.zip');const originalHash=await sha(original);await reject(label+' original missing notices rejected',()=>verifyNoticeArchive({archive:original,bundle}));await fs.copyFile(original,target);
 const proof=JSON.parse(execFileSync('python3',['-c',`import sys,json,zipfile,pathlib,hashlib
original,target,folder=sys.argv[1:]
with zipfile.ZipFile(target,'a',compression=zipfile.ZIP_STORED) as z:
 for p in sorted(pathlib.Path(folder).iterdir()): z.write(p,'Notices/'+p.name)
with zipfile.ZipFile(original) as old, zipfile.ZipFile(target) as new:
 records=[]
 for n in old.namelist():
  a,b=old.read(n),new.read(n)
  assert a==b, 'Original payload changed: '+n
  records.append({'file':n,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
 assert len(new.namelist())==len(old.namelist())+4
print(json.dumps({'unchangedOriginalEntries':records}))`,original,target,output],{encoding:'utf8',maxBuffer:1024*1024}));
 const verified=await verifyNoticeArchive({archive:target,bundle});if(originalHash!==await sha(original))throw Error('Historical package mutated');checks.push({name:label+' actual staged archive notices and payload',passed:true});zipProof.push({label,original,originalSha256:originalHash,staged:target,stagedSha256:await sha(target),verification:verified,...proof});
}
execFileSync('python3',['-c',`import zipfile,sys
with zipfile.ZipFile(sys.argv[1],'w') as z: z.writestr('Notices/GODOT_LICENSE.txt','bad')`,stage+'/bad.zip']);await reject('Incorrect archive notice bytes rejected',()=>verifyNoticeArchive({archive:stage+'/bad.zip',bundle}));
const result={kind:'Packaging-only notice proof on copies of exact historical development archives; no GUI, PCK rebuild, Windows execution or human review',checks,failures:checks.filter(c=>!c.passed),bundle,archives:zipProof};await fs.writeFile('evidence/3d/notices/checks.json',JSON.stringify(result,null,2)+'\n');if(result.failures.length)throw Error('Notice checks failed');console.log(JSON.stringify({passed:checks.length,failures:0,stage}));
