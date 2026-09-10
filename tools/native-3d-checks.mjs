#!/usr/bin/env node
// Actual packaged Mac processes, with an isolated cache profile. No ordinary save access.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exec = promisify(execFile);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const args = process.argv.slice(2);
let manifestPath, output, preflightOnly = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--manifest' && args[i + 1]) manifestPath = path.resolve(args[++i]);
  else if (args[i] === '--output' && args[i + 1]) output = path.resolve(args[++i]);
  else if (args[i] === '--preflight-only') preflightOnly = true;
  else throw new Error('Usage: node tools/native-3d-checks.mjs --manifest exact/manifest.json [--output empty/directory] [--preflight-only]');
}
if (!manifestPath) throw new Error('An explicit exact build --manifest is required; latest-build is never selected implicitly.');
output ||= path.join(root, 'evidence/3d/native-packaged', new Date().toISOString().replace(/[:.]/g, '-'));
await fs.mkdir(output, { recursive: true });
if ((await fs.readdir(output)).length) throw new Error(`Output must be empty to prevent mixed evidence: ${output}`);
const active = new Set();
let interrupted = '';
const report = {
  schema: 1, kind: preflightOnly ? 'packaged-mac-preflight-only' : 'packaged-mac-isolated-process-recovery',
  started: new Date().toISOString(), manifest: manifestPath, output,
  method: 'Release Mac app extracted from the exact verified archive; separate OS processes, real-time engine-generated InputEvents. No Movie Maker, editor, progress injection, physical input or human playtest.',
  conditions: { platform: process.platform, architecture: process.arch, osRelease: os.release(), movieMaker: false },
  humanTests: 0, ownerApproved: false, releaseReady: false, windowsExecution: 'unrun',
  checks: {}, processes: [], failures: [], limitations: ['This small opening save does not test a full crew or an active chorus return.', 'No physical sleep/interruption or native import/export file dialog interaction.', 'No sustained performance or human usability claim.'],
  exitCode: 1
};
function check(name, ok, detail) {
  report.checks[name] = { passed: Boolean(ok), ...(detail === undefined ? {} : { detail }) };
  if (!ok) throw new Error(name + (detail === undefined ? '' : ': ' + (typeof detail === 'string' ? detail : JSON.stringify(detail))));
}
async function fileInfo(file) {
  const bytes = await fs.readFile(file);
  return { bytes: bytes.length, sha256: hash(bytes) };
}
async function verifyFile(name, file, expected) {
  const actual = await fileInfo(file);
  check(name, actual.sha256 === expected?.sha256 && actual.bytes === expected?.bytes, { file, expected, actual });
  return actual;
}
function contained(base, relative) {
  if (typeof relative !== 'string' || path.isAbsolute(relative)) throw new Error('Expected a relative manifest path');
  const absolute = path.resolve(base, relative);
  if (!absolute.startsWith(path.resolve(base) + path.sep)) throw new Error('Manifest path escapes its containing directory');
  return absolute;
}
// JSON numbers already normalize int/float types. Permit only floating point round-trip noise;
// compare every key and array entry, including dust, positions, counters and preferences.
function differences(a, b, at = '$', out = []) {
  if (out.length >= 12) return out;
  if (typeof a === 'number' && typeof b === 'number') {
    if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a - b) > 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))) out.push({ path: at, expected: a, actual: b });
  } else if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(key in a) || !(key in b)) out.push({ path: `${at}.${key}`, missing: key in a ? 'actual' : 'expected' });
      else differences(a[key], b[key], `${at}.${key}`, out);
      if (out.length >= 12) break;
    }
  } else if (a !== b) out.push({ path: at, expected: a, actual: b });
  return out;
}
async function readJSON(file) { return JSON.parse(await fs.readFile(file, 'utf8')); }
function windowsIconResources(pe, ico) {
  const header = pe.readUInt32LE(60), optional = header + 24;
  if (pe.toString('ascii', 0, 2) !== 'MZ' || pe.toString('ascii', header, header + 4) !== 'PE\0\0' || pe.readUInt16LE(header + 4) !== 0x8664 || pe.readUInt16LE(optional) !== 0x20b) throw new Error('Expected Windows x64 PE32+');
  if (ico.readUInt16LE(0) !== 0 || ico.readUInt16LE(2) !== 1) throw new Error('Invalid authored ICO header');
  const count = pe.readUInt16LE(header + 6), optionalBytes = pe.readUInt16LE(header + 20);
  if (count < 1 || count > 96) throw new Error('Invalid PE section count');
  const sections = Array.from({ length: count }, (_, i) => {
    const entry = optional + optionalBytes + i * 40;
    return { rva: pe.readUInt32LE(entry + 12), bytes: pe.readUInt32LE(entry + 16), offset: pe.readUInt32LE(entry + 20) };
  });
  function offset(rva, bytes = 1) {
    const section = sections.find(item => rva >= item.rva && rva + bytes <= item.rva + item.bytes);
    if (!section || section.offset + rva - section.rva + bytes > pe.length) throw new Error('PE resource points outside file bytes');
    return section.offset + rva - section.rva;
  }
  const base = offset(pe.readUInt32LE(optional + 112 + 16)), resources = [];
  function visit(relative, ids = []) {
    if (ids.length > 3) throw new Error('Unexpectedly deep PE resource directory');
    const directory = base + relative, entries = pe.readUInt16LE(directory + 12) + pe.readUInt16LE(directory + 14);
    if (entries > 512) throw new Error('Unexpected PE resource count');
    for (let i = 0; i < entries; i++) {
      const entry = directory + 16 + i * 8, name = pe.readUInt32LE(entry), child = pe.readUInt32LE(entry + 4), next = [...ids, name];
      if (child & 0x80000000) visit(child & 0x7fffffff, next);
      else {
        const leaf = base + child, size = pe.readUInt32LE(leaf + 4), start = offset(pe.readUInt32LE(leaf), size);
        resources.push({ ids: next, data: pe.subarray(start, start + size) });
      }
    }
  }
  visit(0);
  const expected = Array.from({ length: ico.readUInt16LE(4) }, (_, i) => {
    const entry = 6 + i * 16, bytes = ico.readUInt32LE(entry + 8), start = ico.readUInt32LE(entry + 12);
    if (start + bytes > ico.length) throw new Error('ICO frame exceeds file');
    return { width: ico[entry] || 256, height: ico[entry + 1] || 256, bytes, sha256: hash(ico.subarray(start, start + bytes)) };
  });
  const icons = resources.filter(item => item.ids[0] === 3).map(item => ({ ids: item.ids, bytes: item.data.length, sha256: hash(item.data) }));
  const groups = resources.filter(item => item.ids[0] === 14).map(item => {
    const frames = Array.from({ length: item.data.readUInt16LE(4) }, (_, i) => {
      const entry = 6 + i * 14;
      return { width: item.data[entry] || 256, height: item.data[entry + 1] || 256, bytes: item.data.readUInt32LE(entry + 8), iconId: item.data.readUInt16LE(entry + 12) };
    });
    return { ids: item.ids, frames };
  });
  const matchingGroup = groups.some(group => group.frames.length === expected.length && group.frames.every((frame, i) => frame.width === expected[i].width && frame.height === expected[i].height && frame.bytes === expected[i].bytes && icons.some(icon => icon.ids[1] === frame.iconId && icon.ids[2] === group.ids[2] && icon.sha256 === expected[i].sha256)));
  return { passed: expected.length > 0 && matchingGroup, expected, icons, groups, method: 'Read actual PE RT_ICON and RT_GROUP_ICON bytes and compare every authored ICO frame and group reference; Windows was not executed.' };
}
async function terminate(handle) {
  if (handle.closed) return;
  handle.child.kill('SIGTERM');
  await Promise.race([handle.done, delay(2000)]);
  if (!handle.closed) handle.child.kill('SIGKILL');
  await handle.done;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  interrupted = signal;
  for (const handle of active) handle.child.kill('SIGTERM');
});
function launch(executable, qaCase, profile) {
  if (interrupted) throw new Error(`Interrupted by ${interrupted}`);
  const dir = path.join(output, qaCase);
  const argv = ['--', '--qa', `--qa-profile=${profile}`, `--qa-case=${qaCase}`, `--evidence=${dir}`];
  const child = spawn(executable, argv, { cwd: path.dirname(executable), stdio: ['ignore', 'pipe', 'pipe'] });
  const entry = { case: qaCase, executable, args: argv, pid: child.pid, started: new Date().toISOString() };
  report.processes.push(entry);
  const handle = { child, entry, dir, closed: false };
  active.add(handle);
  let stdout = '', stderr = '', spawnError = '';
  child.stdout.on('data', chunk => { stdout += chunk.toString(); });
  child.stderr.on('data', chunk => { stderr += chunk.toString(); });
  child.on('error', error => { spawnError = error.message; });
  const timer = setTimeout(() => { entry.timedOut = true; void terminate(handle); }, qaCase === 'opening' ? 150000 : 45000);
  handle.done = new Promise(resolve => child.on('close', (exitCode, signal) => {
    clearTimeout(timer);
    handle.closed = true;
    active.delete(handle);
    Object.assign(entry, { finished: new Date().toISOString(), exitCode, signal, spawnError, diagnostics: (stdout + stderr).split('\n').filter(line => /SCRIPT ERROR:|ERROR:|WARNING:|leaked|still in use at exit/i.test(line)) });
    resolve({ stdout, stderr });
  })).then(async logs => {
    await fs.writeFile(path.join(dir, 'stdout.log'), logs.stdout);
    await fs.writeFile(path.join(dir, 'stderr.log'), logs.stderr);
    return entry;
  });
  return handle;
}
async function completed(handle) {
  const entry = await handle.done;
  check(`${entry.case}ProcessExit`, entry.exitCode === 0 && !entry.spawnError && !entry.timedOut && !interrupted, entry);
  check(`${entry.case}EngineDiagnostics`, entry.diagnostics.length === 0, entry.diagnostics);
  const result = await readJSON(path.join(handle.dir, 'results.json'));
  check(`${entry.case}Recorded`, result.case === entry.case && result.status === 'recorded');
  return result;
}
async function waitReady(handle) {
  const end = Date.now() + 15000;
  while (Date.now() < end && !handle.closed && !interrupted) {
    try { return await readJSON(path.join(handle.dir, 'ready.json')); }
    catch (error) { if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error; }
    await delay(100);
  }
  throw new Error('Primary hold process did not become ready within 15 seconds');
}
async function saveFamily(savePath) {
  const result = {};
  for (const suffix of ['', '.new', '.backup', '.backup.new']) {
    try { result[suffix || 'primary'] = await fileInfo(savePath + suffix); }
    catch (error) { if (error.code !== 'ENOENT') throw error; result[suffix || 'primary'] = null; }
  }
  return result;
}
try {
  check('macHost', process.platform === 'darwin', process.platform);
  const [model, macOSVersion] = await Promise.all([
    exec('/usr/sbin/sysctl', ['-n', 'hw.model']),
    exec('/usr/bin/sw_vers', ['-productVersion'])
  ]);
  Object.assign(report.conditions, { model: model.stdout.trim(), macOSVersion: macOSVersion.stdout.trim(), memoryBytes: os.totalmem() });
  const manifestBytes = await fs.readFile(manifestPath);
  const manifest = JSON.parse(manifestBytes);
  report.manifestSha256 = hash(manifestBytes);
  report.sourceSha256 = manifest.source?.sha256;
  report.sourceRevision = manifest.source?.revision;
  report.sourceDirty = manifest.source?.dirty;
  report.sourceChangedSinceSnapshot = manifest.source?.changedSinceSnapshot;
  report.version = manifest.version;
  check('successfulNativeBuildManifest', manifest.kind === 'godot-native-development-integration-candidate' && manifest.checks?.complete === true && Array.isArray(manifest.errors) && !manifest.errors.length && /^[a-f0-9]{64}$/.test(manifest.source?.sha256));
  const archive = contained(path.dirname(manifestPath), manifest.macOS.path);
  await verifyFile('archiveHash', archive, manifest.macOS.archive);
  const extraction = await fs.mkdtemp(path.join(os.tmpdir(), 'dustlings-packaged-check-'));
  report.extraction = extraction;
  await exec('/usr/bin/ditto', ['-x', '-k', archive, extraction]);
  const apps = (await fs.readdir(extraction)).filter(file => file.endsWith('.app'));
  check('singlePackagedApp', apps.length === 1, apps);
  const app = path.join(extraction, apps[0]);
  const plistFile = path.join(app, 'Contents/Info.plist');
  await verifyFile('bundleMetadataHash', plistFile, manifest.macOS.files['Contents/Info.plist']);
  const plist = JSON.parse((await exec('/usr/bin/plutil', ['-convert', 'json', '-o', '-', plistFile])).stdout);
  check('bundleIdentity', plist.CFBundleIdentifier === manifest.macOS.bundleIdentifier && plist.CFBundleVersion === manifest.macOS.bundleVersion, plist);
  check('safeExecutableName', typeof plist.CFBundleExecutable === 'string' && path.basename(plist.CFBundleExecutable) === plist.CFBundleExecutable);
  const executable = path.join(app, 'Contents/MacOS', plist.CFBundleExecutable);
  report.executableSha256 = (await verifyFile('executableHash', executable, manifest.macOS.executable)).sha256;
  const pcks = Object.keys(manifest.macOS.files).filter(file => file.endsWith('.pck'));
  check('singlePackagedPck', pcks.length === 1, pcks);
  report.pckSha256 = (await verifyFile('pckHash', contained(app, pcks[0]), manifest.macOS.pck)).sha256;
  await exec('/usr/bin/codesign', ['--verify', '--deep', '--strict', '--verbose=2', app]);
  check('macSignature', true, 'Verified exact extracted app; development ad-hoc signing, no notarization or release approval.');
  const iconName = plist.CFBundleIconFile;
  if (typeof iconName === 'string' && iconName && path.basename(iconName) === iconName) {
    const iconRelative = 'Contents/Resources/' + iconName + (path.extname(iconName) ? '' : '.icns');
    const icon = await verifyFile('packagedIconHash', path.join(app, iconRelative), manifest.macOS.files[iconRelative]);
    const header = await fs.readFile(path.join(app, iconRelative));
    check('packagedMacIcon', header.toString('ascii', 0, 4) === 'icns' && header.readUInt32BE(4) === icon.bytes, { iconRelative, ...icon, interpretation: 'Actual bundle resource and plist linkage; no aesthetic or Dock inspection claim.' });
    check('packagedMacIconMatchesAuthoredSource', icon.sha256 === manifest.source.files['assets/ui/app-icon.icns']?.sha256);
  } else check('packagedMacIcon', false, 'No safe CFBundleIconFile in exported app');
  const windowsExe = contained(path.dirname(manifestPath), manifest.windows.path);
  report.windowsExecutableSha256 = (await verifyFile('windowsExecutableHash', windowsExe, manifest.windows.executable)).sha256;
  const authoredIco = contained(path.dirname(manifestPath), manifest.snapshot + '/assets/ui/app-icon.ico');
  await verifyFile('authoredWindowsIconHash', authoredIco, manifest.source.files['assets/ui/app-icon.ico']);
  check('packagedWindowsIcon', (report.windowsIcon = windowsIconResources(await fs.readFile(windowsExe), await fs.readFile(authoredIco))).passed, report.windowsIcon);
  if (!preflightOnly) {
    const profile = 'native3d_' + crypto.randomUUID().replaceAll('-', '');
    const savePath = path.join(os.homedir(), 'Library/Caches', `dustlings-qa-${profile}.json`);
    report.profile = { token: profile, path: savePath, retainedForInspection: true };
    check('uniqueIsolatedProfile', Object.values(await saveFamily(savePath)).every(value => value === null));
    for (const qaCase of ['opening', 'resume', 'hold', 'second']) await fs.mkdir(path.join(output, qaCase));
    const opening = await completed(launch(executable, 'opening', profile));
    Object.assign(report.conditions, { engine: opening.engine, logicalViewport: opening.viewport, graphicsDevice: (await fs.readFile(path.join(output, 'opening/stdout.log'), 'utf8')).split('\n').find(line => /Using Device|OpenGL API/.test(line)) || 'not reported' });
    check('openingProfilePath', opening.isolated_save_path === savePath);
    check('openingSaved', opening.instance_primary === true && opening.save_problem === '' && opening.saved_payload?.game && opening.saved_payload?.settings);
    check('openingPlay', opening.first_helper_at >= 0 && opening.first_helper_at <= 30 && opening.opening_crew >= 2 && opening.upgrade_bought === true && opening.crew_directed === true, { firstHelper: opening.first_helper_at, crew: opening.opening_crew, upgradeBought: opening.upgrade_bought, directed: opening.crew_directed });
    check('openingPreferenceControls', opening.nondefault_preferences === true, opening.nondefault_preferences);
    const disk = await readJSON(savePath);
    check('diskProgressMatchesOpening', !differences(opening.saved_payload, { game: disk.game, settings: disk.settings }).length, differences(opening.saved_payload, { game: disk.game, settings: disk.settings }));
    report.openingSave = await fileInfo(savePath);
    const resume = await completed(launch(executable, 'resume', profile));
    check('resumeProfilePath', resume.isolated_save_path === savePath);
    const changed = differences(opening.saved_payload, resume.loaded_payload);
    check('allPersistedFieldsRestored', !changed.length, { numericTolerance: '1e-9 × max(1, absolute values); all keys and array entries compared', differences: changed });
    check('resumeWaitsAndReturns', resume.resume_waits_for_player === true && resume.return_clicked === true && resume.resumed === true && resume.instance_primary === true && resume.save_problem === '');
    check('nondefaultPreferencesRetained', Math.abs(opening.saved_payload.settings.music - 0.25) < 1e-9 && opening.saved_payload.settings.gentle === true, opening.saved_payload.settings);
    const before = await saveFamily(savePath);
    const primary = launch(executable, 'hold', profile);
    const ready = await waitReady(primary);
    check('primaryHoldsProfile', ready.pid === primary.child.pid && ready.instance_primary === true && ready.path === savePath, ready);
    const second = await completed(launch(executable, 'second', profile));
    check('secondLaunchBlocked', second.instance_primary === false && second.second_launch_blocked === true && second.isolated_save_path === savePath);
    const afterSecond = await saveFamily(savePath);
    check('secondLeavesAllSaveBytesUnchanged', !differences(before, afterSecond).length, { before, after: afterSecond });
    await fs.writeFile(path.join(primary.dir, 'finish'), 'Runner finished the second-instance check.\n');
    const held = await completed(primary);
    check('primaryRetainsLockUntilFinished', held.instance_primary === true && held.isolated_save_path === savePath);
    const after = await saveFamily(savePath);
    check('welcomeExitLeavesSaveBytesUnchanged', !differences(before, after).length, { before, after });
    check('nativeCasesPassed', true, 'Opening → fresh process restore → simultaneous hold and blocked second process; all owned app processes closed.');
  } else report.limitations.push('Preflight only: no game process was launched and no recovery test passed.');
  report.exitCode = 0;
} catch (error) {
  report.failures.push(error.stack || error.message);
  console.error(error.message);
} finally {
  await Promise.allSettled([...active].map(terminate));
  report.finished = new Date().toISOString();
  report.interrupted = interrupted || null;
  await fs.writeFile(path.join(output, 'report.json'), json(report));
  console.log(json({ report: path.join(output, 'report.json'), exitCode: report.exitCode, pckSha256: report.pckSha256, executableSha256: report.executableSha256, checksPassed: Object.values(report.checks).filter(value => value.passed).length, profile: report.profile }));
  process.exitCode = report.exitCode;
}
