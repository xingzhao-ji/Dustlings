#!/usr/bin/env node
// Package an immutable Godot Windows review export. Requires Python 3 stdlib only.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';

const args = process.argv.slice(2);
const verifyOnly = args.includes('--verify-only');
const inputs = args.filter(arg => arg !== '--verify-only');
if (inputs.length !== 1 || inputs[0].startsWith('--')) throw Error('Usage: node tools/package-windows-review.mjs manifest.json [--verify-only]');
const manifestPath = path.resolve(inputs[0]);
const folder = path.dirname(manifestPath);
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const original = await fs.readFile(manifestPath);
const manifest = JSON.parse(original);
const validHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const validRecord = value => validHash(value?.sha256) && Number.isSafeInteger(value.bytes) && value.bytes > 0;
const hasNotices = Object.hasOwn(manifest, 'notices');
if (manifest.kind !== 'godot-native-development-integration-candidate' || !manifest.checks?.complete || manifest.errors?.length || manifest.source?.changedSinceSnapshot !== false || !validHash(manifest.source?.sha256)) throw Error('Manifest must identify a complete, unchanged native development export');
if (!/^[\w.+-]{1,64}$/.test(manifest.version) || manifest.windows?.path !== 'Windows/Dustlings.exe') throw Error('Unexpected Windows export identity');
if (JSON.stringify(Object.keys(manifest.windows.files || {}).sort()) !== JSON.stringify(['Dustlings.exe', 'Dustlings.pck'])) throw Error('Expected exactly the authored EXE and adjacent PCK in Windows manifest');
const archiveFile = 'Windows/Dustlings-Windows.zip';
const companionFile = 'windows-review-package.json';
const destination = path.join(folder, archiveFile);
const companionPath = path.join(folder, companionFile);
const entries = [];
for (const [file, alternate] of [['Dustlings.exe', 'executable'], ['Dustlings.pck', 'pck']]) {
  const expected = manifest.windows.files[file];
  if (!validHash(expected?.sha256) || !Number.isSafeInteger(expected.bytes) || expected.bytes <= 0 || expected.sha256 !== manifest.windows[alternate]?.sha256 || expected.bytes !== manifest.windows[alternate]?.bytes) throw Error(`Inconsistent manifest record: ${file}`);
  const source = `Windows/${file}`;
  const info = await fs.lstat(path.join(folder, source));
  if (!info.isFile() || info.isSymbolicLink()) throw Error(`Expected a regular authored file: ${source}`);
  const bytes = await fs.readFile(path.join(folder, source));
  if (bytes.length !== expected.bytes || digest(bytes) !== expected.sha256) throw Error(`Export hash mismatch: ${source}`);
  entries.push({ file, source, bytes: bytes.length, sha256: digest(bytes) });
}
const readme = Buffer.from(`Dustlings - courtyard development review\r\nVersion ${manifest.version}\r\n\r\nExtract the entire ZIP to one folder, then open Dustlings.exe.\r\nKeep Dustlings.exe and Dustlings.pck together. No installer is required.\r\n\r\nBrush: hold the left mouse button and sweep over dusty paving.\r\nB: Brush mode. D: Direct mode, then choose open paving for your crew.\r\nU: Discoveries/upgrades. N: find remaining dust.\r\nArrow keys: aim. Hold Space: brush. Enter: direct at the aimed point.\r\nMouse wheel or +/-: zoom. Right/middle drag: move the camera.\r\nHome or Frame: frame the courtyard. Esc: settings/pause or return.\r\nSettings includes sound levels, gentle motion and save-copy controls.\r\n\r\nThis is a work-in-progress single-player courtyard review, not a finished\r\ncommercial release. The village's later zones are not included.\r\nArchive verification does not establish Windows execution, performance,\r\nplayer satisfaction, owner acceptance or store readiness.\r\n\r\nFrozen source SHA-256: ${manifest.source.sha256}\r\n`, 'utf8');
entries.push({ file: 'README.txt', bytes: readme.length, sha256: digest(readme) });
let verifyNoticeArchive;
if (hasNotices) {
  const bundle = manifest.notices;
  const names = ['GODOT_LICENSE.txt', 'GODOT_COPYRIGHT.txt', 'THIRD-PARTY-NOTICES.txt', 'notice-manifest.json'];
  const expectedNames = names.map(name => `Notices/${name}`);
  const provenance = bundle?.sourceProvenance;
  const toolchain = manifest.toolchain;
  if (bundle?.schema !== 1 || !/^[a-f0-9]{40}$/.test(bundle?.engineHash || '') || !isDeepStrictEqual(Object.keys(bundle?.files || {}).sort(), [...expectedNames].sort())) throw Error('Expected the complete four-file Godot notice bundle');
  if (!/^[a-f0-9]{40}$/.test(manifest.source.revision || '') || provenance?.revision !== manifest.source.revision || provenance?.sha256 !== manifest.source.sha256 || !validRecord(toolchain?.editor) || provenance?.engineVersion !== toolchain.editorVersion || provenance?.editorSha256 !== toolchain.editor.sha256 || !['macOS', 'windowsX64'].every(name => validRecord(toolchain?.templates?.[name]))) throw Error('Notice source/toolchain provenance does not match the build');
  const engineSuffix = toolchain.editorVersion.split('.').at(-1);
  if (!/^[a-f0-9]{7,40}$/.test(engineSuffix) || !bundle.engineHash.startsWith(engineSuffix)) throw Error('Notice engine revision does not match the official toolchain version');
  const directory = await fs.lstat(path.join(folder, 'Notices'));
  if (!directory.isDirectory() || directory.isSymbolicLink()) throw Error('Expected a regular build-root Notices directory');
  const noticeBytes = new Map();
  for (const source of expectedNames) {
    const expected = bundle.files[source];
    if (!validRecord(expected)) throw Error(`Invalid notice file record: ${source}`);
    const info = await fs.lstat(path.join(folder, source));
    if (!info.isFile() || info.isSymbolicLink()) throw Error(`Expected a regular authored notice: ${source}`);
    const bytes = await fs.readFile(path.join(folder, source));
    if (bytes.length !== expected.bytes || digest(bytes) !== expected.sha256) throw Error(`Notice hash mismatch: ${source}`);
    noticeBytes.set(source, bytes);
    entries.push({ file: source, source, bytes: bytes.length, sha256: digest(bytes) });
  }
  const internal = JSON.parse(noticeBytes.get('Notices/notice-manifest.json'));
  if (internal.kind !== 'dustlings-godot-notice-bundle' || internal.version !== 1 || !isDeepStrictEqual(internal.source, {revision: manifest.source.revision, sha256: manifest.source.sha256}) || internal.engine?.version !== toolchain.editorVersion || internal.engine?.revision !== bundle.engineHash || internal.engine?.editorSha256 !== toolchain.editor.sha256 || !isDeepStrictEqual(internal.engine?.templates, toolchain.templates) || !internal.upstream || !isDeepStrictEqual(internal.upstream, provenance.upstream)) throw Error('Internal notice manifest provenance does not match the build');
  if (!isDeepStrictEqual(Object.keys(internal.files || {}).sort(), names.slice(0, 3).sort()) || names.slice(0, 3).some(name => !isDeepStrictEqual(internal.files[name], bundle.files[`Notices/${name}`]))) throw Error('Internal notice manifest does not bind all three notice texts');
  for (const name of ['LICENSE.txt', 'COPYRIGHT.txt']) {
    const upstream = internal.upstream[name];
    const expected = bundle.files[`Notices/GODOT_${name}`];
    if (upstream?.bytes !== expected.bytes || upstream?.sha256 !== expected.sha256) throw Error(`Notice upstream identity differs: ${name}`);
  }
  ({ verifyNoticeArchive } = await import('./godot-notices.mjs'));
}
const python = String.raw`
import sys,json,zipfile,hashlib,pathlib,tempfile,os
job=json.load(sys.stdin)
archive=pathlib.Path(job['archive'])
if job['create']:
    with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for item in job['entries']:
            data=(pathlib.Path(job['folder'])/item['source']).read_bytes() if 'source' in item else job['readme'].encode('utf8')
            if len(data)!=item['bytes'] or hashlib.sha256(data).hexdigest()!=item['sha256']: raise ValueError('Source changed: '+item['file'])
            info=zipfile.ZipInfo(item['file'],date_time=(1980,1,1,0,0,0))
            info.compress_type=zipfile.ZIP_DEFLATED
            info.create_system=0
            info.external_attr=0x20
            z.writestr(info,data,compress_type=zipfile.ZIP_DEFLATED,compresslevel=6)
with zipfile.ZipFile(archive) as z:
    if z.namelist()!=[x['file'] for x in job['entries']]: raise ValueError('Unexpected ZIP entries or order')
    bad=z.testzip()
    if bad: raise ValueError('ZIP CRC failed: '+bad)
    with tempfile.TemporaryDirectory(prefix='dustlings-windows-extracted-') as tmp:
        for item in job['entries']:
            info=z.getinfo(item['file'])
            if info.is_dir() or info.flag_bits&1: raise ValueError('Unexpected directory/encryption')
            extracted=pathlib.Path(z.extract(info,tmp))
            data=extracted.read_bytes()
            if len(data)!=item['bytes'] or hashlib.sha256(data).hexdigest()!=item['sha256']: raise ValueError('Extracted bytes differ: '+item['file'])
print(json.dumps({'zipCrc':'passed','extractedEntriesMatch':'passed','entryCount':len(job['entries']),'python':sys.version.split()[0]}))
`;
const exists = async file => { try { await fs.lstat(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };
const verify = async (archive, create) => {
  const result = JSON.parse(execFileSync(process.env.PYTHON || 'python3', ['-c', python], { input: JSON.stringify({ folder, archive, create, entries, readme: readme.toString('utf8') }), encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  if (hasNotices) {
    const notices = await verifyNoticeArchive({archive, bundle: manifest.notices});
    if (!notices.passed || notices.noticeFiles !== 4) throw Error('Archive notice verification failed');
    result.noticeFiles = notices.noticeFiles;
  }
  return result;
};
const expectedCompanion = (archive, verification) => ({
  kind: 'dustlings-windows-review-package', version: 1,
  manifest: { file: path.basename(manifestPath), sha256: digest(original), sourceHash: manifest.source.sha256 },
  archive: { file: archiveFile, bytes: archive.length, sha256: digest(archive) }, entries,
  verification: { zipCrc: verification.zipCrc, extractedEntriesMatch: verification.extractedEntriesMatch, entryCount: verification.entryCount, windowsExecution: 'not performed', ...(hasNotices ? {noticeFiles: verification.noticeFiles} : {}) },
});
const canonical = value => JSON.stringify(value, null, 2) + '\n';
async function unchangedManifest() {
  if (digest(await fs.readFile(manifestPath)) !== digest(original)) throw Error('Original manifest changed during packaging; refusing publication');
}
let proof;
if (verifyOnly) {
  const verification = await verify(destination, false);
  proof = expectedCompanion(await fs.readFile(destination), verification);
  if (await fs.readFile(companionPath, 'utf8') !== canonical(proof)) throw Error('Companion does not exactly bind the verified archive to this manifest');
  await unchangedManifest();
} else {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'dustlings-windows-package-'));
  try {
    const staged = path.join(temp, 'Dustlings-Windows.zip');
    const verification = await verify(staged, true);
    const archive = await fs.readFile(staged);
    proof = expectedCompanion(archive, verification);
    const companion = canonical(proof);
    // Check both destinations before publishing either. Never replace different bytes.
    if (await exists(destination)) {
      if (!(await fs.readFile(destination)).equals(archive)) throw Error('Refusing to overwrite a different Windows review archive');
    }
    if (await exists(companionPath)) {
      if (await fs.readFile(companionPath, 'utf8') !== companion) throw Error('Refusing to overwrite a different Windows review companion');
    }
    await unchangedManifest();
    await fs.mkdir(path.dirname(destination), { recursive: true });
    if (!await exists(destination)) await fs.copyFile(staged, destination, (await import('node:fs')).constants.COPYFILE_EXCL);
    if (!await exists(companionPath)) await fs.writeFile(companionPath, companion, { flag: 'wx' });
    await verify(destination, false);
    await unchangedManifest();
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
}
console.log(canonical({ action: verifyOnly ? 'verified' : 'packaged-or-already-identical', companion: companionPath, ...proof }));
