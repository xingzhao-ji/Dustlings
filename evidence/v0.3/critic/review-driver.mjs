// Independent reviewer driver. It only reads visible UI and sends normal input.
import { _electron as electron } from '@playwright/test';
import * as asar from '../../../platforms/desktop/node_modules/@electron/asar/lib/asar.js';
import { createHash } from 'node:crypto';
import { access, mkdtemp, mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline';

const dir = resolve('evidence/v0.3/critic');
await mkdir(dir, {recursive: true});
try {
  await access(join(dir, 'provenance.json'));
  throw new Error('Archived review already exists. Use a new evidence directory for another session.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const manifest = JSON.parse(await readFile('builds/desktop-build-manifest.json', 'utf8'));
const archive = 'builds/native/Dustlings-darwin-arm64/Dustlings.app/Contents/Resources/app.asar';
const packagedHash = createHash('sha256').update(asar.extractFile(archive, 'game.html')).digest('hex');
if (manifest.game.version !== '0.3.0' || packagedHash !== manifest.game.sha256) throw new Error('Wrong review build');
const profile = await mkdtemp(join(tmpdir(), 'dustlings-independent-critic-'));
const start = Date.now();
const log = async (kind, data={}) => {
  const entry = {utc:new Date().toISOString(), elapsedSeconds:Math.round((Date.now()-start)/100)/10, kind, ...data};
  await appendFile(join(dir, 'actions.jsonl'), JSON.stringify(entry)+'\n');
  console.log(JSON.stringify(entry));
};
await writeFile(join(dir, 'provenance.json'), JSON.stringify({reviewer:'independent AI critic', humanSessions:0, firstPlay:'Visible-UI-directed, normal speed. README and DEVELOPMENT read as required; not an unfamiliar uncoached player.', manifest, packagedHtmlSha256:packagedHash, profile, startedAt:new Date(start).toISOString(), video:'Silent Playwright recording of native Electron content; not OS chrome or live audio.', noQa:true, noStateInspection:true},null,2)+'\n');
const app = await electron.launch({
  executablePath:resolve('builds/native/Dustlings-darwin-arm64/Dustlings.app/Contents/MacOS/Dustlings'),
  env:{...process.env,DUSTLINGS_TEST_USER_DATA:profile},
  recordVideo:{dir:join(dir,'video'),size:{width:1280,height:800}},
});
const page = await app.firstWindow();
page.on('pageerror', error => log('pageerror',{error:String(error)}));
await log('launch',{profile,packagedHash});
const snap = async name => {
  const path = join(dir, name+'.png');
  await page.screenshot({path});
  await log('screenshot',{name,path,visibleText:await page.locator('body').innerText()});
};
await snap('01-opening');
console.log('READY');
for await (const line of createInterface({input:process.stdin,crlfDelay:Infinity})) {
  if(!line.trim()) continue;
  try {
    const cmd=JSON.parse(line); await log('action',cmd);
    if(cmd.op==='click') await page.mouse.click(cmd.x,cmd.y);
    if(cmd.op==='key') await page.keyboard.press(cmd.key);
    if(cmd.op==='button') await page.getByRole('button',{name:cmd.name,exact:true}).click();
    if(cmd.op==='drag') {
      await page.mouse.move(cmd.points[0][0],cmd.points[0][1]); await page.mouse.down();
      const paths=cmd.points.slice(1), per=cmd.ms/paths.length;
      for(const point of paths) {await page.mouse.move(point[0],point[1],{steps:10}); await page.waitForTimeout(per);}
      await page.mouse.up();
    }
    if(cmd.op==='move') await page.mouse.move(cmd.x,cmd.y);
    if(cmd.op==='wait') await page.waitForTimeout(Math.min(cmd.ms,30000));
    if(cmd.op==='snap') await snap(cmd.name);
    if(cmd.op==='ui') console.log(await page.locator('body').innerText());
    if(cmd.op==='close') {await snap('99-final'); await app.close(); await log('closed');break;}
    console.log('DONE');
  } catch(error) {await log('driver-error',{error:String(error)});}
}
