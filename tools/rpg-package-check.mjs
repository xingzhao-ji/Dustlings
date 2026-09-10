#!/usr/bin/env node
// Verify an explicit immutable RPG export, then run separate real Mac processes.
// Never reads/writes the ordinary player profile. No Windows execution.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn, execFile } from 'node:child_process';
import { promisify, isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exec = promisify(execFile);
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const json = v => JSON.stringify(v, null, 2) + '\n';
const argv = process.argv.slice(2), options = {};
for (const arg of argv) {
  if (arg === '--preflight-only') options.preflight = true;
  else if (/^--(build|save|output)=.+/.test(arg)) {
    const at = arg.indexOf('=');
    const key = arg.slice(2, at);
    if (options[key]) throw Error(`Duplicate --${key}`);
    options[key] = path.resolve(arg.slice(at + 1));
  } else throw Error('Usage: node tools/rpg-package-check.mjs --build=exact/manifest.json --output=new/directory [--save=route/isolated-save.json] [--preflight-only]');
}
if (!options.build || !options.output) throw Error('Explicit --build and new --output are required. No implicit latest build selection.');
const output = options.output;
try { await fs.access(output); throw Error('Output already exists; use a new directory to preserve evidence.'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
await fs.mkdir(output, {recursive: true});
const report = {
  schema: 1, kind: options.preflight ? 'rpg-packaged-mac-preflight' : 'rpg-packaged-mac-smoke-resume-recovery',
  started: new Date().toISOString(), build: options.build, output,
  method: 'Exact Mac archive extraction and executable; separate real-time native OS processes using shipped rpg_qa InputEvents. Fresh opening, copied save resume, and a controlled corrupt-primary/valid-backup recovery fixture. No MovieMaker or editor gameplay.',
  conditions: {platform: process.platform, architecture: process.arch, osRelease: os.release(), memoryBytes: os.totalmem()},
  humanTests: 0, ownerApproved: false, releaseReady: false, windowsExecution: 'unrun',
  limitations: ['Generated inputs do not establish physical control comfort, human enjoyment or audio audition.', 'QA mode bypasses the ordinary single-instance lock; this runner does not test that lock.', 'Resume and corrupt-primary recovery use explicitly copied isolated saves, not ordinary player data.', 'Short process checks are not sustained performance measurements.'],
  checks: [], processes: [], failures: [], ok: false
};
let current;
let interrupted = '';
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  interrupted = signal;
  if (current) current.kill('SIGTERM');
});
function check(name, passed, detail) {
  report.checks.push({name, passed: Boolean(passed), ...(detail === undefined ? {} : {detail})});
  if (!passed) throw Error(name + (detail === undefined ? '' : ': ' + JSON.stringify(detail)));
}
function contained(base, relative) {
  if (typeof relative !== 'string' || path.isAbsolute(relative)) throw Error('Expected a relative manifest path');
  const absolute = path.resolve(base, relative);
  if (!absolute.startsWith(path.resolve(base) + path.sep)) throw Error('Manifest path escapes its directory');
  return absolute;
}
async function info(file) {
  const st = await fs.lstat(file);
  if (!st.isFile() || st.isSymbolicLink()) throw Error(`Expected regular file: ${file}`);
  const bytes = await fs.readFile(file);
  return {bytes: bytes.length, sha256: hash(bytes)};
}
async function verify(name, file, expected) {
  const actual = await info(file);
  check(name, actual.bytes === expected?.bytes && actual.sha256 === expected?.sha256, {file, expected, actual});
  return actual;
}
async function read(file) { return JSON.parse(await fs.readFile(file, 'utf8')); }
async function exists(file) { try { await fs.access(file); return true; } catch (e) { if (e.code !== 'ENOENT') throw e; return false; } }
async function screenshot(dir, name) {
  const file = path.join(dir, name + '.png'), bytes = await fs.readFile(file);
  check(`${name}PNG`, bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && bytes.readUInt32BE(16) >= 960 && bytes.readUInt32BE(20) >= 600,
    {file, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), bytes: bytes.length, sha256: hash(bytes)});
}
async function launch(executable, label, qaCase) {
  if (interrupted) throw Error(`Interrupted: ${interrupted}`);
  const dir = path.join(output, label);
  await fs.mkdir(dir, {recursive:true});
  const args = ['--resolution', '1280x800', '--', '--rpg-qa', `--rpg-case=${qaCase}`, `--evidence=${dir}`];
  const record = {label, qaCase, executable, args, started: new Date().toISOString()};
  report.processes.push(record);
  let stdout = '', stderr = '', spawnError;
  const child = spawn(executable, args, {cwd: path.dirname(executable), stdio:['ignore','pipe','pipe']});
  current = child;
  record.pid = child.pid;
  child.stdout.on('data', b => { stdout += b.toString(); });
  child.stderr.on('data', b => { stderr += b.toString(); });
  child.on('error', error => { spawnError = error.message; });
  let killTimer;
  const timer = setTimeout(() => {
    record.timedOut = true;
    child.kill('SIGTERM');
    killTimer = setTimeout(() => child.kill('SIGKILL'), 3000);
  }, 90000);
  await new Promise(resolve => child.on('close', (exitCode, signal) => {
    clearTimeout(timer); clearTimeout(killTimer); current = undefined;
    Object.assign(record, {finished:new Date().toISOString(), exitCode, signal, spawnError});
    resolve();
  }));
  await fs.writeFile(path.join(dir, 'stdout.log'), stdout);
  await fs.writeFile(path.join(dir, 'stderr.log'), stderr);
  record.diagnostics = (stdout + '\n' + stderr).split('\n').filter(line => /SCRIPT ERROR:|ERROR:|WARNING:|leaked|still in use at exit/i.test(line));
  record.graphics = stdout.split('\n').find(line => /Using Device|OpenGL API/.test(line)) || 'not reported';
  check(`${label}Process`, record.exitCode === 0 && !record.signal && !record.timedOut && !record.spawnError && !interrupted, record);
  check(`${label}Diagnostics`, record.diagnostics.length === 0, record.diagnostics);
  const resultPath = path.join(dir, 'results.json');
  const result = await read(resultPath);
  record.result = await info(resultPath);
  check(`${label}GeneratedRoute`, result.ok === true && Array.isArray(result.checks) && result.checks.length > 0 && result.checks.every(c => c.ok === true), result.checks);
  check(`${label}NoHumanClaim`, result.humanTests === 0, result.humanTests);
  return {result, dir, save: await read(path.join(dir, 'isolated-save.json'))};
}
function compareSave(label, expected, actual, result) {
  for (const key of ['game', 'settings', 'patches']) check(`${label}:${key}`, isDeepStrictEqual(actual[key], expected[key]), {expected:expected[key], actual:actual[key]});
  check(`${label}:sceneStory`, isDeepStrictEqual(result.story, expected.game));
  check(`${label}:scenePatches`, isDeepStrictEqual(result.patches, expected.patches));
  const maxDistance = .035;
  for (const [key, position] of [['diskPosition', actual.position], ['scenePosition', result.position]]) {
    const difference = Array.isArray(position) && position.length === 3 ? Math.hypot(...position.map((v,i) => v-expected.position[i])) : Infinity;
    check(`${label}:${key}`, difference <= maxDistance, {expected:expected.position, actual:position, difference, maxDistance, reason:'Allows small grounded physics settling; no movement inputs in resume route.'});
  }
}
try {
  check('macHost', process.platform === 'darwin');
  const [model, system] = await Promise.all([exec('/usr/sbin/sysctl',['-n','hw.model']), exec('/usr/bin/sw_vers',['-productVersion'])]);
  report.conditions.model = model.stdout.trim(); report.conditions.macOSVersion = system.stdout.trim();
  const manifestBytes = await fs.readFile(options.build), manifest = JSON.parse(manifestBytes), base = path.dirname(options.build);
  report.manifest = {sha256: hash(manifestBytes), bytes: manifestBytes.length, source: manifest.source, version:manifest.version};
  check('completeUnchangedBuild', manifest.kind === 'godot-native-development-integration-candidate' && manifest.checks?.complete === true && Array.isArray(manifest.errors) && !manifest.errors.length && manifest.source?.changedSinceSnapshot === false);
  check('cleanRuntimeSnapshot', manifest.source?.dirty === false, manifest.source?.status);
  check('sourceInventoryHash', hash(json(manifest.source.files)) === manifest.source.sha256);
  const snapshot = contained(base, manifest.snapshot);
  const runtime = Object.entries(manifest.source.files).filter(([name]) => /\.(gd|gdshader|tscn)$/.test(name) && !name.startsWith('tests/') || name === 'project.godot');
  check('rpgSourcesPresent', ['scripts/rpg_main.gd','scripts/rpg_story.gd','scripts/rpg_environment.gd','scripts/rpg_actor.gd','scripts/rpg_qa.gd','scripts/rpg_save.gd'].every(name => runtime.some(([file]) => file === name)));
  for (const [name, expected] of runtime) await verify(`snapshot:${name}`, contained(snapshot,name),expected);
  const project = await fs.readFile(path.join(snapshot,'project.godot'),'utf8');
  check('rpgEntrypoint', /^run\/main_scene="res:\/\/scenes\/neighborhood\.tscn"$/m.test(project));
  for (const platform of ['macos','windows']) check(`${platform}PackedSourceProof`, manifest.checks[platform+'PackSources']?.checked === runtime.filter(([name]) => /\.(gd|gdshader)$/.test(name)).length && manifest.checks[platform+'PackSources']?.failures?.length === 0, manifest.checks[platform+'PackSources']);
  const archive = contained(base,manifest.macOS.path);
  report.macArchive = await verify('macArchive',archive,manifest.macOS.archive);
  const extraction = await fs.mkdtemp(path.join(os.tmpdir(),'dustlings-rpg-package-'));
  report.extraction = extraction;
  await exec('/usr/bin/ditto',['-x','-k',archive,extraction]);
  const apps = (await fs.readdir(extraction)).filter(name=>name.endsWith('.app'));
  check('singleMacApp', apps.length === 1, apps);
  const app = path.join(extraction,apps[0]);
  for (const [name, expected] of Object.entries(manifest.macOS.files)) await verify(`bundle:${name}`,contained(app,name),expected);
  const plist = JSON.parse((await exec('/usr/bin/plutil',['-convert','json','-o','-',path.join(app,'Contents/Info.plist')])).stdout);
  check('safeExecutable', typeof plist.CFBundleExecutable === 'string' && path.basename(plist.CFBundleExecutable) === plist.CFBundleExecutable);
  check('bundleIdentity', plist.CFBundleIdentifier === manifest.macOS.bundleIdentifier && plist.CFBundleVersion === manifest.macOS.bundleVersion);
  const executable = path.join(app,'Contents/MacOS',plist.CFBundleExecutable);
  report.executable = {path:executable,...await verify('macExecutable',executable,manifest.macOS.executable)};
  const pcks=Object.keys(manifest.macOS.files).filter(name=>name.endsWith('.pck'));
  check('singleMacPck',pcks.length===1,pcks);
  report.pck=await verify('macPck',contained(app,pcks[0]),manifest.macOS.pck);
  const signature=await exec('/usr/bin/codesign',['--verify','--deep','--strict','--verbose=2',app]);
  check('signatureVerified',true,{output:signature.stdout+signature.stderr,limit:'Development ad-hoc signature; unnotarized.'});
  check('completeNoticeBundle', Object.keys(manifest.notices?.files || {}).length === 4);
  for (const [name, expected] of Object.entries(manifest.notices?.files || {})) await verify(`notice:${name}`,contained(extraction,name),expected);
  for (const [name,expected] of Object.entries(manifest.windows.files)) await verify(`windows:${name}`,contained(path.dirname(contained(base,manifest.windows.path)),name),expected);
  check('windowsPckIdentity',manifest.windows.files['Dustlings.pck']?.sha256===manifest.windows.pck.sha256);
  check('windowsExeIdentity',manifest.windows.files['Dustlings.exe']?.sha256===manifest.windows.executable.sha256);
  const companionPath=path.join(base,'windows-review-package.json');
  if (await exists(companionPath)) {
    const companion=await read(companionPath);
    check('windowsZipBoundToManifest',companion.manifest?.sha256===hash(manifestBytes)&&companion.manifest?.sourceHash===manifest.source.sha256);
    report.windowsArchive=await verify('windowsArchive',contained(base,companion.archive.file),companion.archive);
  } else report.windowsArchive='No companion ZIP present; EXE/PCK files verified without Windows execution.';
  if (!options.preflight) {
    const fresh=await launch(executable,'fresh','overview');
    await screenshot(fresh.dir,'welcome'); await screenshot(fresh.dir,'arrival');
    check('freshEmptyStory',Object.keys(fresh.result.story.flags).length===0&&fresh.result.companions===0);
    check('freshDustIntact',fresh.result.patches.lantern===1&&fresh.result.patches.bridge===1);
    const input=options.save || path.join(fresh.dir,'isolated-save.json');
    const inputBytes=await fs.readFile(input), expected=JSON.parse(inputBytes);
    report.resumeInput={file:input,bytes:inputBytes.length,sha256:hash(inputBytes),kind:options.save?'Explicit copied save fixture':'Fresh overview save; no completed-story recovery claim'};
    if (await exists(path.join(path.dirname(input),'capture-manifest.json'))) {
      const capture=await read(path.join(path.dirname(input),'capture-manifest.json'));
      report.resumeInput.capture={sourceHash:capture.sourceHash,status:capture.status,scenario:capture.scenario,runtimeMatchesBuild:runtime.every(([name,item])=>capture.files?.[name]===item.sha256)};
    }
    for (const label of ['resume','recovery']) {
      const dir=path.join(output,label);
      await fs.mkdir(dir);
      const primary=path.join(dir,'isolated-save.json');
      if (label==='resume') await fs.writeFile(primary,inputBytes,{flag:'wx'});
      else {
        await fs.writeFile(primary+'.backup',inputBytes,{flag:'wx'});
        await fs.writeFile(primary,'{"controlled_corrupt_primary":',{flag:'wx'});
      }
      const result=await launch(executable,label,'resume');
      await screenshot(dir,'resumed');
      compareSave(label,expected,result.save,result.result);
      if (label==='recovery') {
        const preserved=(await fs.readdir(dir)).filter(name=>name.startsWith('isolated-save.json.unreadable-'));
        check('corruptPrimaryPreserved',preserved.length>=1&&await Promise.all(preserved.map(name=>fs.readFile(path.join(dir,name),'utf8'))).then(values=>values.includes('{"controlled_corrupt_primary":')),preserved);
      }
    }
    await verify('inputSaveUnchanged',input,report.resumeInput);
    await verify('executedBinaryUnchanged',executable,report.executable);
    await verify('executedPckUnchanged',contained(app,pcks[0]),report.pck);
  }
  await verify('buildManifestUnchanged',options.build,{bytes:manifestBytes.length,sha256:hash(manifestBytes)});
  await verify('archiveUnchanged',archive,report.macArchive);
  report.ok=true;
} catch (error) {
  report.failures.push(error.stack || String(error));
  process.exitCode=1;
} finally {
  if (current) current.kill('SIGTERM');
  report.finished=new Date().toISOString();
  await fs.writeFile(path.join(output,'report.json'),json(report));
  console.log(json({output,ok:report.ok,checks:report.checks.length,passed:report.checks.filter(c=>c.passed).length,processes:report.processes.length,failures:report.failures}));
}
