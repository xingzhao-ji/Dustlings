"""Controlled manifest/notice fixtures; no frozen package mutation or Windows launch."""
from pathlib import Path
import subprocess, tempfile, json, shutil, hashlib, os, zipfile

root = Path(__file__).resolve().parents[3]
proof = Path(__file__).resolve().parent
build = root / 'builds/3d/0.4.0-dev-2026-09-10T10-09-48-517Z-056dc75f00'
tool = root / 'tools/package-windows-review.mjs'
base = json.loads((build / 'manifest.json').read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
bound_files = ['manifest.json', 'Windows/Dustlings.exe', 'Windows/Dustlings.pck', 'Windows/Dustlings-Windows.zip', 'windows-review-package.json']
original = {name: {'sha256': sha(build/name), 'mtime_ns': (build/name).stat().st_mtime_ns} for name in bound_files}
checks = []

def check(label, passed, **details):
    checks.append({'check': label, 'passed': bool(passed), **details})
    if not passed: raise AssertionError(label)

def invoke(label, folder, verify=False, succeeds=True, reason=''):
    result = subprocess.run(['node', str(tool), str(folder/'manifest.json')] + (['--verify-only'] if verify else []), cwd=root, text=True, capture_output=True)
    (proof/(label+'.log')).write_text(result.stdout + result.stderr)
    check(label, (result.returncode == 0) == succeeds and (not reason or reason in result.stderr), exit_code=result.returncode, expected_success=succeeds)
    return json.loads(result.stdout) if result.returncode == 0 else None

def save_manifest(folder, manifest):
    (folder/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')

def refresh_internal(folder, manifest, mutation):
    file = folder/'Notices/notice-manifest.json'
    internal = json.loads(file.read_text())
    mutation(internal)
    file.write_text(json.dumps(internal, indent=2)+'\n')
    manifest['notices']['files']['Notices/notice-manifest.json'] = {'bytes': file.stat().st_size, 'sha256': sha(file)}
    save_manifest(folder, manifest)

invoke('historical-verify-only', build, verify=True)
with tempfile.TemporaryDirectory(prefix='dustlings-notice-package-check-') as temp:
    temp = Path(temp)
    def fixture(name, notices=None):
        folder = temp/name
        (folder/'Windows').mkdir(parents=True)
        (folder/'manifest.json').write_bytes((build/'manifest.json').read_bytes())
        for filename in ['Dustlings.exe','Dustlings.pck']: os.link(build/'Windows'/filename, folder/'Windows'/filename)
        if notices:
            shutil.copytree(notices/'Notices', folder/'Notices')
            (folder/'manifest.json').write_bytes((notices/'manifest.json').read_bytes())
        return folder

    legacy = fixture('historical-copy')
    legacy_result = invoke('historical-rebuild-in-new-temp-folder', legacy)
    check('Historical format remains exactly three entries', [x['file'] for x in legacy_result['entries']] == ['Dustlings.exe','Dustlings.pck','README.txt'])
    check('Historical archive and companion remain byte-identical when rebuilt elsewhere', sha(legacy/'Windows/Dustlings-Windows.zip') == original['Windows/Dustlings-Windows.zip']['sha256'] and (legacy/'windows-review-package.json').read_bytes() == (build/'windows-review-package.json').read_bytes())

    valid = fixture('valid-notices')
    generated = subprocess.run(['node', str(root/'tools/godot-notices.mjs'), '--manifest', str(valid/'manifest.json'), '--output', str(valid/'Notices')], cwd=root, text=True, capture_output=True)
    (proof/'generate-fixture-notices.log').write_text(generated.stdout + generated.stderr)
    check('Generate actual pinned notices for exact historical source/toolchain fixture', generated.returncode == 0)
    manifest = json.loads((valid/'manifest.json').read_text())
    manifest['notices'] = json.loads(generated.stdout)
    save_manifest(valid, manifest)
    package = invoke('package-notice-fixture', valid)
    invoke('verify-notice-fixture', valid, verify=True)
    archived = valid/'Windows/Dustlings-Windows.zip'
    archived_before = (sha(archived), archived.stat().st_mtime_ns)
    invoke('idempotent-notice-fixture', valid)
    check('Identical notice package rerun preserves archive bytes and mtime', archived_before == (sha(archived), archived.stat().st_mtime_ns))
    expected_names = ['Dustlings.exe','Dustlings.pck','README.txt','Notices/GODOT_LICENSE.txt','Notices/GODOT_COPYRIGHT.txt','Notices/THIRD-PARTY-NOTICES.txt','Notices/notice-manifest.json']
    with zipfile.ZipFile(archived) as z:
        check('Independent exact seven-entry list and CRC', z.namelist() == expected_names and z.testzip() is None)
        for name, expected in manifest['notices']['files'].items():
            data = z.read(name)
            check('Independent extracted notice bytes: '+name, len(data) == expected['bytes'] and hashlib.sha256(data).hexdigest() == expected['sha256'])
    check('Companion notice sources are relative to build root, not Windows', all(x.get('source') == x['file'] for x in package['entries'] if x['file'].startswith('Notices/')) and package['verification']['noticeFiles'] == 4)
    (proof/'fixture-manifest.json').write_bytes((valid/'manifest.json').read_bytes())
    (proof/'fixture-companion.json').write_bytes((valid/'windows-review-package.json').read_bytes())
    (proof/'fixture-notice-manifest.json').write_bytes((valid/'Notices/notice-manifest.json').read_bytes())

    for label, field in [('wrong-source-revision','revision'),('wrong-source-hash','sha256'),('wrong-editor-hash','editorSha256'),('wrong-engine-version','engineVersion')]:
        bad = fixture(label, valid); m = json.loads((bad/'manifest.json').read_text())
        m['notices']['sourceProvenance'][field] = '0' * (40 if field == 'revision' else 64)
        save_manifest(bad,m)
        invoke(label,bad,succeeds=False,reason='provenance does not match')
    bad = fixture('missing-file',valid); (bad/'Notices/GODOT_LICENSE.txt').unlink()
    invoke('reject-missing-notice',bad,succeeds=False,reason='ENOENT')
    bad = fixture('changed-file',valid); (bad/'Notices/GODOT_COPYRIGHT.txt').write_text('changed notice bytes')
    invoke('reject-changed-notice',bad,succeeds=False,reason='Notice hash mismatch')
    bad = fixture('missing-record',valid); m=json.loads((bad/'manifest.json').read_text()); del m['notices']['files']['Notices/GODOT_LICENSE.txt']; save_manifest(bad,m)
    invoke('reject-missing-notice-record',bad,succeeds=False,reason='complete four-file')
    bad = fixture('null-notices',valid); m=json.loads((bad/'manifest.json').read_text()); m['notices']=None; save_manifest(bad,m)
    invoke('reject-null-notices',bad,succeeds=False,reason='complete four-file')
    bad = fixture('wrong-engine',valid); m=json.loads((bad/'manifest.json').read_text()); m['notices']['engineHash']='0'*40; save_manifest(bad,m)
    invoke('reject-engine-revision',bad,succeeds=False,reason='engine revision does not match')
    bad = fixture('wrong-internal-source',valid); m=json.loads((bad/'manifest.json').read_text())
    refresh_internal(bad,m,lambda inner: inner['source'].update({'sha256':'0'*64}))
    invoke('reject-internal-source-even-with-refreshed-file-hash',bad,succeeds=False,reason='Internal notice manifest provenance')
    bad = fixture('wrong-internal-text-record',valid); m=json.loads((bad/'manifest.json').read_text())
    refresh_internal(bad,m,lambda inner: inner['files']['GODOT_LICENSE.txt'].update({'sha256':'0'*64}))
    invoke('reject-internal-text-hash',bad,succeeds=False,reason='bind all three notice texts')
    bad = fixture('wrong-template',valid); m=json.loads((bad/'manifest.json').read_text())
    refresh_internal(bad,m,lambda inner: inner['engine']['templates']['windowsX64'].update({'sha256':'0'*64}))
    invoke('reject-internal-template-provenance',bad,succeeds=False,reason='Internal notice manifest provenance')
    bad = fixture('wrong-location',valid); shutil.move(str(bad/'Notices'),str(bad/'Windows/Notices'))
    invoke('reject-notices-only-under-Windows',bad,succeeds=False,reason='ENOENT')
    check('Rejected fixtures never publish an archive or companion', all(not (child/'windows-review-package.json').exists() and not (child/'Windows/Dustlings-Windows.zip').exists() for child in temp.iterdir() if child.is_dir() and child not in [valid,legacy]))

check('Original frozen manifest/EXE/PCK/ZIP/companion hashes and mtimes unchanged', all(sha(build/name)==record['sha256'] and (build/name).stat().st_mtime_ns==record['mtime_ns'] for name,record in original.items()))
report = {'kind':'Controlled Windows notice packaging checks on macOS; exact historical exported binaries with a new temporary notice-bearing manifest, not a new release or Windows execution', 'historical_build':str(build.relative_to(root)), 'historical_source_sha256':base['source']['sha256'], 'tool_sha256':sha(tool), 'checks':checks, 'passed':sum(x['passed'] for x in checks), 'failed':sum(not x['passed'] for x in checks), 'immutable_original':original}
(proof/'results.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'passed':report['passed'],'failed':report['failed']},indent=2))
