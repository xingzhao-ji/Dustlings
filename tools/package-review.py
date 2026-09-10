"""Package a portable review checkpoint without caches or raw capture files."""
from pathlib import Path
import hashlib
import json
import zipfile

root=Path(__file__).resolve().parent.parent
manifest=json.loads((root/'builds/build-manifest.json').read_text())
version=manifest['version']
artifact=root/'builds'/manifest['artifact']
assert hashlib.sha256(artifact.read_bytes()).hexdigest()==manifest['sha256']
files=set()
for name in ['README.md','AGENTS.md','index.html','style.css','package.json','package-lock.json','builds/Dustlings Courtyard.html','builds/build-manifest.json']:
    files.add(root/name)
for folder in ['src','docs','tools','tests','newtests','artifacts/audio','evidence']:
    for path in (root/folder).rglob('*'):
        if not path.is_file() or path.name=='.DS_Store' or '__pycache__' in path.parts:
            continue
        if 'raw-video' in path.parts or path.suffix=='.webm':
            continue
        if path.name=='REVIEW-v0.1.html':
            continue
        files.add(path)
output=root/f'builds/Dustlings-Courtyard-{version}-Review.zip'
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as bundle:
    for path in sorted(files):
        bundle.write(path,path.relative_to(root))
with zipfile.ZipFile(output) as bundle:
    assert bundle.testzip() is None
    packed=bundle.read('builds/Dustlings Courtyard.html')
    assert hashlib.sha256(packed).hexdigest()==manifest['sha256']
record={'artifact':str(output.relative_to(root)),'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'bytes':output.stat().st_size,'files':len(files),'gameBuild':manifest,'validation':'ZIP CRC integrity and contained game artifact hash match. No dependency install required to play the standalone HTML.'}
(root/'builds/review-package-manifest.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record,indent=2))
