"""Package a hash-verified review reference, excluding caches and test profiles."""
from pathlib import Path
import argparse
import hashlib
import json
import os
import sys
import subprocess
import zipfile

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--preflight', action='store_true', help='Validate and list payload; do not compress or write manifests')
args = parser.parse_args()
# Fail before compression when the review title, artifact, media or linked archives disagree.
try:
    verified = json.loads(subprocess.check_output(['node', str(root/'tools/verify-current-review.mjs'), '--no-native'], cwd=root, text=True))
except subprocess.CalledProcessError as error:
    sys.exit(error.returncode)
manifest = verified['build']
version = manifest['version']
artifact = root/verified['artifact']
files = set()
excluded_parts = {'node_modules', '__pycache__', 'raw-video', 'profiles', '.git', '.DS_Store', 'DerivedData', '.build'}

def eligible(file):
    return file.is_file() and not file.is_symlink() and not (set(file.relative_to(root).parts) & excluded_parts) and file.suffix != '.webm'

for name in ['README.md', 'AGENTS.md', 'index.html', 'style.css', 'package.json', 'package-lock.json', verified['artifact'], 'builds/build-manifest.json']:
    files.add(root/name)
for folder in ['src', 'docs', 'tools', 'tests', 'newtests', 'artifacts/audio', 'evidence', 'platforms']:
    for directory, subdirs, names in os.walk(root/folder):
        subdirs[:] = [name for name in subdirs if name not in excluded_parts and not (Path(directory)/name).is_symlink()]
        for name in names:
            file = Path(directory)/name
            if eligible(file) and file != root/'platforms/desktop/game.html':
                files.add(file)
# Include every direct local review destination, including separately verified native
# archives if the review links them. Historical evidence stays historical.
for reference in verified['references']:
    file = root/reference['path']
    if not eligible(file):
        raise RuntimeError(f'Review references an excluded cache/raw file: {reference["path"]}')
    files.add(file)
files.add(root/verified['mediaManifest'])
for name in ['builds/desktop-build-manifest.json', 'builds/desktop-package-manifest.json']:
    if (root/name).is_file():
        files.add(root/name)
payload = {str(file.relative_to(root)): hashlib.sha256(file.read_bytes()).hexdigest() for file in sorted(files)}
output = root/f'builds/Dustlings-Courtyard-{version}-Review.zip'
if args.preflight:
    print(json.dumps({'status': 'passed', 'mode': 'preflight only; no archive written', 'output': str(output.relative_to(root)), 'gameBuild': manifest, 'review': verified['review'], 'files': len(files)}, indent=2))
else:
    temporary = output.with_suffix('.tmp.zip')
    try:
        with zipfile.ZipFile(temporary, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as bundle:
            for name, expected in payload.items():
                content = (root/name).read_bytes()
                if hashlib.sha256(content).hexdigest() != expected:
                    raise RuntimeError(f'Payload changed during packaging: {name}')
                bundle.writestr(name, content)
        with zipfile.ZipFile(temporary) as bundle:
            if bundle.testzip() is not None:
                raise RuntimeError('ZIP CRC check failed')
            for name, expected in payload.items():
                if hashlib.sha256(bundle.read(name)).hexdigest() != expected:
                    raise RuntimeError(f'Packaged hash mismatch: {name}')
            for reference in verified['references']:
                if reference['path'] not in bundle.namelist():
                    raise RuntimeError(f'Local review reference missing from archive: {reference["path"]}')
        # Recheck the live review/payload identity before labeling this archive.
        final = json.loads(subprocess.check_output(['node', str(root/'tools/verify-current-review.mjs'), '--no-native'], cwd=root, text=True))
        if final['build'] != manifest or final['review'] != verified['review']:
            raise RuntimeError('Review or build changed while packaging')
        temporary.replace(output)
    finally:
        temporary.unlink(missing_ok=True)
    record = {'artifact': str(output.relative_to(root)), 'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'bytes': output.stat().st_size, 'files': len(files), 'gameBuild': manifest, 'review': verified['review'], 'payloadSha256': payload, 'validation': 'All packaged file hashes and ZIP CRCs checked; direct local review links included. Reference packaging does not establish current product scope, enjoyment, platform readiness or owner acceptance.'}
    (root/'builds/review-package-manifest.json').write_text(json.dumps(record, indent=2)+'\n')
    print(json.dumps(record, indent=2))
