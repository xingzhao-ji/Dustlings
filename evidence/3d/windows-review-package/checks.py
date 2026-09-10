"""Actual local packager checks. Never mutates the original export or game files."""
import pathlib,subprocess,json,tempfile,shutil,hashlib,os,zipfile
root=pathlib.Path(__file__).resolve().parents[3]
build=root/'builds/3d/0.4.0-dev-2026-09-10T10-09-48-517Z-056dc75f00'
proof=pathlib.Path(__file__).resolve().parent
script=root/'tools/package-windows-review.mjs'
manifest=json.loads((build/'manifest.json').read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
original={str(p.relative_to(build)):sha(p) for p in [build/'manifest.json',build/'Windows/Dustlings.exe',build/'Windows/Dustlings.pck']}
archive=build/'Windows/Dustlings-Windows.zip'
archive_before=(sha(archive),archive.stat().st_mtime_ns)
checks=[]
def invoke(label,folder,verify=False,expected=True,reason=''):
    result=subprocess.run(['node',str(script),str(folder/'manifest.json')]+(['--verify-only'] if verify else []),cwd=root,text=True,capture_output=True)
    (proof/(label+'.log')).write_text(result.stdout+result.stderr)
    passed=(result.returncode==0)==expected and (not reason or reason in result.stderr)
    checks.append({'check':label,'passed':passed,'exit_code':result.returncode,'expected_success':expected})
    if not passed:raise RuntimeError(label+' failed its acceptance check')
invoke('verify-only',build,True)
invoke('idempotent-rerun',build)
checks.append({'check':'Identical archive rerun preserves both bytes and mtime','passed':archive_before==(sha(archive),archive.stat().st_mtime_ns)})
with tempfile.TemporaryDirectory(prefix='dustlings-windows-check-') as work:
    base=pathlib.Path(work)
    def fixture(name):
        f=base/name;(f/'Windows').mkdir(parents=True)
        (f/'manifest.json').write_bytes((build/'manifest.json').read_bytes())
        for name in ['Dustlings.exe','Dustlings.pck']:os.link(build/'Windows'/name,f/'Windows'/name)
        return f
    bad=fixture('wrong-hash');m=json.loads((bad/'manifest.json').read_text());m['windows']['files']['Dustlings.exe']['sha256']='0'*64;m['windows']['executable']['sha256']='0'*64;(bad/'manifest.json').write_text(json.dumps(m))
    invoke('reject-wrong-export-hash',bad,expected=False,reason='Export hash mismatch')
    distinct=fixture('overwrite');existing=distinct/'Windows/Dustlings-Windows.zip';existing.write_bytes(b'existing distinct archive')
    invoke('reject-different-existing-zip',distinct,expected=False,reason='Refusing to overwrite')
    checks.append({'check':'Rejected overwrite preserves original different file','passed':existing.read_bytes()==b'existing distinct archive' and not (distinct/'windows-review-package.json').exists()})
    damaged=fixture('crc');shutil.copyfile(archive,damaged/'Windows/Dustlings-Windows.zip');shutil.copyfile(build/'windows-review-package.json',damaged/'windows-review-package.json')
    data=bytearray((damaged/'Windows/Dustlings-Windows.zip').read_bytes());data[200]^=0xff;(damaged/'Windows/Dustlings-Windows.zip').write_bytes(data)
    invoke('reject-damaged-zip',damaged,True,False)
    binding=fixture('binding');shutil.copyfile(archive,binding/'Windows/Dustlings-Windows.zip');c=json.loads((build/'windows-review-package.json').read_text());c['manifest']['sourceHash']='0'*64;(binding/'windows-review-package.json').write_text(json.dumps(c,indent=2)+'\n')
    invoke('reject-wrong-companion-binding',binding,True,False,reason='Companion does not exactly bind')
with zipfile.ZipFile(archive) as z:
    checks.append({'check':'Independent CRC and exact root entry list','passed':z.testzip() is None and z.namelist()==['Dustlings.exe','Dustlings.pck','README.txt']})
    (proof/'README.txt').write_bytes(z.read('README.txt'))
    for name in ['Dustlings.exe','Dustlings.pck']:
        b=z.read(name);e=manifest['windows']['files'][name]
        checks.append({'check':'Independent extracted '+name+' matches original manifest','passed':len(b)==e['bytes'] and hashlib.sha256(b).hexdigest()==e['sha256']})
checks.append({'check':'Original manifest, EXE and PCK remain unchanged','passed':all(sha(build/p)==h for p,h in original.items())})
report={'kind':'Windows portable ZIP integrity/reuse checks on macOS; no Windows launch, device usability or release approval','checks':checks,'passed':sum(x['passed'] for x in checks),'failed':sum(not x['passed'] for x in checks),'original_sha256':original,'archive_sha256':sha(archive),'archive_bytes':archive.stat().st_size}
(proof/'results.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
if report['failed']:raise SystemExit(1)
