import {readFile,writeFile,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {extractFile} from '../platforms/desktop/node_modules/@electron/asar/lib/asar.js';
const manifest=JSON.parse(await readFile('builds/desktop-build-manifest.json','utf8'));
const hashes={};
for(const [file,expected]of Object.entries(manifest.wrapperFiles)){const actual=createHash('sha256').update(await readFile(file)).digest('hex');if(actual!==expected)throw Error(`Wrapper changed since packaging: ${file}`);}
for(const target of manifest.targets){
 const folder=`builds/native/Dustlings-${target}`;
 const mac=target.startsWith('darwin');
 const archive=mac?`${folder}/Dustlings.app/Contents/Resources/app.asar`:`${folder}/resources/app.asar`;
 const embedded=extractFile(archive,'game.html');const hash=createHash('sha256').update(embedded).digest('hex');
 if(hash!==manifest.game.sha256)throw Error('Embedded game hash mismatch '+target);
 const embeddedMain=extractFile(archive,'main.cjs');if(createHash('sha256').update(embeddedMain).digest('hex')!==manifest.wrapperFiles['platforms/desktop/main.cjs'])throw Error('Embedded wrapper mismatch '+target);
 const output=`builds/Dustlings-Courtyard-0.2.0-${target}-Development.zip`;
 execFileSync('ditto',['-c','-k','--sequesterRsrc','--keepParent',mac?`${folder}/Dustlings.app`:folder,output],{stdio:'inherit'});
 const body=await readFile(output);hashes[target]={archive:output,bytes:(await stat(output)).size,sha256:createHash('sha256').update(body).digest('hex'),embeddedGameSha256:hash,appAsarSha256:createHash('sha256').update(await readFile(archive)).digest('hex'),runtimeExecuted:mac};
}
const result={packagedAt:new Date().toISOString(),build:manifest,artifacts:hashes,status:'Development review archives; no distribution signing/notarization, Steam submission or human acceptance.'};
await writeFile('builds/desktop-package-manifest.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
