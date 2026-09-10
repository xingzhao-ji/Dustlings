import { webkit } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import os from 'node:os';

const artifactPath = resolve(process.argv[2] || 'builds/Dustlings Courtyard.html');
const bytes = await readFile(artifactPath);
const sha256 = createHash('sha256').update(bytes).digest('hex');
let manifest = null;
try { manifest = JSON.parse(await readFile('builds/build-manifest.json', 'utf8')); } catch {}
const result = {
  timestamp: new Date().toISOString(),
  kind: 'Exact standalone file:// Playwright WebKit checks; not branded Safari, physical iOS, human play, or performance validation',
  artifact: { path: artifactPath, sha256, bytes: bytes.length, manifest },
  conditions: { hostPlatform: process.platform, hostArchitecture: process.arch, kernel: os.release(), headless: true, viewport: '1440x900', dpr: 1, contexts: 'Fresh isolated browser context; file:// navigation; no local web server' },
  checks: [], errors: [], httpRequests: [], requests: [],
};
const check = (name, pass, details = {}) => result.checks.push({ name, pass: Boolean(pass), ...details });
const browser = await webkit.launch({ headless: true });
result.engine = { name: 'Playwright WebKit', version: browser.version(), executable: webkit.executablePath() };
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await context.route(/^https?:\/\//, async route => { result.httpRequests.push(route.request().url()); await route.abort(); });
const page = await context.newPage(); page.setDefaultTimeout(7000);
page.on('pageerror', error => result.errors.push({ type: 'pageerror', message: error.message }));
page.on('console', message => { if (message.type() === 'error') result.errors.push({ type: 'console', message: message.text() }); });
page.on('request', request => result.requests.push(request.url()));
try {
  check('Standalone bytes match the build manifest', manifest?.sha256 === sha256 && manifest?.bytes === bytes.length);
  await page.goto(pathToFileURL(artifactPath).href + '?qa=1');
  await page.waitForFunction(() => Boolean(window.__dustlings));
  check('Standalone initializes directly from file://', new URL(page.url()).protocol === 'file:' && await page.locator('#welcome').isVisible());
  await page.locator('#start-button').click();
  await page.waitForFunction(() => window.__dustlings.audio.getDiagnostics().ready);
  check('Start gesture initializes standalone audio', await page.evaluate(() => window.__dustlings.audio.getDiagnostics().ready));
  await page.locator('#world').focus(); await page.keyboard.press('n'); await page.keyboard.press('Space');
  for (let i = 0; i < 7; i++) { await page.evaluate(() => window.__dustlings.advance(3)); await page.keyboard.press('n'); }
  await page.keyboard.press('Space');
  const opening = await page.evaluate(() => ({ cleaned: window.__dustlings.state.cleaned, creatures: window.__dustlings.state.creatures.length }));
  check('Standalone keyboard brushing forms a crew', opening.cleaned > 7 && opening.creatures > 0, { ...opening, timing: '21 explicitly advanced simulation seconds; not human/real-time pacing' });
  await page.keyboard.press('d'); await page.keyboard.press('n'); await page.keyboard.press('Enter');
  await page.keyboard.press('Escape'); await page.waitForTimeout(160);
  check('Standalone Escape pause suspends audio', await page.locator('#settings').isVisible() && await page.evaluate(() => window.__dustlings.audio.getDiagnostics().paused));
  await page.locator('#music-volume').fill('31'); await page.locator('#tap-sweep').check();
  const saved = await page.evaluate(async () => ({ saved: await window.__dustlings.save(), data: window.__dustlings.serialise(), status: document.querySelector('#save-status').textContent }));
  check('Standalone file:// can save meaningful progress', saved.saved && saved.data.dust.some(amount => amount < 1), { status: saved.status, saved: saved.saved });
  await page.reload(); await page.waitForFunction(() => Boolean(window.__dustlings));
  const loaded = await page.evaluate(() => ({ data: window.__dustlings.serialise(), music: document.querySelector('#music-volume').value, tapSweep: document.querySelector('#tap-sweep').checked }));
  check('Standalone file:// reload restores dust, crew, and assignment', JSON.stringify(saved.data.dust) === JSON.stringify(loaded.data.dust) && saved.data.creatures.length === loaded.data.creatures.length && JSON.stringify(saved.data.assignment) === JSON.stringify(loaded.data.assignment));
  check('Standalone file:// reload preserves settings', loaded.music === '31' && loaded.tapSweep, { music: loaded.music, tapSweep: loaded.tapSweep });
  await page.locator('#start-button').click(); await page.waitForTimeout(120);
  check('Return gesture resumes standalone audio', await page.evaluate(() => window.__dustlings.audio.getDiagnostics().contextState === 'running'));
  check('Standalone makes no HTTP(S) requests', result.httpRequests.length === 0, { count: result.httpRequests.length });
  check('Standalone has no runtime or console errors', result.errors.length === 0, { count: result.errors.length });
} catch (error) {
  check('Standalone scenario completes', false, { error: error.message });
} finally {
  await context.close(); await browser.close();
  const after = createHash('sha256').update(await readFile(artifactPath)).digest('hex');
  check('Exact artifact stayed unchanged during validation', after === sha256, { before: sha256, after });
  result.summary = { passed: result.checks.filter(item => item.pass).length, failed: result.checks.filter(item => !item.pass).length, errors: result.errors.length, httpRequests: result.httpRequests.length };
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/webkit-build-checks.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ engine: result.engine, artifact: { sha256, bytes: bytes.length }, summary: result.summary, failures: result.checks.filter(item => !item.pass), errors: result.errors }, null, 2));
  if (result.summary.failed || result.summary.errors || result.summary.httpRequests) process.exitCode = 1;
}
