#!/usr/bin/env node
// Builds a local review hub; never launches, uploads or converts historical evidence to current.
// node tools/review-3d.mjs [--build manifest.json] [--capture opening=manifest.json]
//   [--capture restoration=manifest.json] [--capture profile=manifest.json]
//   [--mac-check launch-probe.json] [--test Label=report.json]
// --candidate-build manifest.json --gap "Known defect" presents a tested package separately
// from changed live source. --build remains strict about live runtime parity.
// --before-build manifest.json --before-capture Label=capture-manifest.json preserves
// an earlier package and exactly matching footage without promoting it to current.
// Without either build mode, creates an explicitly pending section. --check verifies an existing hub.
import {promises as fs} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {verifyNoticeArchive} from './godot-notices.mjs';
const exec = promisify(execFile);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'evidence/3d/REVIEW.html');
const gatesPath = path.join(root, 'docs/QUALITY-GATES.md');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const relative = file => path.relative(root, file).replaceAll('\\', '/');
const local = file => { const resolved = path.resolve(root, file); if (!resolved.startsWith(root + path.sep)) throw Error(`Review link escapes repository: ${file}`); return resolved; };
const readJSON = async file => JSON.parse(await fs.readFile(local(file), 'utf8'));
async function verifyLinks(html, records) {
  const registered = new Set(records.map(record=>record.path));
  for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url=match[1];
    if(url.startsWith('#')) {if(!html.includes(`id="${url.slice(1)}"`))throw Error(`Missing review section: ${url}`);continue;}
    const file=path.resolve(path.dirname(output),decodeURIComponent(url));
    if(!file.startsWith(root+path.sep) || !(await fs.stat(file)).isFile() || !registered.has(relative(file))) throw Error(`Broken or unregistered review link: ${url}`);
  }
}
const runtime = name => name === 'project.godot' || /^scenes\//.test(name) || /^scripts\/.*\.gd$/.test(name) || /^shaders\/.*\.gdshader$/.test(name) || /^assets\//.test(name);
const hashes = files => Object.fromEntries(Object.entries(files).filter(([name]) => runtime(name)).map(([name, value]) => [name, typeof value === 'string' ? value : value.sha256]));
function matching(expected, observed, label) {
  const differences = Object.keys({...expected, ...observed}).filter(name => !Object.hasOwn(expected,name) || !Object.hasOwn(observed,name) || expected[name] !== observed[name]);
  if (differences.length) throw Error(`${label} is not the build's runtime source: ${differences.join(', ')}`);
}
async function verifyRuntimeSource(build, directory=path.join(root,'godot'), label='Live source') {
  for (const [name, sha] of Object.entries(hashes(build.source.files))) {
    if (digest(await fs.readFile(path.join(directory, name))) !== sha) throw Error(`${label} differs from the package: ${name}`);
  }
  const names = [];
  async function walk(dir, prefix='') { for (const item of await fs.readdir(dir,{withFileTypes:true})) { if (item.name === '.godot' || item.name === '.DS_Store') continue; const name=prefix+item.name; if(item.isDirectory()) await walk(path.join(dir,item.name),name+'/'); else if(runtime(name)) names.push(name); } }
  await walk(directory);
  matching(hashes(build.source.files), Object.fromEntries(names.map(name=>[name,build.source.files[name]?.sha256])), label+' inventory');
}

if (process.argv.includes('--check')) {
  const html = await fs.readFile(output, 'utf8');
  const data = JSON.parse(html.match(/<script id="review-provenance" type="application\/json">([\s\S]*?)<\/script>/)?.[1] || 'null');
  if (!data) throw Error('Missing embedded review provenance');
  await verifyLinks(html,data.records);
  for (const record of data.records) {
    const bytes = await fs.readFile(local(record.path));
    if (bytes.length !== record.bytes || digest(bytes) !== record.sha256) throw Error(`Review evidence changed: ${record.path}`);
  }
  if (data.current) {
    const build=await readJSON(data.current.manifest);
    await verifyRuntimeSource(build,data.current.mode==='packaged-candidate'?path.resolve(path.dirname(local(data.current.manifest)),build.snapshot):undefined,data.current.mode==='packaged-candidate'?'Frozen candidate source':'Live source');
  }
  console.log(JSON.stringify({status:'passed',linkedFiles:data.records.length,current:data.current?.version || 'awaiting final build',humanSessions:0}));
  process.exit(0);
}

const options = {captures:[],tests:[],gaps:[],beforeCaptures:[]};
for (let i=2; i<process.argv.length; i+=2) {
  const flag=process.argv[i], value=process.argv[i+1];
  if (!value) throw Error(`Missing value for ${flag}`);
  if (flag==='--build' || flag==='--candidate-build') {if(options.build)throw Error('Choose one explicit build mode');options.build=value;options.candidate=flag==='--candidate-build';}
  else if(flag==='--before-build') options.beforeBuild=value;
  else if(flag==='--windows-package') options.windowsPackage=value;
  else if(flag==='--gap') options.gaps.push(value);
  else if(flag==='--mac-check') options.macCheck=value;
  else if(flag==='--capture' || flag==='--test' || flag==='--before-capture') {
    const split=value.indexOf('='); if(split<1) throw Error(`Expected Label=path for ${flag}`);
    options[flag==='--capture'?'captures':flag==='--before-capture'?'beforeCaptures':'tests'].push({label:value.slice(0,split),file:value.slice(split+1)});
  } else throw Error(`Unknown argument ${flag}`);
}
if (!options.build && (options.captures.length || options.macCheck || options.windowsPackage)) throw Error('Current capture/package claims require --build');
if (options.candidate && !options.gaps.length) throw Error('A separate packaged candidate must disclose its known --gap');
if(options.beforeCaptures.length && !options.beforeBuild) throw Error('Earlier footage requires its exact --before-build manifest');
const gates = await fs.readFile(gatesPath,'utf8');
const marker = /<!-- 3D-REVIEW-CANDIDATE:START -->[\s\S]*?<!-- 3D-REVIEW-CANDIDATE:END -->/;
if (!marker.test(gates)) throw Error('Missing current candidate markers in QUALITY-GATES.md');
const records = new Map();
async function asset(file, label, expectedSha) {
  const absolute=local(file), bytes=await fs.readFile(absolute), sha256=digest(bytes);
  if(expectedSha && sha256!==expectedSha) throw Error(`Artifact hash mismatch: ${file}`);
  records.set(relative(absolute),{path:relative(absolute),bytes:bytes.length,sha256,label});
  return {href:path.relative(path.dirname(output),absolute).split(path.sep).map(encodeURIComponent).join('/'),sha256,bytes:bytes.length};
}
async function link(file,label,sha) {const item=await asset(file,label,sha);return `<a href="${item.href}">${esc(label)}</a>`;}
async function image(file,label) {const item=await asset(file,label);return `<a href="${item.href}"><img loading="lazy" src="${item.href}" alt="${esc(label)}"></a>`;}
async function video(file,label,poster) {const item=await asset(file,label);const cover=poster?await asset(poster,label+' still'):null;return `<video controls preload="none"${cover?` poster="${cover.href}"`:''} aria-label="${esc(label)}"><source src="${item.href}" type="video/mp4"></video>`;}
const exists = async file => {try{return (await fs.stat(local(file))).isFile();}catch{return false;}};
let build=null, current=null, candidateMarkdown='', buildHTML='';
if (options.build) {
  build=await readJSON(options.build);
  if(build.kind!=='godot-native-development-integration-candidate' || build.checks?.complete!==true || build.errors?.length || build.source.changedSinceSnapshot) throw Error('Current package must be a successful frozen Godot export');
  await verifyRuntimeSource(build,options.candidate?path.resolve(path.dirname(local(options.build)),build.snapshot):undefined,options.candidate?'Frozen candidate source':'Live source');
  const base=path.dirname(local(options.build));
  const mac=relative(path.join(base,build.macOS.path)), win=relative(path.join(base,build.windows.path));
  const winPackName=Object.keys(build.windows.files).find(name=>name.endsWith('.pck'));
  if(!winPackName) throw Error('Windows PCK missing from manifest');
  const pck=relative(path.join(base,path.dirname(build.windows.path),winPackName));
  const macLink=await link(mac,'Download Mac development app ZIP',build.macOS.archive.sha256);
  const winLink=await link(win,'Windows x64 executable',build.windows.executable.sha256);
  const pckLink=await link(pck,'Windows game-data PCK',build.windows.pck.sha256);
  const manifestLink=await link(options.build,'Exact export manifest');
  let noticesHTML='';
  if(build.notices) {
    const notices=build.notices;
    const expected=['GODOT_LICENSE.txt','GODOT_COPYRIGHT.txt','THIRD-PARTY-NOTICES.txt','notice-manifest.json'].map(name=>'Notices/'+name);
    if(notices.schema!==1 || notices.sourceProvenance?.sha256!==build.source.sha256 || notices.sourceProvenance?.revision!==build.source.revision || notices.sourceProvenance?.engineVersion!==build.toolchain.editorVersion || notices.sourceProvenance?.editorSha256!==build.toolchain.editor.sha256 || Object.keys(notices.files||{}).length!==4 || expected.some(name=>!Object.hasOwn(notices.files,name))) throw Error('Notice bundle does not bind the exact build source and toolchain');
    for(const name of expected) {
      const record=await asset(relative(path.join(base,name)),'Bundled engine attribution: '+name,notices.files[name].sha256);
      if(record.bytes!==notices.files[name].bytes) throw Error('Notice file size mismatch: '+name);
    }
    const inner=await readJSON(relative(path.join(base,'Notices/notice-manifest.json')));
    if(inner.kind!=='dustlings-godot-notice-bundle' || inner.version!==1 || inner.source?.sha256!==build.source.sha256 || inner.source?.revision!==build.source.revision || inner.engine?.revision!==notices.engineHash || inner.engine?.editorSha256!==build.toolchain.editor.sha256 || inner.engine?.version!==build.toolchain.editorVersion || JSON.stringify(inner.engine?.templates)!==JSON.stringify(build.toolchain.templates) || Object.keys(inner.files||{}).length!==3 || expected.slice(0,3).some(name=>!Object.hasOwn(inner.files,name.slice('Notices/'.length)))) throw Error('Internal notice provenance differs from the build');
    for(const [name,entry] of Object.entries(inner.files)) if(notices.files['Notices/'+name]?.sha256!==entry.sha256 || notices.files['Notices/'+name]?.bytes!==entry.bytes) throw Error('Internal notice hash differs: '+name);
    await verifyNoticeArchive({archive:local(mac),bundle:notices});
    noticesHTML=`<p>${await link(relative(path.join(base,'Notices/THIRD-PARTY-NOTICES.txt')),'Engine, font and component notices')} accompany both development downloads. This attribution does not license the Dustlings game itself.</p>`;
  }
  let windowsDownload=`<p>${winLink}<br>${pckLink}</p><p>Keep both files together, then run the executable.</p>`;
  if(options.windowsPackage) {
    const companion=await readJSON(options.windowsPackage), folder=path.dirname(local(options.windowsPackage));
    if(companion.kind!=='dustlings-windows-review-package' || companion.version!==1 || path.resolve(folder,companion.manifest.file)!==local(options.build) || companion.manifest.sha256!==digest(await fs.readFile(local(options.build))) || companion.manifest.sourceHash!==build.source.sha256) throw Error('Windows ZIP companion does not bind this exact build manifest and source');
    const entries=companion.entries;
    const expectedNames=['Dustlings.exe','Dustlings.pck','README.txt',...Object.keys(build.notices?.files||{})];
    if(!Array.isArray(entries) || entries.length!==expectedNames.length || new Set(entries.map(item=>item.file)).size!==expectedNames.length || !entries.every(item=>expectedNames.includes(item.file))) throw Error('Windows ZIP must contain exactly the expected executable, pack, instructions and declared notices');
    for(const [name,expected] of [['Dustlings.exe',build.windows.executable],['Dustlings.pck',build.windows.pck]]) {
      const item=entries.find(entry=>entry.file===name);
      if(item.sha256!==expected.sha256 || item.bytes!==expected.bytes) throw Error(`Windows ZIP companion has a different ${name}`);
    }
    for(const [name,expected] of Object.entries(build.notices?.files||{})) {
      const item=entries.find(entry=>entry.file===name);
      if(item.sha256!==expected.sha256 || item.bytes!==expected.bytes) throw Error('Windows ZIP notice differs from the build: '+name);
    }
    const archive=relative(path.resolve(folder,companion.archive.file));
    const archiveAsset=await asset(archive,'Windows development ZIP',companion.archive.sha256);
    if(archiveAsset.bytes!==companion.archive.bytes) throw Error('Windows ZIP size mismatch');
    const inspected=JSON.parse((await exec('python3',['-c',`import sys,json,zipfile,hashlib
expected=json.loads(sys.argv[2])
with zipfile.ZipFile(sys.argv[1]) as archive:
    names=archive.namelist()
    assert len(names)==len(expected) and set(names)=={item['file'] for item in expected}, 'Unexpected ZIP entries'
    result=[]
    for item in expected:
        info=archive.getinfo(item['file'])
        assert info.file_size==item['bytes'], 'Unexpected uncompressed size'
        digest=hashlib.sha256()
        with archive.open(info) as stream:
            for chunk in iter(lambda:stream.read(1048576),b''): digest.update(chunk)
        result.append({'file':info.filename,'bytes':info.file_size,'sha256':digest.hexdigest()})
print(json.dumps(result))`,local(archive),JSON.stringify(entries)],{timeout:30000,maxBuffer:1024*1024})).stdout);
    for(const item of entries) {
      const actual=inspected.find(entry=>entry.file===item.file);
      if(actual?.sha256!==item.sha256 || actual?.bytes!==item.bytes) throw Error(`Windows ZIP entry mismatch: ${item.file}`);
    }
    windowsDownload=`<p><a href="${archiveAsset.href}">Download Windows development ZIP</a></p><p>Extract the ZIP, keep its files together, then open Dustlings.exe.</p><details><summary>Package identity and individual files</summary><p>${await link(options.windowsPackage,'Verified ZIP contents and source identity')}</p><p>${winLink}<br>${pckLink}</p></details>`;
  }
  let macStatus='Current exported-app launch report is not attached.';
  if(options.macCheck) {
    const check=await readJSON(options.macCheck);
    if(check.pckSha256!==build.macOS.pck.sha256 || check.executableSha256!==build.macOS.executable.sha256) throw Error('Mac launch report does not identify this exact exported package');
    if(check.sourceSha256!==build.source.sha256 || check.kind!=='packaged-mac-isolated-process-recovery' || check.exitCode!==0 || check.checks?.nativeCasesPassed?.passed!==true || check.failures?.length) throw Error('Mac report is not a successful separate-process recovery run for this source; preflight alone is insufficient');
    if(build.notices && check.conditions?.engine?.hash!==build.notices.engineHash) throw Error('Notice engine revision differs from the executed package');
    macStatus=`${Object.values(check.checks).filter(item=>item.passed).length} artifact and separate-process checks passed in ${await link(options.macCheck,'the exact packaged Mac report')}: opening save, fresh-process return, and blocked second-copy writes. Automated input; no human participant.`;
  }
  current={version:build.version,mode:options.candidate?'packaged-candidate':'live-source-matched',manifest:relative(local(options.build)),sourceSha256:build.source.sha256,pckSha256:build.macOS.pck.sha256,knownGaps:options.gaps};
  buildHTML=`<div class="downloads"><article><h3>Mac development app</h3><p>${macLink}</p><p>Extract the ZIP and open the app. Universal2, locally verified ad-hoc signature; no notarization.</p><p>${macStatus}</p></article><article><h3>Windows development files</h3>${windowsDownload}<p><strong>Windows execution remains unverified.</strong></p></article></div>${noticesHTML}<details><summary>Build identity · ${esc(build.version)}</summary><p>${manifestLink}</p><dl><dt>Source revision</dt><dd><code>${esc(build.source.revision)}</code></dd><dt>Source dirty / repository dirty</dt><dd>${esc(build.source.dirty)} / ${esc(build.source.repositoryDirty)}</dd><dt>Frozen source SHA-256</dt><dd><code>${esc(build.source.sha256)}</code></dd><dt>Game PCK SHA-256</dt><dd><code>${esc(build.macOS.pck.sha256)}</code></dd><dt>Built</dt><dd>${esc(build.finished)}</dd></dl></details>`;
  candidateMarkdown=`The current native review candidate is **${build.version}**, a real-geometry Godot courtyard, **awaiting human validation**.\n\n| Field | Exact record |\n| --- | --- |\n| Export manifest | [${relative(local(options.build))}](../${relative(local(options.build))}) |\n| Source revision | \`${build.source.revision}\` |\n| Source dirty / repository dirty | ${build.source.dirty} / ${build.source.repositoryDirty} |\n| Source SHA-256 | \`${build.source.sha256}\` |\n| Mac PCK SHA-256 | \`${build.macOS.pck.sha256}\` |\n| Mac archive SHA-256 | \`${build.macOS.archive.sha256}\` |\n| Windows executable SHA-256 | \`${build.windows.executable.sha256}\` |\n| Export finished | ${build.finished} |\n| Current review hub | [Actual gameplay, package links and provenance](../evidence/3d/REVIEW.html) |\n| Human / owner acceptance | Zero human sessions; no current-build owner approval |\n\nMac signing is local ad-hoc, with no notarization. Windows execution, physical iPad/iPhone support and store readiness remain unverified. The hub verifies runtime source parity between the package and its captures; fixtures and movie-mode timing are labeled separately from human play.`;
  if(options.candidate) {
    buildHTML=`<div class="pending"><h3>Tested packaged candidate · ${esc(build.source.revision.slice(0,7))}</h3><p>This is the tested, playable package. Live development has moved on; the corrections in progress are not included here. Its captures and checks below match this frozen package. <strong>Known defects remain; this is not a polished or accepted milestone.</strong></p></div>`+buildHTML;
    candidateMarkdown=candidateMarkdown.replace('The current native review candidate','The packaged review candidate')+'\n\nThis package is separate from changed live development. Its frozen source and attached capture runtime bytes match; this record makes no parity claim for the working tree. Corrections in progress require a new package and verification.';
  }
  if(options.gaps.length) {
    buildHTML+=`<div class="pending"><h3>Known player-facing gaps in this package</h3><ul>${options.gaps.map(gap=>`<li>${esc(gap)}</li>`).join('')}</ul><p>These remain unfinished work. No human satisfaction or owner release approval has been recorded.</p></div>`;
    candidateMarkdown+='\n\nKnown package gaps:\n\n'+options.gaps.map(gap=>'- '+gap).join('\n');
  }
} else {
  buildHTML='<div class="pending"><h3>Final current package pending</h3><p>The source is being integrated. Earlier native packages and captures below are historical references. A current download will appear after its exact source and package hashes are verified.</p></div>';
  candidateMarkdown='The active milestone is the real-geometry Godot courtyard, version `0.4.0-dev`, **awaiting human validation**. Final matching build metadata is pending. Earlier 3D packages and every 2D deliverable are historical; none establishes the current experience.\n\nSee [the 3D review hub](../evidence/3d/REVIEW.html) for labeled references. Current player, presentation and owner gates are not passed. Human sessions: **0**. Windows execution and physical mobile support remain unverified.';
}

let captureHTML='';
for (const {label,file} of options.captures) {
  const manifest=await readJSON(file);
  if(manifest.status!=='recorded' || !manifest.result) throw Error(`${label} capture is incomplete or failed`);
  matching(hashes(build.source.files),hashes(manifest.files),`${label} capture`);
  const folder=path.dirname(local(file)), report=manifest.result || {};
  const manifestLink=await link(file,'Capture source manifest');
  const movies=[];for(const name of ['full.mp4','opening.mp4','helper.mp4','ritual.mp4','restoration.mp4','overview.mp4','interaction.mp4']) if(await exists(relative(path.join(folder,name)))) movies.push(name);
  const pictures=[];for(const name of ['dirty.png','first-helper.png','discoveries.png','discovery-brush.png','discovery-teamwork.png','discovery-bloom.png','purchase.png','direction.png','progress-25.png','progress-50.png','progress-75.png','post-water-625.png','before-restoration.png','chorus.png','completion.png','completed.png','recap.png','restored.png','restored-fixture.png','busy-fixture.png','settings.png']) if(await exists(relative(path.join(folder,name)))) pictures.push(name);
  const performance=report.performance;
  const deviceFile=relative(path.join(folder,'device.json'));
  const device=await exists(deviceFile)?await readJSON(deviceFile):null;
  let media='';
  if(movies.length) media=await video(relative(path.join(folder,movies[0])),label,pictures.length?relative(path.join(folder,pictures[0])):null);
  if(pictures.length) media+=`<details><summary>Gameplay stills · open each image at original size</summary><div class="gallery">${(await Promise.all(pictures.map(async name=>`<figure>${await image(relative(path.join(folder,name)),`${label}: ${name.replace('.png','')}`)}<figcaption>${esc(name.replace('.png',''))}</figcaption></figure>`))).join('')}</div></details>`;
  let metrics='';
  if(performance) metrics=`<p><strong>${esc(performance.duration_seconds)} wall-clock seconds</strong> · ${esc(performance.samples)} process callbacks · p95 ${esc(performance.p95_ms)}ms · p99 ${esc(performance.p99_ms)}ms · worst ${esc(performance.worst_ms)}ms · ${Array.isArray(performance.over_33_4_ms)?performance.over_33_4_ms.length:esc(performance.over_33_4_ms)} callback intervals over 33.4ms.</p><p>${esc(performance.conditions)}</p>`;
  if(device) metrics+=`<p>${esc(device.modelIdentifier)} · ${esc(device.chip)} · ${esc(device.memory)} · ${esc(device.os)}. ${await link(deviceFile,'Recorded physical device and conditions')}</p>`;
  if(performance?.phases) metrics+=`<details><summary>Working, chorus and restored measurements</summary><ul>${Object.entries(performance.phases).map(([name,value])=>`<li>${esc(name)}: ${esc(value.samples)} callbacks; p95 ${esc(value.p95_ms)}ms, p99 ${esc(value.p99_ms)}ms, worst ${esc(value.worst_ms)}ms; ${esc(value.over_33_4_count)} over 33.4ms.</li>`).join('')}</ul><p>${esc(performance.frame_measurement)}</p></details>`;
  if(manifest.scenario==='full') metrics+=`<p>Scripted simulation timings: first helper ${Number(report.first_helper_at).toFixed(2)}s; restoration request ${Number(report.chorus_started_at).toFixed(2)}s; completion ${Number(report.completed_at).toFixed(2)}s. Request to finish ${(report.completed_at-report.chorus_started_at).toFixed(2)}s includes remaining work/gathering; it is not an 18-second whole sequence. ${esc(report.helpers)} helpers at the end.</p><p>${esc(report.input_kind)}</p>`;
  captureHTML+=`<article class="capture"><h3>${esc(label)}</h3><p>${esc(manifest.method || report.kind || 'Automated capture; inspect manifest for conditions.')}</p><p class="label">Source matches this package. ${['opening','full'].includes(manifest.scenario)?'Generated native InputEvents; no progress injection. Movie mode records the engine clock; its timings are not wall-clock player measurements.':performance?'Performance fixture; no human participant.':'Scripted state/interaction fixture unless its manifest explicitly states otherwise; not a natural full playthrough.'}</p>${metrics}${media}<p>${manifestLink}${await exists(relative(path.join(folder,'results.json')))?' · '+await link(relative(path.join(folder,'results.json')),'Actual result'):''}</p></article>`;
}
if(!captureHTML) captureHTML='<p>Current opening, restoration and sustained performance evidence is awaiting the final source-matched capture metadata.</p>';

let technicalHTML='';
for(const {label,file} of options.tests) {
  const report=await readJSON(file);
  const fail=Array.isArray(report.failures)?report.failures.length:'not recorded';
  const count=Array.isArray(report.checks)?report.checks.length:Array.isArray(report.cases)?report.cases.length:'see report';
  const bound=build && report.source_sha256===build.source.files['scripts/simulation.gd']?.sha256?'Simulation':build && report.main_sha256===build.source.files['scripts/main.gd']?.sha256?'Main script':null;
  technicalHTML+=`<li>${await link(file,label)} — ${esc(count)} checks/cases; ${esc(fail)} reported failures. ${bound?bound+' source hash matches the package.':'Exact source binding is not established by this report alone.'}</li>`;
}
const history=[];
if(options.beforeBuild) {
  const previous=await readJSON(options.beforeBuild);
  if(previous.kind!=='godot-native-development-integration-candidate' || previous.checks?.complete!==true || previous.errors?.length) throw Error('Earlier package must identify a successful native export');
  const directory=path.dirname(local(options.beforeBuild));
  await verifyRuntimeSource(previous,path.resolve(directory,previous.snapshot),'Earlier frozen source');
  const archive=await link(relative(path.join(directory,previous.macOS.path)),'Earlier Mac package (historical)',previous.macOS.archive.sha256);
  const manifestLink=await link(options.beforeBuild,'Earlier exact export manifest');
  let media='';
  for(const {label,file} of options.beforeCaptures) {
    const capture=await readJSON(file);
    if(capture.status!=='recorded' || !capture.result) throw Error('Earlier capture is incomplete or failed');
    matching(hashes(previous.source.files),hashes(capture.files),`${label} earlier capture`);
    const folder=path.dirname(local(file));
    const movie=relative(path.join(folder,capture.scenario+'.mp4'));
    const dirty=relative(path.join(folder,'dirty.png'));
    const performance=capture.result.performance;
    const recording=await exists(movie)?await video(movie,label,await exists(dirty)?dirty:null):'';
    if(!recording && !performance) throw Error('Earlier capture has no recording or performance result');
    const measured=performance?`<p>${esc(performance.duration_seconds)} wall-clock seconds; ${esc(performance.samples)} process callbacks; p95 ${esc(performance.p95_ms)}ms, p99 ${esc(performance.p99_ms)}ms, worst ${esc(performance.worst_ms)}ms. ${esc(performance.conditions)}</p><p>Earlier measurement with its own conditions. Duration and phases differ from the current working-crew profile; do not interpret this as a controlled before/after performance gain.</p>`:'';
    media+=`<h3>${esc(label)}</h3><p>${esc(capture.method)}</p>${measured}${recording}<p>${await link(file,'Earlier capture identity')}${await exists(relative(path.join(folder,'post-water-625.png')))?' · '+await link(relative(path.join(folder,'post-water-625.png')),'Earlier post-water frame (625s)'):''}${await exists(relative(path.join(folder,'completed.png')))?' · '+await link(relative(path.join(folder,'completed.png')),'Earlier completed courtyard frame'):''}</p>`;
  }
  history.push(`<article><h3>Previous packaged courtyard · ${esc(previous.source.revision.slice(0,7))}</h3><p>This package predates the current corrections. Its own frozen source matches the earlier footage below; it is retained for comparison, not as the current download. Human approval was not obtained.</p>${media}<p>${archive} · ${manifestLink}</p></article>`);
}
for(const [folder,title,note] of [['critic/baseline','Initial 3D baseline','Independent AI critique references this earlier experience. No human session or listening claim.'],['surface-and-spacing','Ground material and spacing pass','Historical correction capture; predates current spatial work reservations.'],['closer-camera','Earlier camera comparison','Historical camera comparison; its filename does not establish final camera acceptance.']]) {
  const base='evidence/3d/'+folder;
  if(!await exists(base+'/opening.mp4')) continue;
  history.push(`<article><h3>${esc(title)}</h3><p>${esc(note)}</p>${await video(base+'/opening.mp4',title,base+'/dirty.png')}<p>${await link(base+'/dirty.png','Dirty courtyard')} · ${await link(base+'/direction.png','Crew direction')}${await exists(base+'/capture-manifest.json')?' · '+await link(base+'/capture-manifest.json','Historical source identity'):''}</p></article>`);
}
const supporting=await Promise.all([['docs/CRITIQUE-3D-0.4.md','Independent AI critique and review scope'],['docs/3D-CROWD.md','Crowd correction and remaining checks'],['docs/3D-WORK-SEATS.md','Measured work-seat tradeoff'],['docs/3D-WATER-FLOW.md','Water comparison and perception uncertainty'],['docs/3D-AUDIO.md','Audio evidence and listening gaps'],['docs/3D-BUILD.md','Native build and signing limits'],['docs/3D-NOTICES.md','Exact engine attribution and package proof'],['docs/3D-ACCESSIBILITY-AUDIT.md','Settings feedback and keyboard corrections'],['docs/PERFORMANCE.md','Measured platform conditions and limits'],['evidence/3d/immersion-integration.log','Combined native integration log (before source freeze)'],['docs/3D-RECOVERY.md','Exact packaged recovery scope'],['docs/SKY-DIRECTION.md','Atmosphere and presentation direction'],['docs/3D-IMMERSION-UI.md','Current restoration context and recap evidence'],['docs/PLAYTEST.md','Private human-test protocol'],['docs/QUALITY-GATES.md','Human and owner gate ledger']].map(async([file,label])=>`<li>${await link(file,label)}</li>`));
const provenance={schema:1,generated:new Date().toISOString(),arguments:process.argv.slice(2),current,humanSessions:0,ownerApproved:false,status:'awaiting human validation',records:[...records.values()]};
// QUALITY-GATES is updated below, so register its final bytes instead of its old candidate block.
const updatedGates=gates.replace(marker,`<!-- 3D-REVIEW-CANDIDATE:START -->\n${candidateMarkdown}\n<!-- 3D-REVIEW-CANDIDATE:END -->`);
const gateRecord=provenance.records.find(record=>record.path==='docs/QUALITY-GATES.md');
gateRecord.bytes=Buffer.byteLength(updatedGates);gateRecord.sha256=digest(Buffer.from(updatedGates));
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dustlings · 3D courtyard review</title><style>
:root{color-scheme:light;--ink:#294e49;--paper:#f5f0e3;--line:#d4d5c3}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:17px/1.55 system-ui,-apple-system,sans-serif}main{max-width:1120px;margin:auto;padding:40px 24px 72px}h1{font-size:clamp(32px,5vw,52px);line-height:1.1;margin:12px 0 20px}h2{font-size:28px;margin:0 0 20px}h3{font-size:20px;margin:0 0 12px}p{margin:12px 0}a{color:#235d64;text-underline-offset:3px}a:focus-visible,summary:focus-visible,video:focus-visible{outline:3px solid #9a582d;outline-offset:5px}section{padding-top:40px;margin-top:24px;border-top:1px solid var(--line)}nav{display:flex;gap:12px 24px;flex-wrap:wrap;margin:24px 0}nav a{padding:8px 0}.eyebrow{font-size:14px;letter-spacing:.1em;text-transform:uppercase}.status{display:inline-block;background:#e6dbc0;padding:7px 14px;border-radius:18px;font-weight:650}.intro{max-width:760px;font-size:20px}.gates,.downloads,.history{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.downloads,.history{grid-template-columns:repeat(2,minmax(0,1fr))}article,.pending{background:#fffdf5;border:1px solid var(--line);border-radius:18px;padding:22px}.gates p{font-size:15px}.label{font-size:15px;background:#e9eee5;border-radius:8px;padding:12px}.capture{margin:18px 0}video{display:block;background:#dce5df;width:100%;aspect-ratio:16/10;border-radius:12px;margin-top:16px}.gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:18px}figure{margin:0}img{width:100%;display:block;border-radius:10px}figcaption{font-size:14px;margin-top:6px}details{margin-top:18px;padding:16px;background:#eeecdf;border-radius:12px}summary{cursor:pointer;font-weight:650}code{font-size:13px;overflow-wrap:anywhere}dt{font-weight:650}dd{margin:2px 0 16px}li{margin:10px 0}footer{font-size:14px;margin-top:40px}.history article{align-self:start}@media(max-width:720px){main{padding:28px 16px 48px}.gates,.downloads,.history,.gallery{grid-template-columns:1fr}.intro{font-size:18px}article{padding:18px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
</style></head><body><main><header><div class="eyebrow">Dustlings · native 3D courtyard</div><h1>A little dust.<br>A little life.</h1><span class="status">Awaiting human validation</span><p class="intro">Brush an abandoned miniature courtyard, watch dust become helpers, and restore its fountain. This hub presents an unfinished development candidate and the evidence behind its next review.</p><p><strong>0 human sessions. No current-build owner approval. No release claim.</strong> Steam Windows is the primary target; actual development testing is on Mac. iPad and iPhone remain later ports.</p><nav aria-label="Review sections"><a href="#play">Build</a><a href="#gameplay">Package gameplay</a><a href="#compare">Before and after</a><a href="#checks">Checks</a><a href="#human">Human review</a></nav></header><div class="gates"><article><h3>Player experience</h3><p>Unfamiliar players have not yet validated understanding, comfort, appeal or voluntary continuation.</p></article><article><h3>Presentation</h3><p>Actual 3D captures are review evidence. Benchmark quality and satisfaction require human judgment.</p></article><article><h3>Owner acceptance</h3><p>The owner has not approved this exact experience, completeness or readiness to sell.</p></article></div><section id="play"><h2>${current?'Review the native candidate':'Current build preparation'}</h2>${buildHTML}</section><section id="gameplay"><h2>Package gameplay and performance</h2>${captureHTML}</section><section id="compare"><h2>Before and after</h2><p>These earlier 3D recordings preserve the problems that motivated changes. Compare them with the package-matched gameplay above. They are historical references, separate from the packaged candidate; the old 2D prototype is not presented as the active game.</p><div class="history">${history.join('')}</div></section><section id="checks"><h2>Technical evidence</h2>${technicalHTML?`<ul>${technicalHTML}</ul>`:'<p>Final current test reports are awaiting attachment. Technical checks cannot establish enjoyment or aesthetic approval.</p>'}<details><summary>Supporting decisions and limitations</summary><ul>${supporting.join('')}</ul></details><p>All links were checked locally and their SHA-256 values are embedded in this page. Run <code>node tools/review-3d.mjs --check</code> to detect changed linked evidence or changed source for the selected build mode.</p></section><section id="human"><h2>What people still need to judge</h2><p>Observe whether unfamiliar players understand where helpers come from, direct them comfortably, recognize upgrade effects, enjoy the restoration and voluntarily continue. Ask what felt awkward, tiring, confusing or visually unpleasant. Review the actual screen size and sound, including a crowded crew.</p><p>Recruitment has not begun here: <strong>0 incremental-game buyers, 0 cozy/cleanup players, 0 friends/developers.</strong> The initial private round targets 12–20 unfamiliar intended players. The required segment is five minutes, followed by a neutral choice to stop or continue. At least 80% should reach an upgrade without coaching by that choice point; at least half should freely choose and actively play two additional minutes. Earlier finite endings are recorded separately. This protocol was amended before any human data. Current counts are 0/0, so no rate can be calculated. These are internal decision rules, not sales predictions.</p><p>Record who reviewed which exact build, what they experienced and any disagreements. Player enthusiasm, presentation review and the owner's explicit approval remain separate gates.</p></section><footer>Generated ${esc(provenance.generated)}. Local, offline review hub. An ended development session is not a finished game.</footer></main><script id="review-provenance" type="application/json">${JSON.stringify(provenance).replaceAll('<','\\u003c')}</script></body></html>`;
// Validate every displayed local href/src before replacing the current hub.
await verifyLinks(html,provenance.records);
await fs.writeFile(output,html);
await fs.writeFile(gatesPath,updatedGates);
console.log(JSON.stringify({status:'generated',current:current?.version || 'awaiting final build',linkedFiles:records.size,output:relative(output),humanSessions:0}));
