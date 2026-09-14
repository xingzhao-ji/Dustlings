#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec = promisify(execFile);
if (process.platform !== 'darwin') throw Error('Use the Windows ZIP on Windows. This launcher is for the Mac.');
if (process.argv.slice(2).some(arg => arg !== '--verify-only')) throw Error('Only --verify-only is supported');
const root = path.resolve(import.meta.dirname, '..');
const selected = JSON.parse(await fs.readFile(path.join(root, 'builds/3d/current-rpg.json'), 'utf8'));
const manifestPath = path.resolve(root, selected.manifest);
if (!manifestPath.startsWith(path.join(root, 'builds/3d') + path.sep)) throw Error('Unexpected current build path');
const manifest = JSON.parse(await fs.readFile(manifestPath));
if (!manifest.checks?.complete || manifest.source?.dirty !== false || manifest.source?.sha256 !== selected.source) throw Error('Current build is not the verified source');
const archive = path.resolve(path.dirname(manifestPath), manifest.macOS.path);
if (!archive.startsWith(path.dirname(manifestPath) + path.sep)) throw Error('Unexpected archive path');
const bytes = await fs.readFile(archive);
if (bytes.length !== manifest.macOS.archive.bytes || crypto.createHash('sha256').update(bytes).digest('hex') !== manifest.macOS.archive.sha256) throw Error('Mac archive verification failed');
const cache = path.join(os.homedir(), 'Library/Application Support/Dustlings/Builds', manifest.macOS.archive.sha256);
await fs.mkdir(cache, {recursive: true});
const app = path.join(cache, 'Dustlings.app');
try { await fs.access(app); } catch (error) {
  if (error.code !== 'ENOENT') throw error;
  await exec('/usr/bin/ditto', ['-x', '-k', archive, cache]);
}
await exec('/usr/bin/codesign', ['--verify', '--deep', '--strict', app]);
if (process.argv.includes('--verify-only')) console.log(JSON.stringify({app, version: manifest.version, source: manifest.source.sha256, verified: true}));
else await exec('/usr/bin/open', [app]);
