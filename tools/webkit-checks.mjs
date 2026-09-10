import { webkit } from '@playwright/test';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import http from 'node:http';
import os from 'node:os';

// Snapshot every top-level runtime module so new imports (such as settings.js)
// are served and hashed automatically without silently testing an incomplete app.
const runtimeFiles = (await readdir('src', { withFileTypes: true }))
  .filter(entry => entry.isFile() && entry.name.endsWith('.js'))
  .map(entry => `src/${entry.name}`).sort();
const files = ['index.html', 'style.css', ...runtimeFiles];
const snapshot = new Map(await Promise.all(files.map(async file => [file, await readFile(file)])));
const hashes = Object.fromEntries([...snapshot].map(([name, data]) => [name, createHash('sha256').update(data).digest('hex')]));
const evidence = { timestamp: new Date().toISOString(), kind: 'Playwright WebKit compatibility; not Safari app, physical iOS, human play, or performance validation', sourceHashes: hashes, conditions: { hostPlatform: process.platform, hostArchitecture: process.arch, kernel: os.release(), snapshot: 'In-memory source snapshot; no shared source files modified', headless: true, dpr: 1 }, checks: [], errors: [] };
const server = http.createServer((request, response) => {
  const name = new URL(request.url, 'http://localhost').pathname.slice(1) || 'index.html';
  const data = snapshot.get(name);
  if (!data) { response.writeHead(404); response.end(); return; }
  response.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html');
  response.end(data);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/?qa=1`;
const browser = await webkit.launch({ headless: true });
evidence.engine = { name: 'Playwright WebKit', version: browser.version(), executable: webkit.executablePath() };
const contexts = [];
const check = (name, pass, details = {}) => evidence.checks.push({ name, pass: Boolean(pass), ...details });
async function scenario(name, run) {
  try { await run(); } catch (error) { check(name, false, { error: error.message }); }
}
async function setup(viewport, touch = false) {
  const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 }); contexts.push(context);
  const page = await context.newPage(); page.setDefaultTimeout(7000);
  page.on('pageerror', error => evidence.errors.push({ viewport, type: 'pageerror', message: error.message }));
  page.on('console', message => { if (message.type() === 'error') evidence.errors.push({ viewport, type: 'console', message: message.text() }); });
  await page.goto(url); await page.waitForFunction(() => Boolean(window.__dustlings));
  await page.locator('#start-button').click();
  return page;
}
async function screenPoint(page, x, y, touch = false) {
  return page.evaluate(({ x, y, touch }) => { const q = window.__dustlings, p = q.renderer.worldToScreen(x, y), r = document.querySelector('#world').getBoundingClientRect(); return { x: p.x + r.left, y: p.y + r.top + (touch ? 42 : 0) }; }, { x, y, touch });
}
async function overflow(page, label) {
  const bounds = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth, height: innerHeight }));
  check(label, bounds.document <= bounds.viewport && bounds.body <= bounds.viewport, bounds);
}
async function touchMappingError(page, world, finger) {
  return page.evaluate(({ world, finger }) => {
    const r = document.querySelector('#world').getBoundingClientRect(), p = window.__dustlings.renderer.worldToScreen(world.x, world.y);
    return { xCssPx: Math.abs(p.x + r.left - finger.x), yCssPx: Math.abs(p.y + r.top + 42 - finger.y) };
  }, { world, finger });
}
await mkdir('evidence', { recursive: true });
try {
  await scenario('desktop keyboard, save, and audio scenario completes', async () => {
    const page = await setup({ width: 1440, height: 900 });
    evidence.engine.userAgent = await page.evaluate(() => navigator.userAgent);
    check('WebKit starts WebAudio from the start gesture', await page.evaluate(() => window.__dustlings.audio.getDiagnostics().ready));
    await page.locator('#world').focus(); await page.keyboard.press('n'); await page.keyboard.press('Space');
    for (let i = 0; i < 24; i++) { await page.evaluate(() => window.__dustlings.advance(2)); await page.keyboard.press('n'); }
    await page.keyboard.press('Space');
    const keyboard = await page.evaluate(() => ({ crew: window.__dustlings.state.creatures.length, motes: window.__dustlings.state.motes, brushed: window.__dustlings.state.stats.brushed, active: window.__dustlings.state.pointer.active }));
    check('Actual keyboard events clean, create helpers, and earn a meaningful upgrade', keyboard.crew > 0 && keyboard.motes >= 32 && keyboard.brushed > 0 && !keyboard.active, { ...keyboard, timing: '48 seconds explicitly advanced simulation; not human or real-time pacing' });
    await page.keyboard.press('u'); await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
    check('Keyboard activation buys the visible brush capability', await page.evaluate(() => window.__dustlings.state.upgrades.brush && window.__dustlings.state.brushRadius > 44));
    await page.keyboard.press('Escape'); await page.locator('#world').focus(); await page.keyboard.press('d'); await page.keyboard.press('n'); await page.keyboard.press('Enter');
    check('Keyboard can direct the crew', await page.evaluate(() => Boolean(window.__dustlings.state.assignment)));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(180);
    const paused = await page.evaluate(() => ({ elapsed: window.__dustlings.state.elapsed, audio: window.__dustlings.audio.getDiagnostics() }));
    await page.waitForTimeout(180);
    check('Settings pause freezes simulation and suspends WebKit audio', paused.elapsed === await page.evaluate(() => window.__dustlings.state.elapsed) && paused.audio.paused && paused.audio.contextState === 'suspended', paused);
    await page.locator('#music-volume').fill('27');
    const saved = await page.evaluate(async () => { await window.__dustlings.save(); return window.__dustlings.serialise(); });
    await page.reload(); await page.waitForFunction(() => Boolean(window.__dustlings));
    const loaded = await page.evaluate(() => ({ data: window.__dustlings.serialise(), music: document.querySelector('#music-volume').value }));
    check('WebKit reload preserves exact dust, upgrades, and assignment', JSON.stringify(saved.dust) === JSON.stringify(loaded.data.dust) && JSON.stringify(saved.upgrades) === JSON.stringify(loaded.data.upgrades) && JSON.stringify(saved.assignment) === JSON.stringify(loaded.data.assignment));
    check('WebKit reload preserves volume settings', loaded.music === '27', { value: loaded.music });
    await page.locator('#start-button').click(); await page.waitForTimeout(100);
    check('WebKit audio can resume on the return gesture', await page.evaluate(() => window.__dustlings.audio.getDiagnostics().contextState === 'running'));
    if (!process.env.DUSTLINGS_NO_CAPTURE) await page.screenshot({ path: 'evidence/webkit-desktop.png' });
    await overflow(page, 'Desktop document has no horizontal overflow');
  });

  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) await scenario(`${viewport.width}×${viewport.height} touch scenario completes`, async () => {
    const page = await setup(viewport, true), label = `${viewport.width}×${viewport.height}`;
    await overflow(page, `${label} gameplay has no horizontal overflow`);
    await page.locator('#pause-button').click(); await page.locator('#tap-sweep').check(); await page.locator('#resume-button').click();
    await page.evaluate(() => {
      window.__touchAudit = [];
      for (const name of ['pointerdown', 'pointerup', 'pointerout', 'pointerleave', 'pointercancel', 'lostpointercapture']) document.querySelector('#world').addEventListener(name, event => {
        window.__touchAudit.push({ event: name, pointerType: event.pointerType, clientX: event.clientX, clientY: event.clientY, stateActive: window.__dustlings.state.pointer.active, tapSetting: document.querySelector('#tap-sweep').checked });
      });
    });
    const p = await screenPoint(page, 300, 450, true), before = await page.evaluate(() => window.__dustlings.state.stats.brushed);
    await page.touchscreen.tap(p.x, p.y);
    const pointer = await page.evaluate(() => ({ ...window.__dustlings.state.pointer }));
    const mappingError = await touchMappingError(page, pointer, p);
    check(`${label} touch tap maps to the target 42px above the finger`, pointer.touch && mappingError.xCssPx <= 2 && mappingError.yCssPx <= 2, { pointer, finger: p, mappingError, tolerance: '2 CSS px for WebKit synthetic-touch coordinate quantization; not 2 world units' });
    await page.waitForTimeout(1100);
    const brushed = await page.evaluate(() => window.__dustlings.state.stats.brushed);
    check(`${label} tap-to-sweep continues cleaning after finger release`, brushed - before > .3, { brushedBefore: before, brushedAfter: brushed, delta: brushed - before, waitMs: 1100, events: await page.evaluate(() => window.__touchAudit) });
    await page.evaluate(async () => { const q = window.__dustlings, data = q.serialise(); data.dust = data.dust.map((n, i) => i < 14 ? 0 : n); q.load(data); await q.save(); });
    await page.locator('#direct-tool').click(); const dest = await screenPoint(page, 650, 430, true); await page.touchscreen.tap(dest.x, dest.y);
    const assignment = await page.evaluate(() => window.__dustlings.state.assignment);
    const destinationError = assignment ? await touchMappingError(page, assignment, dest) : null;
    check(`${label} touch release directs to the offset destination`, assignment && destinationError.xCssPx <= 2 && destinationError.yCssPx <= 2, { assignment, destinationError });
    await page.locator('#mobile-journal').click(); await overflow(page, `${label} Grow drawer has no horizontal overflow`);
    await page.locator('#close-journal').click();
    check(`${label} Grow drawer closes`, !(await page.locator('#journal').isVisible()));
    await page.locator('#pause-button').click(); await overflow(page, `${label} settings has no horizontal overflow`);
    await page.locator('#resume-button').scrollIntoViewIfNeeded(); check(`${label} resume action remains reachable`, await page.locator('#resume-button').isVisible());
    await page.locator('#resume-button').click();
    if (!process.env.DUSTLINGS_NO_CAPTURE) await page.screenshot({ path: `evidence/webkit-${viewport.width}x${viewport.height}.png` });
  });
  check('No WebKit runtime exceptions or console errors', evidence.errors.length === 0, { count: evidence.errors.length });
} finally {
  for (const context of contexts) await context.close();
  await browser.close(); await new Promise(resolve => server.close(resolve));
  evidence.summary = { passed: evidence.checks.filter(check => check.pass).length, failed: evidence.checks.filter(check => !check.pass).length, errors: evidence.errors.length };
  evidence.workspaceChangesAfterSnapshot = [];
  for (const file of files) if (createHash('sha256').update(await readFile(file)).digest('hex') !== hashes[file]) evidence.workspaceChangesAfterSnapshot.push(file);
  await writeFile('evidence/webkit-checks.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify({ engine: evidence.engine, summary: evidence.summary, failed: evidence.checks.filter(check => !check.pass), errors: evidence.errors, workspaceChangesAfterSnapshot: evidence.workspaceChangesAfterSnapshot }, null, 2));
  if (evidence.summary.failed || evidence.summary.errors) process.exitCode = 1;
}
