// Compile-only fallback when the local Xcode project driver cannot load its plug-ins.
// This does not produce a signed archive, a store package, or a validated simulator install.
import {spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const mode=process.argv[2]||'simulator';
if(!['simulator','device'].includes(mode))throw Error('Use node tools/apple-compile.mjs simulator|device');
const manifest=JSON.parse(await readFile(`${root}platforms/apple/Dustlings/Resources/web-build-manifest.json`,'utf8'));
const html=await readFile(`${root}platforms/apple/Dustlings/Resources/Courtyard.html`);
if(createHash('sha256').update(html).digest('hex')!==manifest.sha256)throw Error('Frozen courtyard hash mismatch');
const sdkName=mode==='device'?'iphoneos':'iphonesimulator';
const sdkResult=spawnSync('xcrun',['--sdk',sdkName,'--show-sdk-path'],{encoding:'utf8'});
if(sdkResult.status!==0)throw Error(sdkResult.stderr);
const sdk=sdkResult.stdout.trim();
const directory=`${root}platforms/apple/DerivedData/CompileOnly-${mode}/Dustlings.app`;
await mkdir(directory,{recursive:true});
const args=['--sdk',sdkName,'swiftc','-parse-as-library','-O','-target',`arm64-apple-ios16.0${mode==='simulator'?'-simulator':''}`,'-sdk',sdk,`${root}platforms/apple/Dustlings/App.swift`,'-o',`${directory}/Dustlings`];
const started=new Date().toISOString();
const result=spawnSync('xcrun',args,{encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024});
process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');
if(result.status===0){
  let plist=await readFile(`${root}platforms/apple/Dustlings/Info.plist`,'utf8');
  plist=plist.replaceAll('$(PRODUCT_BUNDLE_IDENTIFIER)','local.dustlings.courtyard').replaceAll('$(EXECUTABLE_NAME)','Dustlings').replaceAll('$(PRODUCT_NAME)','Dustlings');
  await writeFile(`${directory}/Info.plist`,plist);
  for(const name of ['Courtyard.html','web-build-manifest.json'])await copyFile(`${root}platforms/apple/Dustlings/Resources/${name}`,`${directory}/${name}`);
  await copyFile(`${root}platforms/apple/Dustlings/PrivacyInfo.xcprivacy`,`${directory}/PrivacyInfo.xcprivacy`);
}
const loadCommands=result.status===0?spawnSync('otool',['-l',`${directory}/Dustlings`],{encoding:'utf8'}).stdout:'';
const buildVersion=loadCommands.match(/cmd LC_BUILD_VERSION\s+cmdsize \d+\s+platform (\d+)\s+minos ([\d.]+)\s+sdk ([\d.]+)/);
const report={started,finished:new Date().toISOString(),mode,command:['xcrun',...args],exitCode:result.status,error:result.error?.message||null,artifact:directory.replace(root,''),webSHA256:manifest.sha256,machO:buildVersion?{platform:Number(buildVersion[1]),minimumOS:buildVersion[2],sdk:buildVersion[3]}:null,signing:'no distribution signing; linker may embed ad-hoc signature',assetCatalog:'not compiled in fallback; project driver remains blocked',execution:'not run',status:result.status===0?'native executable linked; full Xcode packaging and runtime validation blocked':'compile failed'};
await mkdir(`${root}evidence/platforms`,{recursive:true});
await writeFile(`${root}evidence/platforms/apple-${mode}-compile.json`,JSON.stringify(report,null,2)+'\n');
await writeFile(`${root}evidence/platforms/apple-${mode}-compile.log`,(result.stdout||'')+(result.stderr||''));
if(result.status!==0)process.exitCode=1;
