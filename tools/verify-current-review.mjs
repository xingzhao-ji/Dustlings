/** Read-only provenance checks. Does not launch a game, decode media, or judge quality. */
import {readFile,stat,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const defaultRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const readJson=async file=>JSON.parse(await readFile(file,'utf8'));
function requireCondition(value,message){if(!value)throw Error(message);}
function sameBuild(actual,expected,label){for(const key of ['version','sha256','sourceRevision'])requireCondition(actual?.[key]===expected[key],`${label}: ${key} does not match the current standalone build`);}
async function localFile(root,relative){
 const absolute=path.resolve(root,relative),resolved=await realpath(absolute);
 requireCondition(resolved===root||resolved.startsWith(root+path.sep),`Reference leaves the project: ${relative}`);
 requireCondition((await stat(resolved)).isFile(),`Reference is not a file: ${relative}`);return absolute;
}
export async function verifyBuilds({root=defaultRoot,native=true}={}){
 root=await realpath(root);
 const build=await readJson(path.join(root,'builds/build-manifest.json'));
 requireCondition(/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(build.version),'Build version is missing or malformed');
 const artifact=await localFile(root,path.join('builds',build.artifact)),bytes=await readFile(artifact);
 requireCondition(sha256(bytes)===build.sha256&&bytes.length===build.bytes,'Standalone artifact hash/size does not match its manifest');
 const result={build,artifact:path.relative(root,artifact),native:[]};
 if(!native)return result;
 const desktop=await readJson(path.join(root,'builds/desktop-build-manifest.json'));sameBuild(desktop.game,build,'Desktop manifest');
 requireCondition(Array.isArray(desktop.targets)&&desktop.targets.length>0,'Desktop target list is empty');
 requireCondition(new Set(desktop.targets).size===desktop.targets.length,'Desktop target list repeats a target');
 for(const [file,expected] of Object.entries(desktop.wrapperFiles||{}))requireCondition(sha256(await readFile(await localFile(root,file)))===expected,`Wrapper changed after native packaging: ${file}`);
 const {extractFile}=await import(pathToFileURL(path.join(root,'platforms/desktop/node_modules/@electron/asar/lib/asar.js')));
 for(const target of desktop.targets){
  requireCondition(/^(darwin|win32)-(arm64|x64)$/.test(target),`Unsupported native target: ${target}`);
  const folder=`builds/native/Dustlings-${target}`,relative=target.startsWith('darwin')?`${folder}/Dustlings.app/Contents/Resources/app.asar`:`${folder}/resources/app.asar`;
  const asar=await localFile(root,relative);
  requireCondition(sha256(extractFile(asar,'game.html'))===build.sha256,`Embedded game is stale: ${target}`);
  requireCondition(sha256(extractFile(asar,'main.cjs'))===desktop.wrapperFiles['platforms/desktop/main.cjs'],`Embedded desktop host is stale: ${target}`);
  const metadata=JSON.parse(extractFile(asar,'package.json').toString());requireCondition(metadata.version===build.version,`Embedded app version is stale: ${target}`);
  result.native.push({target,asar:relative,appAsarSha256:sha256(await readFile(asar)),embeddedGameSha256:build.sha256,version:metadata.version});
 }
 result.desktop=desktop;return result;
}
function attributes(tag){
 const result={};for(const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))result[match[1].toLowerCase()]=(match[2]??match[3]??match[4]).replaceAll('&amp;','&');return result;
}
export async function verifyCurrentReview({root=defaultRoot,review='evidence/REVIEW.html',mediaManifest,native=true}={}){
 root=await realpath(root);const result=await verifyBuilds({root,native});
 const reviewFile=await localFile(root,review),html=await readFile(reviewFile,'utf8');
 const title=html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'';
 requireCondition(title.includes(result.build.version),'Review title does not identify the current build version');
 requireCondition(html.includes(result.build.sha256)&&html.includes(result.build.sourceRevision),'Review does not identify the current artifact hash and source revision');
 const directory=`evidence/v${result.build.version.split('.').slice(0,2).join('.')}`;
 const mediaPath=mediaManifest||`${directory}/media-manifest.json`;
 const media=await readJson(await localFile(root,mediaPath));sameBuild(media.build,result.build,'Media manifest');
 requireCondition(Array.isArray(media.files),'Media manifest files must be an array');
 const entries=new Map();
 for(const item of media.files){
  const absolute=await localFile(root,item.path);requireCondition(!entries.has(absolute),`Duplicate media manifest path: ${item.path}`);
  requireCondition(sha256(await readFile(absolute))===item.sha256,`Media hash does not match: ${item.path}`);
  if(item.historical)requireCondition(typeof item.note==='string'&&item.note.trim(),`Historical media needs a provenance note: ${item.path}`);
  else if(item.build)sameBuild(item.build,result.build,`Media ${item.path}`);
  entries.set(absolute,item);
 }
 const references=[],mediaReferences=[];let playLinks=0;
 const base=pathToFileURL(reviewFile);
 for(const match of html.matchAll(/<(a|img|video|audio|source|link|script)\b[^>]*>/gi)){
  const tag=match[1].toLowerCase(),attrs=attributes(match[0]);
  requireCondition(!attrs.srcset,'Use explicit reviewed media sources instead of an unverified srcset');
  for(const attribute of ['href','src','poster']){
   if(!attrs[attribute]||attrs[attribute].startsWith('#')||attrs[attribute].startsWith('data:'))continue;
   const url=new URL(attrs[attribute],base);if(['https:','http:','mailto:'].includes(url.protocol)){requireCondition(tag==='a'&&attribute==='href',`Review media and resources must be local: ${attrs[attribute]}`);continue;}
   requireCondition(url.protocol==='file:',`Unsupported review URL: ${attrs[attribute]}`);
   const absolute=await localFile(root,fileURLToPath(url)),relative=path.relative(root,absolute);references.push({tag,attribute,path:relative});
   if(absolute===path.resolve(root,result.artifact))playLinks++;
   if((['img','video','audio','source'].includes(tag)&&attribute==='src')||attribute==='poster'){
    const entry=entries.get(absolute);requireCondition(entry,`Displayed media has no hash/provenance entry: ${relative}`);
    requireCondition(!!entry.historical===(attrs['data-evidence']==='historical'),`Historical/current media marker mismatch: ${relative}`);
    mediaReferences.push({path:relative,sha256:entry.sha256,historical:!!entry.historical});
   }
   if(relative.startsWith('builds/')&&relative.endsWith('.zip')){
    const packages=await readJson(path.join(root,'builds/desktop-package-manifest.json'));sameBuild(packages.build?.game,result.build,'Linked native package manifest');
    const item=Object.values(packages.artifacts||{}).find(item=>path.resolve(root,item.archive)===absolute);
    requireCondition(item,`Linked archive is absent from current native package manifest: ${relative}`);
    requireCondition(sha256(await readFile(absolute))===item.sha256,`Linked native archive hash mismatch: ${relative}`);
    requireCondition(item.embeddedGameSha256===result.build.sha256,`Linked native archive game is stale: ${relative}`);
    const current=result.native.find(target=>target.target===Object.entries(packages.artifacts).find(([,value])=>value===item)?.[0]);
    if(native)requireCondition(current?.appAsarSha256===item.appAsarSha256,`Linked native archive predates the current app bundle: ${relative}`);
   }
  }
 }
 requireCondition(playLinks>0,'Review has no link to the exact standalone artifact');
 requireCondition(mediaReferences.some(item=>!item.historical),'Review has no registered current-build media');
 return {...result,review:{path:path.relative(root,reviewFile),sha256:sha256(Buffer.from(html))},mediaManifest:mediaPath,references,media:mediaReferences,status:'passed',limits:'Checks bytes, identifiers and declared provenance only. Does not establish media decoding, usability, human satisfaction, listening quality, native execution or store acceptance.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);const options={native:!args.includes('--no-native')};
  for(const flag of ['--root','--review','--media-manifest'])if(args.includes(flag)){const value=args[args.indexOf(flag)+1];requireCondition(value&&!value.startsWith('--'),`${flag} requires a value`);options[flag==='--media-manifest'?'mediaManifest':flag.slice(2)]=value;}
  const result=args.includes('--builds-only')?await verifyBuilds(options):await verifyCurrentReview(options);
  console.log(JSON.stringify(result,null,2));
 }catch(error){console.error(JSON.stringify({status:'failed',reason:error.message},null,2));process.exitCode=1;}
}
