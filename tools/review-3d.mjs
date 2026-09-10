#!/usr/bin/env node
// Builds a local review hub; never launches, uploads or converts historical evidence to current.
// node tools/review-3d.mjs [--build manifest.json] [--capture opening=manifest.json]
//   [--capture restoration=manifest.json] [--capture profile=manifest.json]
//   [--mac-check launch-probe.json] [--test Label=report.json]
// Without --build, creates an explicitly pending current section. --check verifies an existing hub.
import {promises as fs} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'evidence/3d/REVIEW.html');
const gatesPath = path.join(root, 'docs/QUALITY-GATES.md');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const relative = file => path.relative(root, file).replaceAll('\\', '/');
const local = file => { const resolved = path.resolve(root, file); if (!resolved.startsWith(root + path.sep)) throw Error(`Review link escapes repository: ${file}`); return resolved; };
const readJSON = async file => JSON.parse(await fs.readFile(local(file), 'utf8'));
const runtime = name => name === 'project.godot' || /^scenes\//.test(name) || /^scripts\/.*\.gd$/.test(name) || /^shaders\/.*\.gdshader$/.test(name) || /^assets\//.test(name);
const hashes = files => Object.fromEntries(Object.entries(files).filter(([name]) => runtime(name)).map(([name, value]) => [name, typeof value === 'string' ? value : value.sha256]));
function matching(expected, observed, label) {
  const differences = Object.keys({...expected, ...observed}).filter(name => !Object.hasOwn(expected,name) || !Object.hasOwn(observed,name) || expected[name] !== observed[name]);
  if (differences.length) throw Error(`${label} is not the build's runtime source: ${differences.join(', ')}`);
}
async function verifyLiveSource(build) {
  for (const [name, sha] of Object.entries(hashes(build.source.files))) {
    if (digest(await fs.readFile(path.join(root, 'godot', name))) !== sha) throw Error(`Build is historical: current godot/${name} differs`);
  }
  const names = [];
  async function walk(dir, prefix='') { for (const item of await fs.readdir(dir,{withFileTypes:true})) { if (item.name === '.godot' || item.name === '.DS_Store') continue; const name=prefix+item.name; if(item.isDirectory()) await walk(path.join(dir,item.name),name+'/'); else if(runtime(name)) names.push(name); } }
  await walk(path.join(root,'godot'));
  matching(hashes(build.source.files), Object.fromEntries(names.map(name=>[name,build.source.files[name]?.sha256])), 'Live source inventory');
}

if (process.argv.includes('--check')) {
  const html = await fs.readFile(output, 'utf8');
  const data = JSON.parse(html.match(/<script id="review-provenance" type="application\/json">([\s\S]*?)<\/script>/)?.[1] || 'null');
  if (!data) throw Error('Missing embedded review provenance');
  for (const record of data.records) {
    const bytes = await fs.readFile(local(record.path));
    if (bytes.length !== record.bytes || digest(bytes) !== record.sha256) throw Error(`Review evidence changed: ${record.path}`);
  }
  if (data.current) await verifyLiveSource(await readJSON(data.current.manifest));
  console.log(JSON.stringify({status:'passed',linkedFiles:data.records.length,current:data.current?.version || 'awaiting final build',humanSessions:0}));
  process.exit(0);
}

const options = {captures:[],tests:[]};
for (let i=2; i<process.argv.length; i+=2) {
  const flag=process.argv[i], value=process.argv[i+1];
  if (!value) throw Error(`Missing value for ${flag}`);
  if (flag==='--build') options.build=value;
  else if(flag==='--mac-check') options.macCheck=value;
  else if(flag==='--capture' || flag==='--test') {
    const split=value.indexOf('='); if(split<1) throw Error(`Expected Label=path for ${flag}`);
    options[flag==='--capture'?'captures':'tests'].push({label:value.slice(0,split),file:value.slice(split+1)});
  } else throw Error(`Unknown argument ${flag}`);
}
if (!options.build && (options.captures.length || options.macCheck)) throw Error('Current capture/package claims require --build');
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
  await verifyLiveSource(build);
  const base=path.dirname(local(options.build));
  const mac=relative(path.join(base,build.macOS.path)), win=relative(path.join(base,build.windows.path));
  const winPackName=Object.keys(build.windows.files).find(name=>name.endsWith('.pck'));
  if(!winPackName) throw Error('Windows PCK missing from manifest');
  const pck=relative(path.join(base,path.dirname(build.windows.path),winPackName));
  const macLink=await link(mac,'Download Mac development app ZIP',build.macOS.archive.sha256);
  const winLink=await link(win,'Windows x64 executable',build.windows.executable.sha256);
  const pckLink=await link(pck,'Windows game-data PCK',build.windows.pck.sha256);
  const manifestLink=await link(options.build,'Exact export manifest');
  let macStatus='Current exported-app launch report is not attached.';
  if(options.macCheck) {
    const check=await readJSON(options.macCheck);
    if(check.pckSha256!==build.macOS.pck.sha256 || check.executableSha256!==build.macOS.executable.sha256) throw Error('Mac launch report does not identify this exact exported package');
    macStatus=`Package identity matches ${await link(options.macCheck,'the local Mac launch report')}. Exit code: ${esc(check.exitCode ?? 'not recorded')}. Review its stated scope and diagnostics.`;
  }
  current={version:build.version,manifest:relative(local(options.build)),sourceSha256:build.source.sha256,pckSha256:build.macOS.pck.sha256};
  buildHTML=`<div class="downloads"><article><h3>Mac development app</h3><p>${macLink}</p><p>Extract the ZIP and open the app. Universal2, locally verified ad-hoc signature; no notarization.</p><p>${macStatus}</p></article><article><h3>Windows development files</h3><p>${winLink}<br>${pckLink}</p><p>Keep both files together, then run the executable. <strong>Windows execution remains unverified.</strong></p></article></div><details><summary>Build identity · ${esc(build.version)}</summary><p>${manifestLink}</p><dl><dt>Source revision</dt><dd><code>${esc(build.source.revision)}</code></dd><dt>Source dirty / repository dirty</dt><dd>${esc(build.source.dirty)} / ${esc(build.source.repositoryDirty)}</dd><dt>Frozen source SHA-256</dt><dd><code>${esc(build.source.sha256)}</code></dd><dt>Game PCK SHA-256</dt><dd><code>${esc(build.macOS.pck.sha256)}</code></dd><dt>Built</dt><dd>${esc(build.finished)}</dd></dl></details>`;
  candidateMarkdown=`The current native review candidate is **${build.version}**, a real-geometry Godot courtyard, **awaiting human validation**.\n\n| Field | Exact record |\n| --- | --- |\n| Export manifest | [${relative(local(options.build))}](../${relative(local(options.build))}) |\n| Source revision | \`${build.source.revision}\` |\n| Source dirty / repository dirty | ${build.source.dirty} / ${build.source.repositoryDirty} |\n| Source SHA-256 | \`${build.source.sha256}\` |\n| Mac PCK SHA-256 | \`${build.macOS.pck.sha256}\` |\n| Mac archive SHA-256 | \`${build.macOS.archive.sha256}\` |\n| Windows executable SHA-256 | \`${build.windows.executable.sha256}\` |\n| Export finished | ${build.finished} |\n| Current review hub | [Actual gameplay, package links and provenance](../evidence/3d/REVIEW.html) |\n| Human / owner acceptance | Zero human sessions; no current-build owner approval |\n\nMac signing is local ad-hoc, with no notarization. Windows execution, physical iPad/iPhone support and store readiness remain unverified. The hub verifies runtime source parity for its current captures; fixtures and movie-mode timing are labeled separately from human play.`;
} else {
  buildHTML='<div class="pending"><h3>Final current package pending</h3><p>The source is being integrated. Earlier native packages and captures below are historical references. A current download will appear after its exact source and package hashes are verified.</p></div>';
  candidateMarkdown='The active milestone is the real-geometry Godot courtyard, version `0.4.0-dev`, **awaiting human validation**. Final matching build metadata is pending. Earlier 3D packages and every 2D deliverable are historical; none establishes the current experience.\n\nSee [the 3D review hub](../evidence/3d/REVIEW.html) for labeled references. Current player, presentation and owner gates are not passed. Human sessions: **0**. Windows execution and physical mobile support remain unverified.';
}

let captureHTML='';
for (const {label,file} of options.captures) {
  const manifest=await readJSON(file);
  matching(hashes(build.source.files),hashes(manifest.files),`${label} capture`);
  const folder=path.dirname(local(file)), report=manifest.result || {};
  const manifestLink=await link(file,'Capture source manifest');
  const movies=[];for(const name of ['opening.mp4','restoration.mp4','overview.mp4','interaction.mp4']) if(await exists(relative(path.join(folder,name)))) movies.push(name);
  const pictures=[];for(const name of ['dirty.png','first-helper.png','discoveries.png','purchase.png','direction.png','before-restoration.png','restored.png','restored-fixture.png','busy-fixture.png','settings.png']) if(await exists(relative(path.join(folder,name)))) pictures.push(name);
  const performance=report.performance;
  let media='';
  if(movies.length) media=await video(relative(path.join(folder,movies[0])),label,pictures.length?relative(path.join(folder,pictures[0])):null);
  if(pictures.length) media+=`<details><summary>Gameplay stills · open each image at original size</summary><div class="gallery">${(await Promise.all(pictures.map(async name=>`<figure>${await image(relative(path.join(folder,name)),`${label}: ${name.replace('.png','')}`)}<figcaption>${esc(name.replace('.png',''))}</figcaption></figure>`))).join('')}</div></details>`;
  let metrics='';
  if(performance) metrics=`<p><strong>${esc(performance.duration_seconds)} wall-clock seconds</strong> · ${esc(performance.samples)} frames · p95 ${esc(performance.p95_ms)}ms · p99 ${esc(performance.p99_ms)}ms · worst ${esc(performance.worst_ms)}ms · ${Array.isArray(performance.over_33_4_ms)?performance.over_33_4_ms.length:esc(performance.over_33_4_ms)} frames over 33.4ms.</p><p>${esc(performance.conditions)}</p>`;
  captureHTML+=`<article class="capture"><h3>${esc(label)}</h3><p>${esc(manifest.method || report.kind || 'Automated capture; inspect manifest for conditions.')}</p><p class="label">Source matches this package. ${manifest.scenario==='opening'?'Generated native InputEvents; no progress injection in the opening. Movie mode is engine-time recording, not a wall-clock playtest.':performance?'Performance fixture; no human participant.':'Scripted state/interaction fixture unless its manifest explicitly states otherwise; not a natural full playthrough.'}</p>${metrics}${media}<p>${manifestLink}${await exists(relative(path.join(folder,'results.json')))?' · '+await link(relative(path.join(folder,'results.json')),'Actual result'):''}</p></article>`;
}
if(!captureHTML) captureHTML='<p>Current opening, restoration and sustained performance evidence is awaiting the final source-matched capture metadata.</p>';

let technicalHTML='';
for(const {label,file} of options.tests) {
  const report=await readJSON(file);
  const fail=Array.isArray(report.failures)?report.failures.length:'not recorded';
  const count=Array.isArray(report.checks)?report.checks.length:Array.isArray(report.cases)?report.cases.length:'see report';
  const bound=build && report.source_sha256===build.source.files['scripts/simulation.gd']?.sha256;
  technicalHTML+=`<li>${await link(file,label)} — ${esc(count)} checks/cases; ${esc(fail)} reported failures. ${bound?'Simulation source hash matches the package.':'Exact source binding is not established by this report alone.'}</li>`;
}
const history=[];
for(const [folder,title,note] of [['critic/baseline','Initial 3D baseline','Independent AI critique references this earlier experience. No human session or listening claim.'],['surface-and-spacing','Ground material and spacing pass','Historical correction capture; predates current spatial work reservations.'],['closer-camera','Earlier camera comparison','Historical camera comparison; its filename does not establish final camera acceptance.']]) {
  const base='evidence/3d/'+folder;
  if(!await exists(base+'/opening.mp4')) continue;
  history.push(`<article><h3>${esc(title)}</h3><p>${esc(note)}</p>${await video(base+'/opening.mp4',title,base+'/dirty.png')}<p>${await link(base+'/dirty.png','Dirty courtyard')} · ${await link(base+'/direction.png','Crew direction')}${await exists(base+'/capture-manifest.json')?' · '+await link(base+'/capture-manifest.json','Historical source identity'):''}</p></article>`);
}
const supporting=await Promise.all([['docs/CRITIQUE-3D-0.4.md','Independent AI baseline critique'],['docs/3D-CROWD.md','Crowd correction and remaining checks'],['docs/3D-AUDIO.md','Audio evidence and listening gaps'],['docs/3D-BUILD.md','Native build and signing limits'],['docs/SKY-DIRECTION.md','Atmosphere and presentation direction'],['docs/PLAYTEST.md','Private human-test protocol'],['docs/QUALITY-GATES.md','Human and owner gate ledger']].map(async([file,label])=>`<li>${await link(file,label)}</li>`));
const provenance={schema:1,generated:new Date().toISOString(),arguments:process.argv.slice(2),current,humanSessions:0,ownerApproved:false,status:'awaiting human validation',records:[...records.values()]};
// QUALITY-GATES is updated below, so register its final bytes instead of its old candidate block.
const updatedGates=gates.replace(marker,`<!-- 3D-REVIEW-CANDIDATE:START -->\n${candidateMarkdown}\n<!-- 3D-REVIEW-CANDIDATE:END -->`);
const gateRecord=provenance.records.find(record=>record.path==='docs/QUALITY-GATES.md');
gateRecord.bytes=Buffer.byteLength(updatedGates);gateRecord.sha256=digest(Buffer.from(updatedGates));
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dustlings · 3D courtyard review</title><style>
:root{color-scheme:light;--ink:#294e49;--paper:#f5f0e3;--line:#d4d5c3}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:17px/1.55 system-ui,-apple-system,sans-serif}main{max-width:1120px;margin:auto;padding:40px 24px 72px}h1{font-size:clamp(32px,5vw,52px);line-height:1.1;margin:12px 0 20px}h2{font-size:28px;margin:0 0 20px}h3{font-size:20px;margin:0 0 12px}p{margin:12px 0}a{color:#235d64;text-underline-offset:3px}a:focus-visible,summary:focus-visible,video:focus-visible{outline:3px solid #9a582d;outline-offset:5px}section{padding-top:40px;margin-top:24px;border-top:1px solid var(--line)}nav{display:flex;gap:12px 24px;flex-wrap:wrap;margin:24px 0}nav a{padding:8px 0}.eyebrow{font-size:14px;letter-spacing:.1em;text-transform:uppercase}.status{display:inline-block;background:#e6dbc0;padding:7px 14px;border-radius:18px;font-weight:650}.intro{max-width:760px;font-size:20px}.gates,.downloads,.history{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.downloads,.history{grid-template-columns:repeat(2,minmax(0,1fr))}article,.pending{background:#fffdf5;border:1px solid var(--line);border-radius:18px;padding:22px}.gates p{font-size:15px}.label{font-size:15px;background:#e9eee5;border-radius:8px;padding:12px}.capture{margin:18px 0}video{display:block;background:#dce5df;width:100%;aspect-ratio:16/10;border-radius:12px;margin-top:16px}.gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:18px}figure{margin:0}img{width:100%;display:block;border-radius:10px}figcaption{font-size:14px;margin-top:6px}details{margin-top:18px;padding:16px;background:#eeecdf;border-radius:12px}summary{cursor:pointer;font-weight:650}code{font-size:13px;overflow-wrap:anywhere}dt{font-weight:650}dd{margin:2px 0 16px}li{margin:10px 0}footer{font-size:14px;margin-top:40px}.history article{align-self:start}@media(max-width:720px){main{padding:28px 16px 48px}.gates,.downloads,.history,.gallery{grid-template-columns:1fr}.intro{font-size:18px}article{padding:18px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
</style></head><body><main><header><div class="eyebrow">Dustlings · native 3D courtyard</div><h1>A little dust.<br>A little life.</h1><span class="status">Awaiting human validation</span><p class="intro">Brush an abandoned miniature courtyard, watch dust become helpers, and restore its fountain. This hub presents an unfinished development candidate and the evidence behind its next review.</p><p><strong>0 human sessions. No current-build owner approval. No release claim.</strong> Steam Windows is the primary target; actual development testing is on Mac. iPad and iPhone remain later ports.</p><nav aria-label="Review sections"><a href="#play">Build</a><a href="#gameplay">Current gameplay</a><a href="#compare">Before and after</a><a href="#checks">Checks</a><a href="#human">Human review</a></nav></header><div class="gates"><article><h3>Player experience</h3><p>Unfamiliar players have not yet validated understanding, comfort, appeal or voluntary continuation.</p></article><article><h3>Presentation</h3><p>Actual 3D captures are review evidence. Benchmark quality and satisfaction require human judgment.</p></article><article><h3>Owner acceptance</h3><p>The owner has not approved this exact experience, completeness or readiness to sell.</p></article></div><section id="play"><h2>${current?'Review the native candidate':'Current build preparation'}</h2>${buildHTML}</section><section id="gameplay"><h2>Current gameplay and performance</h2>${captureHTML}</section><section id="compare"><h2>Before and after</h2><p>These earlier 3D recordings preserve the problems that motivated changes. Compare them with the source-matched current gameplay above. They are historical references, not substitute current deliverables; the old 2D prototype is not presented as the active game.</p><div class="history">${history.join('')}</div></section><section id="checks"><h2>Technical evidence</h2>${technicalHTML?`<ul>${technicalHTML}</ul>`:'<p>Final current test reports are awaiting attachment. Technical checks cannot establish enjoyment or aesthetic approval.</p>'}<details><summary>Supporting decisions and limitations</summary><ul>${supporting.join('')}</ul></details><p>All links were checked locally and their SHA-256 values are embedded in this page. Run <code>node tools/review-3d.mjs --check</code> to detect changed linked evidence or stale current source.</p></section><section id="human"><h2>What people still need to judge</h2><p>Observe whether unfamiliar players understand where helpers come from, direct them comfortably, recognize upgrade effects, enjoy the restoration and voluntarily continue. Ask what felt awkward, tiring, confusing or visually unpleasant. Review the actual screen size and sound, including a crowded crew.</p><p>Recruitment has not begun here: <strong>0 incremental-game buyers, 0 cozy/cleanup players, 0 friends/developers.</strong> The initial private round targets 12–20 unfamiliar intended players, with at least 80% reaching an upgrade without coaching and at least half continuing voluntarily. Current counts are 0/0, so no rate can be calculated. These are internal decision rules, not sales predictions.</p><p>Record who reviewed which exact build, what they experienced and any disagreements. Player enthusiasm, presentation review and the owner's explicit approval remain separate gates.</p></section><footer>Generated ${esc(provenance.generated)}. Local, offline review hub. An ended development session is not a finished game.</footer></main><script id="review-provenance" type="application/json">${JSON.stringify(provenance).replaceAll('<','\\u003c')}</script></body></html>`;
// Validate every displayed local href/src before replacing the current hub.
for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {const url=match[1];if(url.startsWith('#'))continue;const file=path.resolve(path.dirname(output),decodeURIComponent(url));if(!file.startsWith(root+path.sep) || !(await fs.stat(file)).isFile())throw Error(`Broken review link: ${url}`);}
await fs.writeFile(output,html);
await fs.writeFile(gatesPath,updatedGates);
console.log(JSON.stringify({status:'generated',current:current?.version || 'awaiting final build',linkedFiles:records.size,output:relative(output),humanSessions:0}));
