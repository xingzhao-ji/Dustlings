import {readFile,writeFile,stat,rename,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {verifyBuilds} from './verify-current-review.mjs';
// Check every target against the standalone build before writing any archive.
const verified=await verifyBuilds();
const manifest=verified.desktop;
if(process.argv.includes('--preflight')){
 console.log(JSON.stringify({status:'passed',mode:'preflight only; no archives written',game:verified.build,native:verified.native},null,2));
}else{
 const hashes={};
 for(const target of manifest.targets){
  const folder=`builds/native/Dustlings-${target}`,mac=target.startsWith('darwin');
  const item=verified.native.find(item=>item.target===target);
  const output=`builds/Dustlings-Courtyard-${manifest.game.version}-${target}-Development.zip`,temporary=output+'.tmp.zip';
  try{
   await rm(temporary,{force:true});
   execFileSync('ditto',['-c','-k','--sequesterRsrc','--keepParent',mac?`${folder}/Dustlings.app`:folder,temporary],{stdio:'inherit'});
   // Recheck source bytes after compression to reject a concurrently rebuilt payload.
   const after=await verifyBuilds();
   if(after.build.sha256!==verified.build.sha256||after.native.find(item=>item.target===target)?.appAsarSha256!==item.appAsarSha256)throw Error(`Build changed during compression: ${target}`);
   execFileSync('/usr/bin/unzip',['-tqq',temporary],{stdio:'inherit'});
   await rename(temporary,output);
   const body=await readFile(output);hashes[target]={archive:output,bytes:(await stat(output)).size,sha256:createHash('sha256').update(body).digest('hex'),embeddedGameSha256:item.embeddedGameSha256,appAsarSha256:item.appAsarSha256,runtimeExecuted:null,runtimeEvidence:'Packaging does not execute the app; consult a matching build-specific execution report.'};
  }finally{await rm(temporary,{force:true});}
 }
 const result={packagedAt:new Date().toISOString(),build:manifest,artifacts:hashes,status:'Development reference archives only. Packaging establishes neither current product scope nor native execution, signing, store submission or human acceptance.'};
 await writeFile('builds/desktop-package-manifest.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}
