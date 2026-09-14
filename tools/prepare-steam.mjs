#!/usr/bin/env node
// Offline staging from one verified export. Never logs in or uploads anything.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec = promisify(execFile);
const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const match = arg.match(/^--(build|output|config)=(.+)$/);
  if (!match) throw Error('Usage: node tools/prepare-steam.mjs --build=manifest.json --output=new-folder [--config=steam-ids.json]');
  return [match[1], path.resolve(match[2])];
}));
if (!args.build || !args.output) throw Error('An exact build manifest and a new output folder are required');
const bytes = await fs.readFile(args.build), build = JSON.parse(bytes), base = path.dirname(args.build);
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
if (!build.checks?.complete || build.errors?.length || build.source?.dirty !== false || build.source?.changedSinceSnapshot !== false || !build.version?.includes('rpg')) throw Error('Expected a complete, clean RPG export');
const ids = args.config ? JSON.parse(await fs.readFile(args.config, 'utf8')) : {appId: null, windowsDepotId: null, macDepotId: null};
if (args.config && !Object.values(ids).every(id => Number.isSafeInteger(id) && id > 0)) throw Error('Steam IDs must be positive integers from your Steamworks account');
if (args.config && (Object.keys(ids).sort().join(',') !== 'appId,macDepotId,windowsDepotId' || new Set(Object.values(ids)).size !== 3)) throw Error('Expected distinct appId, windowsDepotId and macDepotId');
function inside(parent, relative) {
  const resolved = path.resolve(parent, relative);
  if (path.isAbsolute(relative) || !resolved.startsWith(parent + path.sep)) throw Error('Manifest path escapes build');
  return resolved;
}
async function checked(relative, expected) {
  const file = inside(base, relative), stat = await fs.lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw Error(`Not a regular export file: ${relative}`);
  const data = await fs.readFile(file);
  if (data.length !== expected?.bytes || hash(data) !== expected?.sha256) throw Error(`Build hash mismatch: ${relative}`);
  return data;
}
await fs.mkdir(path.dirname(args.output), {recursive: true});
await fs.mkdir(args.output); // No mixing files from different versions.
const content = path.join(args.output, 'content');
const win = path.join(content, 'windows'), mac = path.join(content, 'macos');
await fs.mkdir(win, {recursive: true}); await fs.mkdir(mac, {recursive: true});
if (Object.keys(build.windows.files).sort().join(',') !== 'Dustlings.exe,Dustlings.pck') throw Error('Unexpected Windows payload');
for (const [file, expected] of Object.entries(build.windows.files)) await fs.writeFile(path.join(win, file), await checked(`Windows/${file}`, expected));
if (Object.keys(build.notices?.files || {}).length !== 4) throw Error('Complete engine notices are required');
for (const [relative, expected] of Object.entries(build.notices.files)) {
  const destination = inside(win, relative);
  await fs.mkdir(path.dirname(destination), {recursive: true});
  await fs.writeFile(destination, await checked(relative, expected));
}
await checked(build.macOS.path, build.macOS.archive);
await exec('/usr/bin/ditto', ['-x', '-k', inside(base, build.macOS.path), mac]);
const apps = (await fs.readdir(mac)).filter(file => file.endsWith('.app'));
if (apps.length !== 1) throw Error('Mac archive must contain exactly one app');
await exec('/usr/bin/codesign', ['--verify', '--deep', '--strict', path.join(mac, apps[0])]);
for (const [relative, expected] of Object.entries(build.macOS.files)) {
  const data = await fs.readFile(inside(path.join(mac, apps[0]), relative));
  if (data.length !== expected.bytes || hash(data) !== expected.sha256) throw Error(`Mac staged content mismatch: ${relative}`);
}
const scripts = path.join(args.output, 'scripts'); await fs.mkdir(scripts);
const appId = ids.appId || '@APP_ID@', windowsId = ids.windowsDepotId || '@WINDOWS_DEPOT_ID@', macId = ids.macDepotId || '@MAC_DEPOT_ID@';
const suffix = args.config ? '.vdf' : '.vdf.in';
const desc = `Dustlings ${build.version} ${build.source.sha256.slice(0, 12)}`;
await fs.writeFile(path.join(scripts, 'app_build' + suffix), `"AppBuild"\n{\n  "AppID" "${appId}"\n  "Desc" "${desc}"\n  "Preview" "1"\n  "SetLive" ""\n  "ContentRoot" "../content"\n  "BuildOutput" "../steam-build-output"\n  "Depots"\n  {\n    "${windowsId}" "depot_windows${suffix}"\n    "${macId}" "depot_macos${suffix}"\n  }\n}\n`);
for (const [platform, id, folder] of [['windows', windowsId, 'windows'], ['macos', macId, 'macos']]) {
  await fs.writeFile(path.join(scripts, `depot_${platform}${suffix}`), `"DepotBuildConfig"\n{\n  "DepotID" "${id}"\n  "ContentRoot" "../content/${folder}"\n  "FileMapping"\n  {\n    "LocalPath" "*"\n    "DepotPath" "."\n    "recursive" "1"\n  }\n  "FileExclusion" "*.DS_Store"\n}\n`);
}
await fs.writeFile(path.join(args.output, 'steam-ids.example.json'), JSON.stringify({appId: null, windowsDepotId: null, macDepotId: null}, null, 2) + '\n');
const inventory = {};
async function walk(dir, prefix = '') {
  for (const item of (await fs.readdir(dir, {withFileTypes: true})).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(dir, item.name), relative = prefix + item.name;
    if (item.isSymbolicLink()) throw Error(`Unexpected staged symlink: ${relative}`);
    if (item.isDirectory()) await walk(file, relative + '/');
    else { const data = await fs.readFile(file); inventory[relative] = {bytes: data.length, sha256: hash(data)}; }
  }
}
await walk(content);
const manifest = {kind: 'offline-steampipe-staging', build: args.build, buildManifestSha256: hash(bytes), source: build.source.sha256, version: build.version, idsConfigured: Boolean(args.config), preview: true, uploaded: false, releaseReady: false, files: inventory};
await fs.writeFile(path.join(args.output, 'staging-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
await fs.writeFile(path.join(args.output, 'README.md'), `# Dustlings Steam staging\n\nThis folder contains the exact verified Windows and Mac payloads from ${desc}, with engine notices. No tests, saves, source checkout or credentials are shipped.\n\n${args.config ? 'IDs are configured. The VDF is still in Preview mode.' : 'App/depot IDs are missing. Fill a copy of steam-ids.example.json with your actual Steamworks IDs and rerun prepare-steam.mjs into a new folder with --config=that-file. The .vdf.in files are templates, not upload scripts.'}\n\nSet launch options to Dustlings.exe (Windows) and ${apps[0]} (macOS), with OS-restricted depots. Use the Steamworks SDK ContentBuilder to preview the configured scripts and inspect its file manifest. Preview=1 uploads nothing; SetLive is empty. After account/platform/release checks, change Preview to 0 for an intentional upload, then validate an installed private Steam branch and its update/save behavior before assigning a public build.\n\nWindows runtime, actual player feedback, Mac distribution signing/notarization and Valve review remain separate requirements. This is an RPG neighborhood development build.\n\n[SteamPipe documentation](https://partner.steamgames.com/doc/sdk/uploading) · [Release process](https://partner.steamgames.com/doc/store/releasing)\n`);
console.log(JSON.stringify({output: args.output, files: Object.keys(inventory).length, idsConfigured: manifest.idsConfigured, preview: true, uploaded: false}));
