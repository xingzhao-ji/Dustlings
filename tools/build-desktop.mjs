import {packager} from '../platforms/desktop/node_modules/@electron/packager/dist/index.js';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const root=process.cwd(),manifest=JSON.parse(await readFile('builds/build-manifest.json','utf8'));
const html=await readFile('builds/Dustlings Courtyard.html');
const hash=createHash('sha256').update(html).digest('hex');
if(hash!==manifest.sha256)throw Error('Frozen courtyard artifact changed; review and regenerate its manifest first.');
await copyFile('builds/Dustlings Courtyard.html','platforms/desktop/game.html');
const targets=(process.argv[2]||'darwin-arm64,win32-x64').split(',');
const outputs=[];
for(const target of targets){
 const [platform,arch]=target.split('-');
 if(!['darwin','win32'].includes(platform)||!['arm64','x64'].includes(arch))throw Error('Unsupported target '+target);
 outputs.push(...await packager({dir:path.join(root,'platforms/desktop'),out:path.join(root,'builds/native'),name:'Dustlings',platform,arch,electronVersion:'44.3.0',appVersion:manifest.version,appBundleId:'com.dustlings.courtyard.prototype',icon:path.join(root,'platforms/shared',platform==='darwin'?'app-icon.icns':'app-icon.ico'),overwrite:true,asar:true,prune:true,ignore:[/^\/node_modules/,/^\/package-lock\.json$/],osxSign:false,win32metadata:{CompanyName:'Dustlings',FileDescription:'Dustlings courtyard development build',ProductName:'Dustlings'}}));
}
await mkdir('evidence/platforms',{recursive:true});
const wrapperFiles={};for(const f of ['platforms/desktop/main.cjs','platforms/desktop/package.json','platforms/desktop/package-lock.json','tools/build-desktop.mjs'])wrapperFiles[f]=createHash('sha256').update(await readFile(f)).digest('hex');
const record={wrapperFiles,builtAt:new Date().toISOString(),host:process.platform+' '+process.arch,wrapperRevision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),wrapperWorkingTree:'May contain current uncommitted packaging changes; native source checkpoint recorded separately.',game:manifest,electron:'44.3.0',packager:'20.3.0',targets,outputs:outputs.map(p=>path.relative(root,p)),status:'Development packages only. No Steam submission, Apple notarization, release signing, or human acceptance.'};
await writeFile('builds/desktop-build-manifest.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify(record,null,2));
