#!/usr/bin/env node
// Immutable native development exports. This never launches a game or uploads a build.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = path.join(root, 'godot');
const editor = process.env.GODOT_BIN || path.join(root, '.tools/Godot.app/Contents/MacOS/Godot');
const templates = process.env.GODOT_TEMPLATES || path.join(root, '.tools/templates');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const json = data => JSON.stringify(data, null, 2) + '\n';
const run = (file, args, options = {}) => exec(file, args, { cwd: root, timeout: 180000, maxBuffer: 16 * 1024 * 1024, ...options });
const statFile = async file => ({ bytes: (await fs.stat(file)).size, sha256: hash(await fs.readFile(file)) });

async function inventory(dir, prefix = '') {
  const result = {};
  for (const item of (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (item.name === '.godot' || item.name === '.DS_Store') continue;
    const relative = prefix + item.name;
    if (item.isSymbolicLink()) throw new Error(`Refusing source symlink: ${relative}`);
    if (item.isDirectory()) Object.assign(result, await inventory(path.join(dir, item.name), relative + '/'));
    else result[relative] = await statFile(path.join(dir, item.name));
  }
  return result;
}

const started = new Date().toISOString();
const original = await inventory(project);
const sourceSha256 = hash(json(original));
const sourceText = await fs.readFile(path.join(project, 'project.godot'), 'utf8');
const version = sourceText.match(/^config\/version="([^"]+)"/m)?.[1];
if (!version || !/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(version)) throw new Error('Missing or unsupported project version');
const numericVersion = version.split(/[-+]/)[0];
const revision = (await run('git', ['rev-parse', 'HEAD'])).stdout.trim();
const status = (await run('git', ['status', '--porcelain=v1', '--untracked-files=all'])).stdout;
const sourceStatus = (await run('git', ['status', '--porcelain=v1', '--untracked-files=all', '--', 'godot'])).stdout;
const id = `${version}-${started.replace(/[:.]/g, '-')}-${sourceSha256.slice(0, 10)}`;
const out = path.join(root, 'builds/3d', id);
const snapshot = path.join(out, 'source/godot');
await fs.mkdir(snapshot, { recursive: true });
const manifest = {
  schema: 1, kind: 'godot-native-development-integration-candidate', started, version,
  bundleVersion: numericVersion, source: { revision, dirty: Boolean(sourceStatus.trim()), repositoryDirty: Boolean(status.trim()), status: sourceStatus, repositoryStatus: status, sha256: sourceSha256, files: original },
  snapshot: 'source/godot', humanTests: 0, ownerApproved: false, releaseReady: false,
  macOS: { execution: 'not run by build tool', notarized: false },
  windows: { execution: 'unrun', signing: 'unsigned development executable' },
  checks: {}, errors: []
};
const saveManifest = () => fs.writeFile(path.join(out, 'manifest.json'), json(manifest));
await saveManifest();
async function logged(label, file, args, options) {
  try {
    const result = await run(file, args, options);
    await fs.writeFile(path.join(out, label + '.log'), result.stdout + result.stderr);
    return result;
  } catch (error) {
    await fs.writeFile(path.join(out, label + '.log'), `${error.stdout || ''}${error.stderr || ''}\n${error.message}\n`);
    throw error;
  }
}
try {
  for (const [relative, expected] of Object.entries(original)) {
    const bytes = await fs.readFile(path.join(project, relative));
    if (hash(bytes) !== expected.sha256) throw new Error(`Source changed while freezing: ${relative}; rerun`);
    const destination = path.join(snapshot, relative);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, bytes);
  }
  const engineVersion = (await run(editor, ['--version'])).stdout.trim();
  const templateVersion = (await fs.readFile(path.join(templates, 'version.txt'), 'utf8')).trim();
  if (!engineVersion.startsWith(templateVersion + '.')) throw new Error(`Editor/template version mismatch: ${engineVersion} / ${templateVersion}`);
  const macTemplate = path.join(templates, 'macos.zip');
  const winTemplate = path.join(templates, 'windows_release_x86_64.exe');
  manifest.toolchain = { editorVersion: engineVersion, templateVersion, buildTool: await statFile(fileURLToPath(import.meta.url)), editor: await statFile(editor), templates: { macOS: await statFile(macTemplate), windowsX64: await statFile(winTemplate) } };
  const downloadRecord = path.join(root, 'evidence/3d/toolchain-download.json');
  try { manifest.toolchain.downloadRecord = JSON.parse(await fs.readFile(downloadRecord, 'utf8')); } catch { manifest.toolchain.downloadRecord = null; }
  let presets = await fs.readFile(path.join(snapshot, 'export_presets.cfg'), 'utf8');
  const configString = value => JSON.stringify(value.replaceAll('\\', '/'));
  presets = presets.replaceAll('"../.tools/templates/macos.zip"', configString(macTemplate))
    .replace('"../.tools/templates/windows_release_x86_64.exe"', configString(winTemplate))
    .replace(/^application\/(short_version|version)="[^"]*"/gm, (_, key) => `application/${key}="${numericVersion}"`)
    .replace(/^application\/(file_version|product_version)="[^"]*"/gm, (_, key) => `application/${key}="${numericVersion}.0"`);
  await fs.writeFile(path.join(snapshot, 'export_presets.cfg'), presets);
  manifest.snapshotOverrides = { file: 'export_presets.cfg', purpose: 'Absolute local template paths and numeric platform metadata; game source unchanged', sha256: hash(presets) };
  const imported = await logged('import', editor, ['--headless', '--path', snapshot, '--import']);
  if (/SCRIPT ERROR:|ERROR:/m.test(imported.stdout + imported.stderr)) throw new Error('Import reported errors; inspect import.log');
  const macZip = path.join(out, 'macOS/Dustlings.zip');
  const winExe = path.join(out, 'Windows/Dustlings.exe');
  await fs.mkdir(path.dirname(macZip));
  await fs.mkdir(path.dirname(winExe));
  for (const [label, preset, target] of [['export-macos', 'macOS Development', macZip], ['export-windows', 'Windows Development', winExe]]) {
    const result = await logged(label, editor, ['--headless', '--path', snapshot, '--export-release', preset, target]);
    if (/SCRIPT ERROR:|ERROR:/m.test(result.stdout + result.stderr)) throw new Error(`${label} reported errors; inspect log`);
  }
  // Keep the durable artifact zipped: Desktop/iCloud may attach forbidden FinderInfo
  // to live .app directories. Verify an untouched extraction on the local temp volume.
  const extraction = await fs.mkdtemp(path.join(os.tmpdir(), 'dustlings-3d-export-'));
  await logged('macos-extract', '/usr/bin/ditto', ['-x', '-k', macZip, extraction]);
  const apps = (await fs.readdir(extraction)).filter(name => name.endsWith('.app'));
  if (apps.length !== 1) throw new Error(`Expected one app in Mac archive, found ${apps.length}`);
  const macApp = path.join(extraction, apps[0]);
  manifest.macOS.localInspectionApp = macApp;
  const macFiles = await inventory(macApp);
  const packs = Object.keys(macFiles).filter(name => name.endsWith('.pck'));
  if (packs.length !== 1) throw new Error(`Expected one macOS PCK, found ${packs.length}`);
  const macPack = path.join(macApp, packs[0]);
  const winPack = winExe.replace(/\.exe$/, '.pck');
  // Mount each exported PCK in an empty project: source files cannot satisfy a missing pack entry.
  const verifyDir = path.join(out, 'pack-verifier');
  await fs.mkdir(verifyDir);
  await fs.writeFile(path.join(verifyDir, 'project.godot'), 'config_version=5\n');
  const expectedScripts = Object.fromEntries(Object.entries(original).filter(([name]) => /\.(gd|gdshader)$/.test(name) && !name.startsWith('tests/')).map(([name, item]) => ['res://' + name, item.sha256]));
  await fs.writeFile(path.join(verifyDir, 'expected.json'), json(expectedScripts));
  await fs.writeFile(path.join(verifyDir, 'verify.gd'), `extends SceneTree\nfunc _initialize():\n\tvar args = OS.get_cmdline_user_args()\n\tvar expected = JSON.parse_string(FileAccess.get_file_as_string(args[1]))\n\tif not ProjectSettings.load_resource_pack(args[0], true):\n\t\tpush_error("PCK mount failed")\n\t\tquit(1)\n\t\treturn\n\tvar failures = []\n\tfor file in expected:\n\t\tif FileAccess.get_sha256(file) != expected[file]: failures.append(file)\n\tprint("PACK_SOURCE_CHECK=" + JSON.stringify({"checked": expected.size(), "failures": failures}))\n\tquit(0 if failures.is_empty() else 1)\n`);
  for (const [label, pack] of [['macos', macPack], ['windows', winPack]]) {
    const checked = await logged(`verify-${label}-pck`, editor, ['--headless', '--path', verifyDir, '--script', path.join(verifyDir, 'verify.gd'), '--', pack, path.join(verifyDir, 'expected.json')]);
    const report = checked.stdout.match(/PACK_SOURCE_CHECK=(.+)/)?.[1];
    if (!report) throw new Error(`${label} PCK verifier produced no result`);
    manifest.checks[label + 'PackSources'] = JSON.parse(report);
  }
  await logged('macos-signature-verify', '/usr/bin/codesign', ['--verify', '--deep', '--strict', '--verbose=2', macApp]);
  const signature = await logged('macos-signature-details', '/usr/bin/codesign', ['--display', '--verbose=4', macApp]);
  if (!/Signature=adhoc/.test(signature.stderr)) throw new Error('Expected an ad-hoc Mac signature');
  const plist = JSON.parse((await run('/usr/bin/plutil', ['-convert', 'json', '-o', '-', path.join(macApp, 'Contents/Info.plist')])).stdout);
  if (plist.CFBundleShortVersionString !== numericVersion) throw new Error('Exported Mac version mismatch');
  const macExecutable = path.join(macApp, 'Contents/MacOS', plist.CFBundleExecutable);
  const architectures = (await run('/usr/bin/lipo', ['-archs', macExecutable])).stdout.trim().split(/\s+/);
  if (!architectures.includes('arm64') || !architectures.includes('x86_64')) throw new Error('Mac export is not Universal2');
  const pe = await fs.readFile(winExe);
  const peOffset = pe.readUInt32LE(0x3c);
  if (pe.toString('ascii', 0, 2) !== 'MZ' || pe.toString('ascii', peOffset, peOffset + 4) !== 'PE\0\0' || pe.readUInt16LE(peOffset + 4) !== 0x8664) throw new Error('Windows export is not x64 PE');
  manifest.macOS = { ...manifest.macOS, path: path.relative(out, macZip), archive: await statFile(macZip), signing: 'verified built-in ad-hoc', architectures, bundleIdentifier: plist.CFBundleIdentifier, bundleVersion: plist.CFBundleVersion, pck: await statFile(macPack), executable: await statFile(macExecutable), files: macFiles };
  manifest.windows = { ...manifest.windows, path: path.relative(out, winExe), architecture: 'x86_64', pck: await statFile(winPack), executable: await statFile(winExe), files: await inventory(path.dirname(winExe)) };
  if (manifest.macOS.pck.sha256 !== manifest.windows.pck.sha256) manifest.checks.pckDifference = 'Platform-specific PCKs; each source inventory was verified separately';
  const afterImport = await inventory(snapshot);
  manifest.snapshotImportMetadataChanges = Object.keys({ ...original, ...afterImport }).filter(name => name !== 'export_presets.cfg' && original[name]?.sha256 !== afterImport[name]?.sha256);
  const unexpectedImportChanges = manifest.snapshotImportMetadataChanges.filter(name => !/\.(import|uid)$/.test(name));
  if (unexpectedImportChanges.length) throw new Error('Importer changed authored source: ' + unexpectedImportChanges.join(', '));
  manifest.source.changedSinceSnapshot = hash(json(await inventory(project))) !== sourceSha256;
  manifest.finished = new Date().toISOString();
  manifest.checks.complete = true;
  await saveManifest();
  await fs.writeFile(path.join(root, 'builds/3d/latest-build.json'), json({ kind: manifest.kind, version, sourceSha256, sourceChangedSinceSnapshot: manifest.source.changedSinceSnapshot, manifest: path.relative(path.join(root, 'builds/3d'), path.join(out, 'manifest.json')), releaseReady: false }));
  console.log(json({ out, version, sourceSha256, sourceChangedSinceSnapshot: manifest.source.changedSinceSnapshot, macOS: manifest.macOS.path, windows: manifest.windows.path, checks: manifest.checks }));
} catch (error) {
  manifest.errors.push(error.message);
  manifest.finished = new Date().toISOString();
  await saveManifest();
  console.error(`Native export failed. Preserved diagnostic manifest: ${path.join(out, 'manifest.json')}\n${error.stack}`);
  process.exitCode = 1;
}
