// Native prototype icon; retain the original Dustlings favicon geometry.
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'platforms/shared');
await mkdir(out, { recursive: true });
const html = await readFile(join(root, 'index.html'), 'utf8');
const encoded = html.match(/<link rel="icon" href="data:image\/svg\+xml,([^"]+)"/)[1];
const original = decodeURIComponent(encoded);
// The opaque cream already used in style.css avoids desktop wallpaper changing
// eye/body contrast and is suitable for an eventual Apple app-icon source.
const svg = original.replace(/(<svg[^>]*>)/, '$1<rect width="40" height="40" fill="#f6f3e9"/>');
await writeFile(join(out, 'app-icon.svg'), svg + '\n');
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage({ deviceScaleFactor: 1 });
const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];
const pngs = new Map();
try {
  for (const size of sizes) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;overflow:hidden}svg{display:block;width:100%;height:100%}</style>${svg}`);
    const buffer = await page.screenshot();
    pngs.set(size, buffer);
    await writeFile(join(out, `app-icon-${size}.png`), buffer);
  }
  await page.setViewportSize({ width: 920, height: 450 });
  await page.setContent(`<style>body{margin:0;background:#e9e7dc;color:#32483e;font:14px system-ui;padding:24px}h1{font-size:18px;margin:0 0 24px}.icons{display:flex;align-items:end;gap:28px}.item{text-align:center}img{display:block;margin:0 auto 12px}p{max-width:750px;margin:24px 0;font-size:13px}</style><h1>Dustlings — provisional native icon, actual pixel sizes</h1><div class="icons">${[16,32,48,64,128,256].map(size => `<div class="item"><img src="data:image/png;base64,${pngs.get(size).toString('base64')}" width="${size}" height="${size}">${size}px</div>`).join('')}</div><p>Existing favicon shapes and colors, on the game's cream background. Packaging identity only; creature appeal and storefront artwork need human review.</p>`);
  await page.screenshot({ path: join(out, 'icon-size-review.png') });
} finally { await browser.close(); }

const icoSizes = [16, 32, 48, 64, 128, 256];
const icoHeader = Buffer.alloc(6 + icoSizes.length * 16);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(icoSizes.length, 4);
let offset = icoHeader.length;
for (const [i, size] of icoSizes.entries()) {
  const entry = 6 + i * 16;
  const png = pngs.get(size);
  icoHeader[entry] = size === 256 ? 0 : size;
  icoHeader[entry + 1] = size === 256 ? 0 : size;
  icoHeader.writeUInt16LE(1, entry + 4);
  icoHeader.writeUInt16LE(32, entry + 6);
  icoHeader.writeUInt32LE(png.length, entry + 8);
  icoHeader.writeUInt32LE(offset, entry + 12);
  offset += png.length;
}
await writeFile(join(out, 'app-icon.ico'), Buffer.concat([icoHeader, ...icoSizes.map(size => pngs.get(size))]));
const iconset = join(out, 'Dustlings.iconset');
await mkdir(iconset, { recursive: true });
for (const size of [16, 32, 128, 256, 512]) {
  await copyFile(join(out, `app-icon-${size}.png`), join(iconset, `icon_${size}x${size}.png`));
  await copyFile(join(out, `app-icon-${size * 2}.png`), join(iconset, `icon_${size}x${size}@2x.png`));
}
execFileSync('/usr/bin/iconutil', ['--convert', 'icns', '--output', join(out, 'app-icon.icns'), iconset]);
const hash = buffer => createHash('sha256').update(buffer).digest('hex');
const files = ['app-icon.svg', ...sizes.map(size => `app-icon-${size}.png`), 'app-icon.ico', 'app-icon.icns', 'icon-size-review.png'];
const artifacts = [];
for (const name of files) {
  const buffer = await readFile(join(out, name));
  artifacts.push({ path: name, bytes: buffer.length, sha256: hash(buffer) });
}
await writeFile(join(out, 'icon-manifest.json'), JSON.stringify({ source: 'index.html favicon data URI', sourceSvgSha256: hash(original), change: 'Add opaque #f6f3e9 background from style.css; preserve favicon geometry and colors.', generatedWith: 'Playwright Chromium rasterization; PNG-compressed multi-resolution ICO; macOS iconutil ICNS', pngSizes: sizes, icoSizes, humanApproved: false, artifacts }, null, 2) + '\n');
console.log(`Wrote native prototype icons to ${out}`);
