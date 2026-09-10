import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

let server, browser, url;
before(async () => {
  const root = process.cwd();
  server = http.createServer(async (request, response) => {
    try {
      let file = path.resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
      if (!file.startsWith(root + path.sep) && file !== root) throw Error('Invalid path');
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      response.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' })[path.extname(file)] || 'application/octet-stream');
      response.end(await readFile(file));
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}/?qa=1`;
  browser = await chromium.launch({ headless: true, executablePath: process.env.DUSTLINGS_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function session(t) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  t.after(() => context.close());
  const page = await context.newPage();
  await page.goto(url);
  await page.locator('#start-button').click();
  await page.waitForFunction(() => window.__dustlings?.audio.getDiagnostics().ready);
  return page;
}

test('invalid JSON and impossible JSON-valid imports preserve the current courtyard', async t => {
  const page = await session(t);
  await page.evaluate(() => {
    const qa = window.__dustlings, data = qa.serialise();
    data.dust = data.dust.map((_, index) => index < 35 ? 0 : 1);
    qa.load(data); qa.save();
  });
  await page.locator('#pause-button').click();
  const before = await page.evaluate(() => window.__dustlings.serialise());
  const impossible = { ...before, restoration: 1 };
  for (const content of ['{unfinished', JSON.stringify(impossible), 'x'.repeat(300001)]) {
    await page.locator('#save-file').setInputFiles({ name: 'damaged.json', mimeType: 'application/json', buffer: Buffer.from(content) });
    await page.waitForFunction(() => document.querySelector('#settings-save-note').textContent.includes('Could not import'));
    const after = await page.evaluate(() => window.__dustlings.serialise());
    assert.deepEqual(after.dust, before.dust);
    assert.deepEqual(after.upgrades, before.upgrades);
    assert.equal(after.restoration, before.restoration);
    assert.equal(after.creatures.length, before.creatures.length);
  }
});

test('restart requires the explicit confirmation and cancel preserves progress', async t => {
  const page = await session(t);
  await page.evaluate(() => {
    const qa = window.__dustlings, data = qa.serialise();
    data.dust = data.dust.map((_, index) => index < 35 ? 0 : 1);
    qa.load(data); qa.save();
  });
  await page.locator('#pause-button').click();
  const before = await page.evaluate(() => window.__dustlings.serialise());
  await page.locator('#restart-button').click();
  assert.equal(await page.locator('#restart-confirm').isVisible(), true);
  await page.locator('#cancel-restart').click();
  assert.deepEqual(await page.evaluate(() => window.__dustlings.serialise().dust), before.dust);
  await page.locator('#restart-button').click();
  await page.locator('#confirm-restart').click();
  await page.waitForFunction(() => window.__dustlings.state.cleaned === 0 && !document.querySelector('#settings').open);
  const after = await page.evaluate(() => ({ cleaned: window.__dustlings.state.cleaned, crew: window.__dustlings.state.creatures.length, upgrades: window.__dustlings.state.upgrades }));
  assert.equal(after.cleaned, 0);
  assert.equal(after.crew, 0);
  assert.deepEqual(after.upgrades, { brush: false, teamwork: false, bloom: false });
});

test('settings pause suspends audio and simulation and resume restores the audio context', async t => {
  const page = await session(t);
  await page.locator('#pause-button').click();
  await page.waitForFunction(() => window.__dustlings.audio.getDiagnostics().contextState === 'suspended');
  const before = await page.evaluate(() => ({ elapsed: window.__dustlings.state.elapsed, audio: window.__dustlings.audio.getDiagnostics() }));
  await page.waitForTimeout(180);
  assert.equal(await page.evaluate(() => window.__dustlings.state.elapsed), before.elapsed);
  assert.equal(before.audio.paused, true);
  await page.locator('#resume-button').click();
  await page.waitForFunction(() => window.__dustlings.audio.getDiagnostics().contextState === 'running');
  assert.equal(await page.evaluate(() => window.__dustlings.audio.getDiagnostics().paused), false);
});

test('synthetic background visibility pauses input, simulation, and audio until explicit resume', async t => {
  const page = await session(t);
  await page.evaluate(() => {
    const qa = window.__dustlings;
    qa.state.pointer.active = true;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForFunction(() => window.__dustlings.audio.getDiagnostics().contextState === 'suspended');
  const before = await page.evaluate(() => window.__dustlings.state.elapsed);
  await page.waitForTimeout(180);
  assert.equal(await page.evaluate(() => window.__dustlings.state.elapsed), before);
  assert.equal(await page.evaluate(() => window.__dustlings.state.pointer.active), false);
  assert.equal(await page.locator('#settings').isVisible(), true);
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  assert.equal(await page.evaluate(() => window.__dustlings.audio.getDiagnostics().paused), true);
  await page.locator('#resume-button').click();
  await page.waitForFunction(() => window.__dustlings.audio.getDiagnostics().contextState === 'running');
  t.diagnostic('Synthetic document.hidden event exercises application handling; not native app switching or human audio audition.');
});

test('backgrounding the already-paused completion dialog also suspends audio', async t => {
  const page = await session(t);
  await page.evaluate(() => {
    const qa = window.__dustlings;
    qa.state.completed = true; qa.state.restoration = 1; qa.state.celebration = 0;
  });
  await page.waitForFunction(() => document.querySelector('#completion').open);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(200);
  const audio = await page.evaluate(() => window.__dustlings.audio.getDiagnostics());
  assert.equal(audio.paused, true, 'completion sets simulation paused, but background audio must also pause');
  assert.equal(audio.contextState, 'suspended');
});
