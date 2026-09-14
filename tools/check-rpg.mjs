#!/usr/bin/env node
// Run one engine at a time, with a fresh save directory for each scene test.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec = promisify(execFile);
const root = path.resolve(import.meta.dirname, '..');
const all = ['actor', 'story', 'save', 'reveal', 'integration', 'companion', 'earned_route'];
const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const match = arg.match(/^--(output|tests)=(.+)$/);
  if (!match) throw Error('Usage: node tools/check-rpg.mjs [--output=folder] [--tests=actor,story,...]');
  return [match[1], match[2]];
}));
const selected = args.tests?.split(',') || all;
if (!selected.length || selected.some(name => !all.includes(name))) throw Error('Unknown RPG test');
const output = path.resolve(root, args.output || `evidence/rpg/checks-${new Date().toISOString().replaceAll(/[:.]/g, '-')}`);
await fs.mkdir(path.dirname(output), {recursive: true});
await fs.mkdir(output); // Refuse to reuse a save from a previous run.
const engine = path.join(root, '.tools/Godot.app/Contents/MacOS/Godot');
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
async function sources() {
  const files = {};
  for (const dir of ['scripts', 'tests']) for (const file of (await fs.readdir(path.join(root, 'godot', dir))).sort()) {
    if (/\.(gd|gdshader)$/.test(file)) files[`${dir}/${file}`] = digest(await fs.readFile(path.join(root, 'godot', dir, file)));
  }
  return files;
}
const report = {method: 'Sequential headless fixed-60-Hz checks with isolated saves. No native performance or human validation.', source: await sources(), tests: [], ok: false};
for (const name of selected) {
  const folder = path.join(output, name);
  await fs.mkdir(folder);
  const flags = ['--rpg-qa', `--evidence=${folder}`, `--${name}-evidence=${folder}`];
  let result;
  try {
    result = await exec(engine, ['--headless', '--path', path.join(root, 'godot'), '--fixed-fps', '60', '--script', `res://tests/rpg_${name}_checks.gd`, '--', ...flags], {cwd: root, timeout: 240000, maxBuffer: 16 * 1024 * 1024});
    result.code = 0;
  } catch (error) { result = error; }
  const log = `${result.stdout || ''}${result.stderr || ''}`;
  await fs.writeFile(path.join(folder, 'run.log'), log);
  const ok = result.code === 0 && !/SCRIPT ERROR:|^ERROR:/m.test(log);
  report.tests.push({name, ok, exit: result.code, log: `${name}/run.log`});
  console.log(JSON.stringify(report.tests.at(-1)));
  if (!ok) break;
}
report.endingSource = await sources();
report.sourceUnchanged = JSON.stringify(report.source) === JSON.stringify(report.endingSource);
report.ok = report.tests.length === selected.length && report.tests.every(test => test.ok) && report.sourceUnchanged;
await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({output, ok: report.ok}));
if (!report.ok) process.exitCode = 1;
