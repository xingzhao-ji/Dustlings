#!/usr/bin/env node
// Compose title capsules from authored SVG branding and actual gameplay.
// Gameplay screenshots remain byte-for-byte engine captures.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {chromium} from '@playwright/test';
const exec = promisify(execFile);
const [captureArg, outputArg] = process.argv.slice(2);
if (!captureArg || !outputArg) throw Error('Usage: node tools/prepare-store-media.mjs capture-folder new-output-folder');
const capture = path.resolve(captureArg), output = path.resolve(outputArg);
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const captureManifest = JSON.parse(await fs.readFile(path.join(capture, 'capture-manifest.json')));
const route = JSON.parse(await fs.readFile(path.join(capture, 'results.json')));
if (captureManifest.status !== 'recorded' || captureManifest.scenario !== 'route' || !route.ok) throw Error('A successful full route recording is required');
await fs.mkdir(path.dirname(output), {recursive: true}); await fs.mkdir(output);
const report = {kind: 'draft-store-media', humanApproved: false, source: captureManifest.sourceHash, capture: captureManifest, screenshots: [], capsules: [], trailer: {method: 'Edited native MovieMaker route, original game audio, generated InputEvents, normal playback speed. No human play or performance claim.'}};
for (const name of ['first-companion', 'ivo', 'home-interior', 'bridge-after', 'garden', 'ivy-after', 'gathering']) {
  const bytes = await fs.readFile(path.join(capture, name + '.png'));
  if (!bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw Error('Not a PNG');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (width < 1920 || height < 1080 || width * 9 !== height * 16) throw Error('Store screenshots require native 1080p 16:9 captures');
  await fs.writeFile(path.join(output, name + '.png'), bytes);
  report.screenshots.push({file: name + '.png', width, height, sha256: hash(bytes), unmodifiedEngineCapture: true});
}
const art = 'data:image/png;base64,' + (await fs.readFile(path.join(capture, 'gathering.png'))).toString('base64');
const iconBytes = await fs.readFile(path.resolve(import.meta.dirname, '../godot/assets/ui/app-icon.svg'));
const icon = 'data:image/svg+xml;base64,' + iconBytes.toString('base64');
await fs.writeFile(path.join(output, 'app-icon.svg'), iconBytes);
const browser = await chromium.launch({headless: true});
try {
  const page = await browser.newPage({deviceScaleFactor: 1});
  for (const [name, width, height] of [['header',920,430],['small',462,174],['main',1232,706],['vertical',748,896]]) {
    await page.setViewportSize({width, height});
    const small = name === 'small', vertical = name === 'vertical';
    const html = `<!doctype html><meta charset="utf-8"><title>Dustlings capsule</title><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}body{background:#2d503e;color:#fff7da;position:relative}.art{position:absolute;inset:-12% -26%;background:url('${art}') center 52%/cover no-repeat;opacity:${small ? 0 : .96}}.shade{position:absolute;inset:0;background:${vertical ? 'linear-gradient(0deg,#294a39 0%,#294a39f2 25%,#294a3900 72%)' : 'linear-gradient(90deg,#294a39 0%,#294a39ed 20%,#294a3900 78%)'}}.brand{position:absolute;inset:${small ? '0 18px' : vertical ? 'auto 28px 56px' : 'auto 44px 48px'};display:flex;align-items:center;gap:${small ? 18 : 24}px}.icon{width:${small ? 100 : vertical ? 140 : 126}px;height:auto;border-radius:25%}h1{font:normal ${small ? 57 : vertical ? 103 : width > 1000 ? 143 : 114}px/1 Georgia,serif;letter-spacing:-.055em;margin:0;text-shadow:0 3px 14px #19342580}.leaf{position:absolute;width:12px;height:22px;border-radius:100% 0;background:#c7d79d;transform:rotate(24deg);top:-20px;left:48%}</style><div class="art"></div><div class="shade"></div><div class="brand"><img class="icon" src="${icon}" alt=""><h1>Dustlings</h1></div>`;
    await page.setContent(html); await page.locator('.icon').evaluate(img => img.decode());
    if (vertical) await page.locator('.brand').evaluate(el => {el.style.flexDirection = 'column'; el.style.alignItems = 'flex-start';});
    await page.screenshot({path: path.join(output, `capsule-${name}.png`)});
    report.capsules.push({file: `capsule-${name}.png`, width, height, method: 'Code-composed title, authored SVG icon and cropped actual gameplay; promotional capsule, not an unmodified screenshot.'});
  }
  await page.setViewportSize({width: 256, height: 256});
  await page.setContent(`<style>html,body{margin:0}img{display:block;width:256px;height:256px}</style><img src="${icon}">`);
  await page.locator('img').evaluate(img => img.decode());
  await page.screenshot({path: path.join(output, 'app-icon-256.png')});
} finally { await browser.close(); }
function time(fragment) {
  const step = route.checks.find(row => row.command.includes(fragment));
  if (!step) throw Error(`Missing route event: ${fragment}`);
  return step.time;
}
const first = time('"capture": "first-companion"');
const bridge = time('"button": "Repair together"');
const garden = time('"button": "Water gently"');
const gathering = time('"capture": "gathering"');
const cuts = [[first-3.6,4.2],[first+.7,3.4],[bridge+.2,5],[garden+.2,4],[gathering-6,6]];
const filters = cuts.map(([start,duration],i) => `[0:v]trim=start=${start}:duration=${duration},setpts=PTS-STARTPTS[v${i}];[0:a]atrim=start=${start}:duration=${duration},asetpts=PTS-STARTPTS,afade=t=in:d=0.08,afade=t=out:st=${duration-.12}:d=0.12[a${i}]`).join(';') + ';' + cuts.map((_,i)=>`[v${i}][a${i}]`).join('') + `concat=n=${cuts.length}:v=1:a=1[v][a]`;
await exec('ffmpeg', ['-hide_banner','-loglevel','error','-i',path.join(capture,'route.mp4'),'-filter_complex',filters,'-map','[v]','-map','[a]','-c:v','libx264','-crf','20','-preset','fast','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart',path.join(output,'gameplay-preview.mp4')], {maxBuffer: 4*1024*1024});
const probe = JSON.parse((await exec('ffprobe',['-v','error','-show_streams','-show_format','-of','json',path.join(output,'gameplay-preview.mp4')])).stdout);
const video = probe.streams.find(stream => stream.codec_type === 'video');
if (video?.width !== 1920 || video?.height !== 1080 || !probe.streams.some(stream => stream.codec_type === 'audio')) throw Error('Unexpected trailer format');
report.trailer.cuts = cuts.map(([start,duration])=>({start,duration})); report.trailer.duration = Number(probe.format.duration);
report.trailer.sourceMovieSha256 = hash(await fs.readFile(path.join(capture,'route.mp4')));
report.files = {};
for (const file of await fs.readdir(output)) {const data=await fs.readFile(path.join(output,file));report.files[file]={bytes:data.length,sha256:hash(data)};}
await fs.writeFile(path.join(output,'media-manifest.json'),JSON.stringify(report,null,2)+'\n');
await fs.writeFile(path.join(output,'README.md'),'# Dustlings store media draft\n\nSeven genuine 1920×1080 screenshots, four title capsules, an authored SVG icon and a short gameplay cut with original audio. Review the actual game and media before public use. The game currently contains one Bellwether neighborhood.\n\nThe capture used a native engine with a 1920×1080 MovieMaker viewport in a smaller Mac display window. Screenshots are unmodified; capsules are explicit graphic compositions. MovieMaker timing is not performance. Inputs are generated, with no injected story progress. Human tests and media approval remain zero/pending.\n\nThe first requested large native window was clamped by macOS; those earlier captures are retained separately and are not presented as 1080p store screenshots. All source hashes and cut timings are in media-manifest.json.\n');
console.log(JSON.stringify({output,screenshots:report.screenshots.length,capsules:report.capsules.length,trailerSeconds:report.trailer.duration}));
