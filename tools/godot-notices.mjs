#!/usr/bin/env node
// Offline, packaging-only attribution for the exact audited official toolchain.
// It never edits game source, rewrites an existing package, or selects a game license.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidence = path.join(root, 'evidence/3d/notices');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const validHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

export async function writeGodotNotices({output, source, toolchain}) {
  const audited = JSON.parse(await fs.readFile(path.join(evidence, 'source-evidence.json'), 'utf8'));
  if (!validHash(source?.sha256) || !/^[a-f0-9]{40}$/.test(source?.revision)) throw Error('Notices require an exact source hash and revision');
  if (toolchain?.editorVersion !== audited.toolchain.editorVersion || toolchain?.editor?.sha256 !== audited.toolchain.editor.sha256 || ['macOS','windowsX64'].some(name => toolchain?.templates?.[name]?.sha256 !== audited.toolchain.templates[name].sha256)) throw Error('Notice bundle is not audited for this exact engine and export templates');
  const apiBytes = await fs.readFile(path.join(evidence, 'engine-api.json'));
  if (digest(apiBytes) !== audited.engineApiSha256) throw Error('Audited engine API evidence changed');
  const api = JSON.parse(apiBytes);
  const payloads = {};
  for (const name of ['LICENSE.txt', 'COPYRIGHT.txt']) {
    const bytes = await fs.readFile(path.join(evidence, 'upstream', name));
    if (digest(bytes) !== audited.upstream[name].sha256 || bytes.length !== audited.upstream[name].bytes) throw Error('Pinned upstream notice bytes changed: ' + name);
    payloads['GODOT_' + name] = bytes;
  }
  if (payloads['GODOT_LICENSE.txt'].toString() !== api.license_text) throw Error('Upstream license no longer matches audited engine');
  const commit = audited.engine.hash;
  payloads['THIRD-PARTY-NOTICES.txt'] = Buffer.from(`Dustlings - third-party software notices\n\nThis game uses Godot Engine ${toolchain.editorVersion}.\nIts license is reproduced in GODOT_LICENSE.txt. Copyright and license texts\nfor Godot's bundled components are reproduced in GODOT_COPYRIGHT.txt.\nThat upstream inventory is intentionally complete and may also describe\neditor-only or other-platform components absent from this desktop build.\nThese notices do not apply the engine's license to Dustlings code or assets.\n\nFonts and rendering\nThe audited default UI font is Open Sans SemiBold, part of the Open Sans\nfont family: copyright 2020 The Open Sans Project Authors; SIL Open Font\nLicense 1.1. Its notice and full license are in GODOT_COPYRIGHT.txt.\nThis software uses FreeType. Portions are copyright 1996-2025 The FreeType\nProject (https://freetype.org). All rights reserved. Full terms and original\ncopyright holders are in GODOT_COPYRIGHT.txt.\n\nComponent source availability\nThe unmodified engine source used by this official toolchain is available at\nhttps://github.com/godotengine/godot/tree/${commit}\nSource archive:\nhttps://github.com/godotengine/godot/archive/${commit}.tar.gz\nThis includes the MPL-2.0 CA certificate source at\nhttps://github.com/godotengine/godot/blob/${commit}/thirdparty/certs/ca-bundle.crt\nIts source is governed by MPL-2.0, reproduced in GODOT_COPYRIGHT.txt.\nComponent versions and original upstream locations are documented at\nhttps://github.com/godotengine/godot/blob/${commit}/thirdparty/README.md\n\nGodot license: https://godotengine.org/license/\nDistribution identity and file hashes: notice-manifest.json\n`, 'utf8');
  const manifest = {
    kind: 'dustlings-godot-notice-bundle', version: 1,
    source: {revision: source.revision, sha256: source.sha256},
    engine: {version: toolchain.editorVersion, revision: commit, editorSha256: toolchain.editor.sha256, templates: toolchain.templates},
    upstream: audited.upstream,
    files: Object.fromEntries(Object.entries(payloads).map(([name, bytes]) => [name, {bytes: bytes.length, sha256: digest(bytes)}])),
    scope: 'Engine and bundled components; no license or ownership assertion for Dustlings. No release or human approval.'
  };
  payloads['notice-manifest.json'] = Buffer.from(json(manifest));
  // Validate all inputs before publishing; preserve different existing evidence.
  try {
    const names = await fs.readdir(output);
    if (names.length && (names.length !== Object.keys(payloads).length || names.some(name => !Object.hasOwn(payloads,name)))) throw Error('Refusing mixed notice output');
    for (const name of names) if (!(await fs.readFile(path.join(output,name))).equals(payloads[name])) throw Error('Refusing to overwrite different notices');
  } catch(error) {if(error.code !== 'ENOENT') throw error;}
  await fs.mkdir(output, {recursive:true});
  for (const [name, bytes] of Object.entries(payloads)) {
    try {await fs.writeFile(path.join(output,name), bytes, {flag:'wx'});} catch(error) {if(error.code !== 'EEXIST') throw error;}
    if (!(await fs.readFile(path.join(output,name))).equals(bytes)) throw Error('Notice destination changed during publication: '+name);
  }
  return {schema:1, engineHash:commit,
    sourceProvenance:{...manifest.source,engineVersion:toolchain.editorVersion,editorSha256:toolchain.editor.sha256,upstream:audited.upstream},
    files:Object.fromEntries(Object.entries(payloads).map(([name,bytes])=>['Notices/'+name,{bytes:bytes.length,sha256:digest(bytes)}]))};
}

export async function verifyNoticeArchive({archive, bundle}) {
  const files = bundle.files;
  const names=['GODOT_LICENSE.txt','GODOT_COPYRIGHT.txt','THIRD-PARTY-NOTICES.txt','notice-manifest.json'].map(name=>'Notices/'+name);
  if (!files || Object.keys(files).length !== 4 || names.some(name=>!Object.hasOwn(files,name))) throw Error('Expected all four notice bundle files');
  const result = await exec(process.env.PYTHON || 'python3', ['-c', `import sys,json,zipfile,hashlib
files=json.loads(sys.argv[2])
with zipfile.ZipFile(sys.argv[1]) as z:
    names=z.namelist()
    for entry,expected in files.items():
        assert names.count(entry)==1, 'Missing or duplicate notice: '+entry
        info=z.getinfo(entry)
        assert info.file_size==expected['bytes'], 'Notice size mismatch: '+entry
        data=z.read(entry)
        assert hashlib.sha256(data).hexdigest()==expected['sha256'], 'Notice bytes differ: '+entry
print(json.dumps({'passed':True,'noticeFiles':len(files),'method':'Actual decompressed archive bytes, not filenames alone'}))`, path.resolve(archive), JSON.stringify(files)], {timeout:30000,maxBuffer:1024*1024});
  return JSON.parse(result.stdout);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2);
  if(args.length!==4 || args[0]!=='--manifest' || args[2]!=='--output') throw Error('Usage: node tools/godot-notices.mjs --manifest exact-build/manifest.json --output empty-Notices-folder');
  const manifest=JSON.parse(await fs.readFile(args[1],'utf8'));
  process.stdout.write(json(await writeGodotNotices({output:args[3],source:manifest.source,toolchain:manifest.toolchain})));
}
