const TAU = Math.PI * 2;
const GROUND_Y = .72;
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const noise = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const lerp = (a, b, t) => a + (b - a) * t;
const blend = (a, b, t) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], clamp(t)))).join(',')})`;

function ellipse(c, x, y, rx, ry, fill, stroke, line = 1) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = line; c.stroke(); }
}
function round(c, x, y, w, h, r, fill, stroke, line = 1) {
  c.beginPath(); c.roundRect(x, y, w, h, r);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = line; c.stroke(); }
}
function poly(c, points, fill, stroke, line = 1) {
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = line; c.stroke(); }
}
function line(c, x1, y1, x2, y2, color, width = 1) {
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = color; c.lineWidth = width; c.stroke();
}

/** Cozy miniature courtyard. All public coordinates are CSS pixels / world units. */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.width = 1000; this.height = 740; this.scale = 1;
    this.offsetX = 0; this.offsetY = 70;
    this.camera = { zoom: 1, centerX: 500, centerY: 390 };
    this.insets = { top: 80, bottom: 110 };
    this.staticScene = null;
    this.dustSprites = [];
    this.createArt();
  }

  resize(width, height, dpr = 1) {
    this.width = Math.max(1, width); this.height = Math.max(1, height);
    this.dpr = Math.min(2, Math.max(1, dpr));
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    // CSS owns the displayed size. Setting an inline pixel width here would lock
    // a responsive canvas at its first size and defeat its ResizeObserver.
    this.updateTransform();
  }

  setCamera(zoom, centerX = 500, centerY = 390) {
    if (typeof zoom === 'object') ({ zoom = 1, centerX = 500, centerY = 390 } = zoom);
    this.camera = { zoom: clamp(Number(zoom) || 1, 1, 3), centerX: clamp(Number(centerX) || 500, 110, 890), centerY: clamp(Number(centerY) || 390, 155, 660) };
    this.updateTransform();
  }

  setViewportInsets(top = 80, bottom = 110) {
    this.insets = { top: Math.max(0, top), bottom: Math.max(0, bottom) };
    this.updateTransform();
  }

  updateTransform() {
    const availableHeight = Math.max(100, this.height - this.insets.top - this.insets.bottom);
    this.fitScale = Math.max(.1, Math.min((this.width - 24) / 1020, (availableHeight - 24) / 638));
    const baseX = (this.width - 1000 * this.fitScale) / 2;
    const baseY = this.insets.top + (availableHeight - 638 * this.fitScale) / 2 + 83 * this.fitScale;
    this.scale = this.fitScale * this.camera.zoom;
    this.offsetX = baseX + 500 * this.fitScale - this.camera.centerX * this.scale;
    this.offsetY = baseY + 390 * GROUND_Y * this.fitScale - this.camera.centerY * GROUND_Y * this.scale;
  }

  worldToScreen(x, y) { return { x: this.offsetX + x * this.scale, y: this.offsetY + y * GROUND_Y * this.scale }; }
  screenToWorld(x, y) { return { x: (x - this.offsetX) / this.scale, y: (y - this.offsetY) / (this.scale * GROUND_Y) }; }

  createArt() {
    const layer = draw => {
      const cache = document.createElement('canvas'); cache.width = 2240; cache.height = 1480;
      const c = cache.getContext('2d'); c.scale(2, 2); c.translate(60, 100); draw(c); return cache;
    };
    this.staticScene = layer(c => this.drawGround(c));
    this.gardenLayers = [0, 1].map(life => { this.artLife = life; return layer(c => { this.drawArchitecture(c); this.drawGarden(c); }); });
    this.artLife = 1;
    for (let variant = 0; variant < 12; variant++) {
      const kind = variant % 3, seed = variant * 137 + 9;
      const sprite = document.createElement('canvas'); sprite.width = 144; sprite.height = 104;
      const d = sprite.getContext('2d'); d.translate(72, 54);
      // Broad, translucent mats join nearby piles without inventing cleanup nodes.
      const stain = d.createRadialGradient(-3, 2, 3, 0, 3, 57);
      stain.addColorStop(0, 'rgba(113,109,88,.36)'); stain.addColorStop(.5, 'rgba(123,115,92,.19)'); stain.addColorStop(1, 'rgba(123,115,92,0)');
      ellipse(d, 0, 3, 63, 39, stain);
      for (let j = 0; j < 4; j++) {
        const x = (noise(seed + j * 3) - .5) * 47, y = (noise(seed + j * 5 + 7) - .5) * 18;
        const r = 6 + noise(seed + j + 21) * 8;
        ellipse(d, x + 2, y + 3, r * 1.25, r * .47, 'rgba(76,84,65,.12)');
        ellipse(d, x, y, r, r * (.42 + noise(seed + j) * .3), ['#ada68e', '#b9ad92', '#9fa38a'][kind]);
        ellipse(d, x - 1, y - r * .25, r * .63, r * .17, 'rgba(219,211,185,.38)');
      }
      // Every node retains a centered, visible tuft even with asymmetric debris.
      ellipse(d, 0, -1, 8 + noise(seed) * 5, 5, '#b8b19a');
      for (let j = 0; j < 19; j++) {
        const x = (noise(seed + j * 4) - .5) * 81, y = (noise(seed + j * 8 + 20) - .5) * 43;
        ellipse(d, x, y, .6 + noise(j + seed) * 1.4, .4 + noise(j + seed + 1) * .7, j % 3 ? 'rgba(116,111,86,.43)' : 'rgba(222,212,182,.55)');
      }
      if (kind === 2) {
        d.save(); d.translate(12, -4); d.rotate(-.8 + noise(seed) * 1.5);
        d.beginPath(); d.moveTo(-10, 0); d.quadraticCurveTo(-3, -9, 9, 0); d.quadraticCurveTo(-3, 6, -10, 0); d.fillStyle = '#a39869'; d.fill();
        line(d, -10, 0, 10, 0, '#7e8764', .9); d.restore();
      } else if (variant % 4 === 0) {
        line(d, -17, 11, 7, 6, '#a19271', 1.6); line(d, -7, 9, -11, 4, '#a19271', 1.1);
      }
      this.dustSprites.push(sprite);
    }
  }

  drawGround(c) {
    // Soft ambient ground contact, followed by a shallow carved plinth.
    ellipse(c, 505, 496, 438, 68, 'rgba(97,108,79,.09)');
    ellipse(c, 505, 488, 418, 52, 'rgba(97,108,79,.06)');
    round(c, 76, 81, 848, 433, 45, '#c8b49a');
    round(c, 76, 65, 848, 432, 45, '#e8ddc5', '#c2b598', 2);
    round(c, 88, 70, 824, 418, 38, '#f2e8d0', '#fff4db', 2);
    round(c, 112, 93, 776, 372, 23, '#b9baa0');
    round(c, 117, 96, 766, 365, 22, '#d8cfb6');
    // Pavers are deliberately oversized: understandable shape at normal screen size.
    c.save();
    c.beginPath(); c.roundRect(118, 96, 764, 365, 21); c.clip();
    for (let row = 0; row < 11; row++) {
      for (let col = -1; col < 13; col++) {
        const n = row * 27 + col + 70, x = 112 + col * 66 + (row % 2) * 33, y = 95 + row * 35;
        const tint = noise(n);
        const tile = tint < .12 ? '#ded4bc' : tint < .4 ? '#e9dfc9' : tint < .7 ? '#e7dbc2' : '#ece3ce';
        round(c, x + 1.8, y + 1.5, 62.5, 31.8, 5, tile);
        line(c, x + 7, y + 3.2, x + 57, y + 3.2, 'rgba(255,252,234,.45)', 1.2);
        if (tint > .65) line(c, x + 10, y + 27, x + 16 + noise(n + 21) * 18, y + 27, 'rgba(166,147,111,.1)');
        for (let j = 0; j < 2; j++) ellipse(c, x + 8 + noise(n * 2 + j) * 48, y + 8 + noise(n + j + 60) * 18, .7, .5, 'rgba(151,135,101,.13)');
      }
    }
    c.restore();
    // Pale circular medallion makes the landmark legible without a UI outline.
    ellipse(c, 500, 370 * GROUND_Y, 111, 78, '#d0cbb0');
    ellipse(c, 500, 370 * GROUND_Y, 106, 74, '#eee4ca', '#f9f0db', 2);
    ellipse(c, 500, 370 * GROUND_Y, 88, 61, '#d7d2b6', '#c5c3a7', 1);
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * TAU;
      line(c, 500 + Math.cos(a) * 90, 370 * GROUND_Y + Math.sin(a) * 62, 500 + Math.cos(a) * 104, 370 * GROUND_Y + Math.sin(a) * 73, '#cdc4ac', 1.5);
    }
    // Border capstones and tiny exposed grass tufts.
    for (let i = 0; i < 17; i++) {
      round(c, 104 + i * 47, 473, 43, 10, 3, i % 3 ? '#eadfc6' : '#dfd0b5');
      line(c, 108 + i * 47, 474.5, 140 + i * 47, 474.5, '#fcf1d8');
    }
    for (let i = 0; i < 8; i++) {
      const y = 123 + i * 42;
      round(c, 90, y, 15, 37, 3, '#e6dac0'); round(c, 895, y, 15, 37, 3, '#e6dac0');
    }
    // Front steps give the whole world the scale of a treasured tabletop model.
    round(c, 447, 505, 106, 15, 5, '#c7b599');
    round(c, 438, 515, 124, 12, 4, '#d4c3a5');
    round(c, 430, 525, 140, 10, 4, '#e2d3b7');
    line(c, 434, 527, 566, 527, '#f5e9d0', 2);
  }

  drawArchitecture(c) {
    this.house(c, 229, 99, 143, 92, 'terracotta');
    this.house(c, 751, 98, 147, 103, 'sage');
    // Rear wall with a passage hinting at the village beyond.
    for (const [x, w] of [[349, 95], [558, 93]]) {
      round(c, x, 37, w, 45, 5, '#d2ccb2');
      for (let r = 0; r < 3; r++) for (let col = 0; col < 3; col++) round(c, x + col * 34 - (r % 2) * 11, 42 + r * 12, 31, 10, 2, '#dfd8bd');
      round(c, x - 5, 30, w + 10, 9, 3, '#eee5cd');
    }
    // An open garden gate; black-green iron kept light enough for friendly scale.
    for (const x of [445, 555]) {
      round(c, x - 7, 22, 14, 62, 3, '#c8c7a9'); round(c, x - 10, 17, 20, 8, 3, '#ebe3c9');
      ellipse(c, x, 13, 6, 5, '#cbcbb0');
    }
    c.strokeStyle = '#778776'; c.lineWidth = 3; c.beginPath(); c.moveTo(454, 72); c.lineTo(454, 36); c.bezierCurveTo(470, 24, 484, 34, 484, 46); c.lineTo(484, 78); c.stroke();
    for (const x of [463, 474]) line(c, x, 40, x, 76, '#86917b', 2);
    line(c, 454, 58, 484, 65, '#86917b', 2);
    this.shrub(c, 386, 35, 30, 1); this.shrub(c, 611, 32, 32, 2);
  }

  house(c, x, foot, width, height, style) {
    c.save(); c.translate(x, foot);
    const left = -width / 2, top = -height;
    ellipse(c, 10, 4, width * .59, 14, 'rgba(83,98,71,.12)');
    // Side wall and front wall share a strict shallow perspective.
    poly(c, [[left + width, top + 14], [left + width + 24, top], [left + width + 24, -14], [left + width, 4]], '#c5c5a7');
    round(c, left, top + 5, width, height, 5, '#f0e5cc');
    round(c, left + 4, -5, width - 8, 9, 2, '#d8c9ac');
    const roof = style === 'sage' ? '#7b9882' : '#c98769';
    const roofDark = style === 'sage' ? '#617d69' : '#b07459';
    poly(c, [[left - 12, top + 10], [left + 17, top - 30], [width / 2 + 24, top - 30], [width / 2 + 14, top + 10]], roof, roofDark, 2);
    poly(c, [[width / 2 + 14, top + 10], [width / 2 + 24, top - 30], [width / 2 + 36, top - 4]], roofDark);
    for (let r = 0; r < 4; r++) {
      const ry = top - 22 + r * 9;
      line(c, left + 13 - r * 6, ry, width / 2 + 18 - r, ry, style === 'sage' ? '#a0b299' : '#dd9e7a', 1.5);
      for (let col = 0; col < 7; col++) line(c, left + 20 + col * 19 + (r % 2) * 8 - r * 4, ry, left + 16 + col * 19 + (r % 2) * 8 - r * 4, ry + 7, 'rgba(65,76,52,.15)', 1);
    }
    round(c, left - 10, top + 8, width + 25, 6, 2, roofDark);
    round(c, width * .22, top - 44, 16, 27, 2, '#cbb8a1'); round(c, width * .22 - 3, top - 47, 22, 6, 2, '#e0cfb5');
    // Tall rounded door and a warm window, with a readable little doorstep.
    round(c, -20, -53, 38, 54, [19, 19, 2, 2], style === 'sage' ? '#aa8666' : '#738b77', '#d5c9ad', 4);
    for (let i = 0; i < 4; i++) line(c, -14 + i * 8, -32, -14 + i * 8, -3, 'rgba(49,65,50,.18)', 1);
    ellipse(c, 9, -22, 2.3, 2.3, '#e7d29d');
    for (const wx of [-width * .34, width * .32]) {
      round(c, wx - 13, -64, 26, 31, [9, 9, 2, 2], '#71857a', '#d6cdb3', 4);
      round(c, wx - 10, -60, 20, 23, [6, 6, 0, 0], '#c7d6bd');
      line(c, wx, -60, wx, -36, '#f6ebcc', 2); line(c, wx - 10, -48, wx + 10, -48, '#f6ebcc', 2);
      round(c, wx - 17, -34, 34, 6, 2, '#bba78a');
    }
    round(c, -27, 1, 51, 7, 3, '#e1d2b3');
    // Tiny imperfect plaster marks and a round house plaque.
    ellipse(c, 0, -70, 8, 7, '#dfd1b3'); ellipse(c, 0, -71, 3, 2, '#9ca788');
    for (let i = 0; i < 22; i++) ellipse(c, left + 8 + noise(i + x) * (width - 16), top + 22 + noise(i + 84) * (height - 30), .6, .4, 'rgba(155,137,105,.18)');
    c.restore();
    this.pot(c, x - width / 2 - 9, foot + 1, 12, 2);
    this.pot(c, x + width / 2 + 11, foot + 5, 10, 1);
  }

  shrub(c, x, y, size, seed = 1) {
    const alive = this.artLife !== 0;
    size *= alive ? 1 : .83;
    ellipse(c, x + 3, y + 4, size, size * .27, 'rgba(87,104,68,.12)');
    const palette = alive ? ['#839773', '#9caa83', '#b1b793', '#617e65'] : ['#959984', '#a6a88f', '#b5b298', '#77846e'];
    for (let j = 0; j < (alive ? 12 : 8); j++) {
      const a = noise(seed * 20 + j) * TAU, r = noise(seed + j * 11) * size * .6;
      const lx = x + Math.cos(a) * r, ly = y - size * .35 + Math.sin(a) * r * .54;
      ellipse(c, lx, ly, size * .38, size * .29, palette[j % 4]);
    }
    for (let j = 0; j < 7; j++) {
      const lx = x + (noise(seed + j) - .5) * size * 1.4, ly = y - size * .3 - noise(seed + j + 38) * size * .3;
      ellipse(c, lx, ly, 1.3, .9, alive ? '#c4cba7' : '#c1bba0');
    }
    if (!alive) for (let j = 0; j < 3; j++) { const sx = x + (noise(seed + j) - .5) * size; line(c, sx, y - size * .15, sx - 3, y - size * .8, '#8f9075', 1); }
  }

  pot(c, x, y, r, flowers = 0) {
    ellipse(c, x + 3, y + 2, r * 1.15, r * .36, 'rgba(88,86,59,.15)');
    poly(c, [[x - r, y - r * 1.2], [x + r, y - r * 1.2], [x + r * .74, y], [x - r * .74, y]], '#bd896d');
    ellipse(c, x, y - r * 1.2, r, r * .34, '#d5a186');
    ellipse(c, x, y - r * 1.3, r * .77, r * .24, '#8a8060');
    this.shrub(c, x, y - r * 1.5, r * 1.25, Math.round(x));
    if (flowers) for (let j = 0; j < 5; j++) {
      const fx = x + (noise(j + x) - .5) * r * 1.8, fy = y - r * (1.7 + noise(j + 7) * .8);
      this.flower(c, fx, fy, 2.5, flowers === 2 ? '#f4d897' : '#e5b3a8');
    }
  }

  flower(c, x, y, r, color = '#efd39b') {
    if (this.artLife === 0) return;
    for (let i = 0; i < 5; i++) ellipse(c, x + Math.cos(i * TAU / 5) * r * .7, y + Math.sin(i * TAU / 5) * r * .7, r * .6, r * .5, color);
    ellipse(c, x, y, r * .4, r * .32, '#bf9463');
  }

  drawGarden(c) {
    // The planting stays outside the reachable play field.
    for (const [x, y, w, h] of [[37, 163, 59, 122], [906, 170, 58, 128], [104, 475, 195, 25], [701, 475, 195, 25]]) {
      round(c, x + 3, y + 6, w, h, 14, '#c3b08c');
      round(c, x, y, w, h, 14, '#d9caad', '#eddfc1', 2);
      round(c, x + 6, y + 5, w - 12, h - 10, 11, this.artLife === 0 ? '#999478' : '#8c9871');
      const count = w > h ? 7 : 5;
      for (let j = 0; j < count; j++) {
        const sx = w > h ? x + 18 + j * (w - 36) / (count - 1) : x + w / 2 + (j % 2 ? 8 : -7);
        const sy = w > h ? y + 10 : y + 17 + j * (h - 30) / (count - 1);
        this.shrub(c, sx, sy, w > h ? 19 : 20, j + x);
        for (let k = 0; k < 3; k++) this.flower(c, sx + (noise(j * 7 + k) - .5) * 25, sy - 10 - noise(j + k) * 8, 2.6, j % 3 ? '#f2d79f' : '#d7b0a8');
      }
    }
    this.pot(c, 347, 489, 15, 2); this.pot(c, 652, 488, 15, 1);
    // A bench and a watering can make the miniature scale familiar.
    c.save(); c.translate(67, 368);
    ellipse(c, 3, 5, 28, 12, 'rgba(90,90,65,.13)');
    for (const x of [-19, 19]) { line(c, x, -7, x + 2, 7, '#798775', 4); line(c, x, -33, x, -5, '#798775', 3); }
    round(c, -27, -36, 54, 9, 3, '#b99b6c'); round(c, -27, -24, 54, 8, 2, '#c4a77a'); round(c, -29, -9, 58, 12, 3, '#d0b789');
    line(c, -25, -5, 25, -5, '#ebd19b', 1.5); c.restore();
    c.save(); c.translate(931, 383); c.rotate(.12);
    ellipse(c, 3, 6, 17, 5, 'rgba(87,98,73,.12)');
    round(c, -9, -15, 18, 21, 5, '#7eaaa0'); ellipse(c, 0, -15, 9, 3, '#a9c6b0');
    poly(c, [[6, -9], [19, -18], [22, -16], [9, 1]], '#7eaaa0');
    c.beginPath(); c.ellipse(-12, -7, 8, 10, -.3, .8, 5.5); c.strokeStyle = '#6e978c'; c.lineWidth = 3; c.stroke(); c.restore();
    // Paired lanterns act as quiet entrance markers.
    for (const x of [379, 620]) {
      ellipse(c, x + 3, 500, 10, 3, 'rgba(86,98,68,.14)');
      round(c, x - 3, 468, 6, 32, 2, '#768777');
      round(c, x - 9, 450, 18, 21, 3, '#d9c795', '#718272', 2);
      line(c, x, 451, x, 469, '#7b8b76', 2);
      poly(c, [[x - 12, 450], [x, 442], [x + 12, 450]], '#81917a');
    }
  }

  render(state, time = 0) {
    const c = this.ctx, t = state.reducedMotion ? 0 : (state.elapsed ?? time / 1000);
    c.setTransform(this.dpr || 1, 0, 0, this.dpr || 1, 0, 0);
    c.fillStyle = '#f4f0e5'; c.fillRect(0, 0, this.width, this.height);
    // A radial pool of warmth keeps the scene distinct from flat UI panels.
    const bg = c.createRadialGradient(this.width * .5, this.height * .52, 1, this.width * .5, this.height * .52, Math.max(this.width, this.height) * .6);
    bg.addColorStop(0, '#edf0df'); bg.addColorStop(1, '#f4f0e5'); c.fillStyle = bg; c.fillRect(0, 0, this.width, this.height);
    c.save();
    c.beginPath(); c.rect(0, this.insets.top, this.width, Math.max(1, this.height - this.insets.top - this.insets.bottom)); c.clip();
    c.translate(this.offsetX, this.offsetY); c.scale(this.scale, this.scale);
    c.drawImage(this.staticScene, -60, -100, 1120, 740);
    this.drawDust(c, state.dust || []);
    c.drawImage(this.gardenLayers[0], -60, -100, 1120, 740);
    const gardenLife = clamp((state.cleaned || 0) / Math.max(1, state.totalDust || 1) * .72 + (state.restoration || 0) * .28);
    if (gardenLife > 0) { c.globalAlpha = gardenLife; c.drawImage(this.gardenLayers[1], -60, -100, 1120, 740); c.globalAlpha = 1; }
    this.drawGuides(c, state, t);
    const actors = (state.creatures || []).map(creature => ({ y: creature.y, creature }));
    actors.push({ y: 386, fountain: true }); actors.sort((a, b) => a.y - b.y);
    for (const actor of actors) actor.fountain ? this.drawFountain(c, state, t) : this.drawCreature(c, actor.creature, state, t);
    this.drawParticles(c, state.particles || []);
    if (state.celebration > 0 && !state.reducedMotion) this.drawCelebration(c, state, t);
    this.drawPointer(c, state, t);
    c.restore();
  }

  drawDust(c, dust) {
    c.save(); c.beginPath(); c.roundRect(108, 155 * GROUND_Y, 784, (660 - 155) * GROUND_Y, 12); c.clip();
    for (const d of dust) {
      if (d.amount <= .002) continue;
      const amount = clamp(d.amount / (d.initial || 1));
      const seed = typeof d.id === 'number' ? d.id : d.x + d.y;
      const size = (.70 + noise(seed + 7) * .65) * (.65 + Math.sqrt(amount) * .35);
      const variant = (Math.abs(d.kind || 0) % 3) + Math.floor(noise(seed + 481) * 4) * 3;
      c.save(); c.translate(d.x, d.y * GROUND_Y); c.rotate((noise(seed + 39) - .5) * .8);
      c.globalAlpha = clamp(amount * 1.15);
      c.drawImage(this.dustSprites[variant], -48 * size, -36 * size, 96 * size, 69.333 * size);
      c.restore();
    }
    c.restore();
  }

  drawGuides(c, state, t) {
    if (state.assignment) {
      const { x, y } = state.assignment, py = y * GROUND_Y;
      const pulse = Math.sin(t * 4) * 1.5;
      ellipse(c, x, py, 23 + pulse, 15 + pulse * .72, 'rgba(72,132,114,.10)', '#648e76', 1.8);
      ellipse(c, x, py, 5, 3, '#75937a');
      line(c, x, py - 2, x, py - 34, '#648470', 2.3);
      c.beginPath(); c.moveTo(x + 1, py - 34); c.quadraticCurveTo(x + 9, py - 38, x + 17, py - 30); c.quadraticCurveTo(x + 9, py - 24, x + 1, py - 28); c.closePath(); c.fillStyle = '#e1b66f'; c.fill();
      if (state.assignmentPulse > 0) { c.globalAlpha = clamp(state.assignmentPulse); ellipse(c, x, py, 23 + (1 - clamp(state.assignmentPulse)) * 33, 16 + (1 - clamp(state.assignmentPulse)) * 23, null, '#6b967c', 2); c.globalAlpha = 1; }
    }
    if (state.hintTarget && !state.creatures?.length) {
      const { x, y } = state.hintTarget, pulse = .5 + Math.sin(t * 3) * .5;
      ellipse(c, x, y * GROUND_Y, 30 + pulse * 4, 21 + pulse * 3, 'rgba(255,249,218,.18)', '#e6bd73', 2);
      c.save(); c.setLineDash([2, 7]); ellipse(c, x, y * GROUND_Y, 40, 28, null, 'rgba(179,153,92,.6)', 1.5); c.restore();
    }
  }

  drawFountain(c, state, t) {
    const p = clamp(state.restoration || 0), x = 500, y = 370 * GROUND_Y;
    const stone = blend([165, 162, 139], [235, 230, 205], p);
    const side = blend([131, 140, 120], [195, 206, 178], p);
    const light = blend([184, 181, 153], [255, 245, 219], p);
    c.save(); c.translate(x, y);
    ellipse(c, 7, 27, 90, 45, 'rgba(82,101,78,.13)');
    // Low octagonal basin: unlike a tall monument it does not hide work destinations.
    const rim = (cy, rx, ry) => Array.from({ length: 8 }, (_, i) => { const a = (i / 8 + 1 / 16) * TAU; return [Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
    poly(c, rim(14, 83, 51), side, '#a7b397', 1);
    for (let i = 0; i < 8; i++) { const a = (i / 8 + 1 / 16) * TAU; if (Math.sin(a) > 0) line(c, Math.cos(a) * 83, 4 + Math.sin(a) * 51, Math.cos(a) * 83, 14 + Math.sin(a) * 51, 'rgba(109,130,104,.25)', 1); }
    poly(c, rim(3, 83, 51), stone, light, 3);
    poly(c, rim(2, 69, 40), blend([121, 139, 118], [114, 180, 163], p), blend([148, 153, 124], [169, 213, 184], p), 2);
    if (p > .22) {
      const waterAlpha = clamp((p - .22) / .65);
      c.globalAlpha = waterAlpha;
      const water = c.createLinearGradient(0, -35, 0, 43); water.addColorStop(0, '#8ec4b0'); water.addColorStop(.7, '#62a99c'); water.addColorStop(1, '#a9d5bd');
      poly(c, rim(3, 66, 37), water);
      c.save(); c.beginPath(); rim(3, 65, 36).forEach(([px, py], i) => i ? c.lineTo(px, py) : c.moveTo(px, py)); c.closePath(); c.clip();
      for (let i = 0; i < 5; i++) { const r = 15 + ((t * 8 + i * 13) % 58); c.globalAlpha = waterAlpha * (1 - r / 80) * .6; ellipse(c, 0, 6, r, r * .48, null, '#e4f1cd', 1.2); }
      c.restore(); c.globalAlpha = 1;
    }
    // Pedestal is a friendly turned shape with an acorn finial.
    ellipse(c, 0, 12, 25, 13, side); ellipse(c, 0, 7, 25, 12, stone, light, 1.5);
    c.beginPath(); c.moveTo(-13, 5); c.bezierCurveTo(-8, -9, -8, -32, -14, -40); c.lineTo(14, -40); c.bezierCurveTo(8, -28, 8, -7, 13, 5); c.closePath(); c.fillStyle = stone; c.fill();
    c.beginPath(); c.moveTo(-4, 1); c.bezierCurveTo(-1, -12, -3, -24, -5, -35); c.strokeStyle = light; c.lineWidth = 4; c.stroke();
    ellipse(c, 0, -39, 34, 13, side);
    c.beginPath(); c.moveTo(-34, -43); c.quadraticCurveTo(-26, -19, 0, -21); c.quadraticCurveTo(26, -20, 34, -43); c.closePath(); c.fillStyle = stone; c.fill();
    ellipse(c, 0, -43, 34, 13, light);
    ellipse(c, 0, -44, 28, 9, p > .5 ? '#83b7a1' : '#929c80');
    if (p > .55) {
      c.globalAlpha = clamp((p - .55) * 3);
      for (const sx of [-27, 27]) {
        c.beginPath(); c.moveTo(sx, -40); c.bezierCurveTo(sx * 1.3, -26, sx * 1.15 + Math.sin(t * 3) * 1.5, -4, sx * 1.35, 6); c.strokeStyle = '#cce8cc'; c.lineWidth = 3; c.stroke();
        ellipse(c, sx * 1.35, 7, 6 + Math.sin(t * 5) * 1.5, 2.5, null, '#cbe5c7', 1);
      }
      c.globalAlpha = 1;
    }
    round(c, -6, -66, 12, 22, 5, stone); ellipse(c, 0, -67, 11, 8, light);
    ellipse(c, 0, -73, 7, 8, p > .75 ? '#d7bb80' : '#949e7d');
    if (p > .85) {
      c.globalAlpha = clamp((p - .85) / .15);
      c.beginPath(); c.moveTo(0, -69); c.bezierCurveTo(-12, -98, -24, -82, -19, -46); c.moveTo(0, -69); c.bezierCurveTo(12, -98, 24, -82, 19, -46); c.strokeStyle = '#d3ecda'; c.lineWidth = 2; c.stroke();
      ellipse(c, -19, -46, 4 + Math.sin(t * 5), 1.5, '#dbeed5'); ellipse(c, 19, -46, 4 + Math.cos(t * 5), 1.5, '#dbeed5'); c.globalAlpha = 1;
    }
    // Weathering recedes with actual restoration progress.
    c.globalAlpha = (1 - p) * .9;
    for (let i = 0; i < 20; i++) { const a = noise(i) * Math.PI; ellipse(c, Math.cos(a) * (72 + noise(i + 9) * 8), 3 + Math.sin(a) * 48, 4 + noise(i + 33) * 5, 2 + noise(i + 77) * 2, i % 2 ? '#879879' : '#9a9d7c'); }
    ellipse(c, -21, -31, 7, 3, '#91a080'); ellipse(c, 8, -7, 4, 5, '#899a7b'); c.globalAlpha = 1;
    // Small daisies celebrate a cared-for place; no large particle cloud hides it.
    if (p > .45) {
      const bloom = clamp((p - .45) / .55);
      for (let i = 0; i < 7; i++) {
        const a = .12 + i / 6 * (Math.PI - .24), fx = Math.cos(a) * 86, fy = Math.sin(a) * 50 + 12;
        c.globalAlpha = bloom; line(c, fx, fy, fx - 1, fy - 9 * bloom, '#87a17d', 1.3); this.flower(c, fx - 1, fy - 9 * bloom, 3 * bloom, i % 2 ? '#f7e7bb' : '#e8bdaf');
      }
      c.globalAlpha = 1;
    }
    c.restore();
  }

  drawCreature(c, creature, state, t) {
    const age = Math.max(0, (state.elapsed || 0) - (creature.born || 0));
    const birth = clamp(age / .65);
    const phase = creature.phase || creature.id || 0;
    const moving = Math.hypot((creature.tx ?? creature.x) - creature.x, (creature.ty ?? creature.y) - creature.y) > 5;
    const singing = !!(state.ritual || state.completed);
    const working = creature.work > 0 && !singing;
    const walk = state.reducedMotion ? 0 : Math.sin(t * (working ? 13 : moving ? 10 : 2.4) + phase);
    const radius = 9.7 + noise(phase + 5) * 1.8;
    const hop = moving || working ? Math.abs(walk) * 2.2 : Math.sin(t * 2.4 + phase) * .45;
    const opticalSize = clamp(.65 / this.scale, 1, 1.35);
    const bornScale = (birth < 1 ? .35 + .65 * Math.sin(birth * Math.PI / 2) : 1) * opticalSize;
    const x = creature.x, y = creature.y * GROUND_Y;
    ellipse(c, x + 1.5, y + 1, radius * .95 * bornScale, radius * .34 * bornScale, 'rgba(85,93,72,.21)');
    c.save(); c.translate(x, y); c.scale(bornScale, bornScale);
    // Feet touch the shadow. Only the body hops, preventing a floating silhouette.
    ellipse(c, -4.4 - walk * 1.3, -1 + Math.max(0, -walk), 3.2, 1.8, '#b79559');
    ellipse(c, 4.4 + walk * 1.3, -1 + Math.max(0, walk), 3.2, 1.8, '#c6a66a');
    c.translate(0, -radius * .75 - hop);
    const squash = working ? 1 + walk * .035 : 1;
    c.scale(squash, 1 / squash);
    // Eight soft lobes retain a distinct scalloped silhouette in a busy crowd.
    for (let i = 0; i < 9; i++) {
      const a = (i + .2) / 9 * TAU;
      ellipse(c, Math.cos(a) * radius * .68, Math.sin(a) * radius * .64, radius * .39, radius * .37, i > 0 && i < 4 ? '#bec2ac' : '#d4d8c2');
    }
    const fur = c.createRadialGradient(-3, -4, 1, 0, 0, radius * 1.2); fur.addColorStop(0, '#f1edd6'); fur.addColorStop(.62, '#e0dfc7'); fur.addColorStop(1, '#b9c1aa');
    ellipse(c, 0, 0, radius * .93, radius * .89, fur);
    // A mint leaf is the crew's shared identity; angle adds individuality.
    c.save(); c.translate(1.5, -radius * .8); c.rotate(-.22 + walk * .07 + Math.sin(phase) * .15);
    line(c, 0, 1, 2, -6, '#7a9974', 1.4);
    c.beginPath(); c.moveTo(1, -3); c.bezierCurveTo(-5, -13, -9, -9, -7, -5); c.quadraticCurveTo(-3, -2, 1, -3); c.fillStyle = '#a5b991'; c.fill();
    c.beginPath(); c.moveTo(1, -4); c.bezierCurveTo(3, -13, 10, -14, 10, -10); c.quadraticCurveTo(9, -4, 1, -4); c.fillStyle = '#799d7e'; c.fill(); line(c, 3, -5, 8, -10, '#bfd0a2', .7); c.restore();
    const dir = creature.dir || 0, gazeX = moving ? Math.cos(dir) * 1.5 : 0, gazeY = moving ? Math.sin(dir) * .65 : .25;
    const blink = !state.reducedMotion && Math.sin(t * 1.1 + phase * 2) > .995;
    for (const eyeX of [-3.5, 3.5]) {
      if (blink) line(c, eyeX - 1.4 + gazeX, -1 + gazeY, eyeX + 1.4 + gazeX, -1 + gazeY, '#415850', 1.2);
      else { ellipse(c, eyeX + gazeX, -1 + gazeY, 1.55, 2.0, '#415850'); ellipse(c, eyeX - .4 + gazeX, -1.7 + gazeY, .4, .5, '#fff9df'); }
    }
    ellipse(c, -6, 2.2, 2, 1.0, 'rgba(207,143,119,.35)'); ellipse(c, 6, 2.2, 2, 1, 'rgba(207,143,119,.35)');
    if (singing && !moving) ellipse(c, gazeX, 3.4, 1.25, 1.5 + Math.sin(t * 3.5 + phase) * .3, '#718272');
    else { c.beginPath(); c.moveTo(-1.7 + gazeX, 3); c.quadraticCurveTo(gazeX, working ? 5.4 : 4.3, 1.7 + gazeX, 3); c.strokeStyle = '#718272'; c.lineWidth = .9; c.stroke(); }
    // Fuzzy glints limited to three strokes so texture does not overwhelm eyes.
    line(c, -5, -7, -3.4, -8, '#f5f0d9', .9); line(c, -1, -8, .2, -9, '#f5f0d9', .9); line(c, 6, -5, 7, -4, '#f5f0d9', .9);
    if (working) {
      c.save(); c.translate(8, 6); c.rotate(.5 + walk * .35);
      line(c, 0, -3, 5, 4, '#9c8862', 1.7); poly(c, [[2, 3], [7, 0], [10, 5], [5, 8]], '#c6b787');
      line(c, 5, 4, 7, 7, '#e6d6a3', .8); c.restore();
    }
    if (singing && !moving && creature.id % 7 === 0 && !state.reducedMotion) {
      const float = (t * .65 + phase) % 1;
      c.globalAlpha = Math.sin(float * Math.PI) * .72;
      ellipse(c, 12, -17 - float * 12, 2.1, 1.4, '#7b9d81');
      line(c, 13.8, -17 - float * 12, 13.8, -24 - float * 12, '#7b9d81', 1.1);
      line(c, 13.8, -24 - float * 12, 17, -23 - float * 12, '#7b9d81', 1.1);
      c.globalAlpha = 1;
    }
    c.restore();
  }

  drawParticles(c, particles) {
    for (const p of particles) {
      c.globalAlpha = clamp(p.life / (p.maxLife || 1));
      ellipse(c, p.x, p.y * GROUND_Y, Math.max(.2, p.size || 2), Math.max(.2, (p.size || 2) * .8), p.color || '#d7c79d');
    }
    c.globalAlpha = 1;
  }

  drawCelebration(c, state, t) {
    const alpha = clamp(state.celebration / 2);
    for (let i = 0; i < 22; i++) {
      const angle = i / 22 * TAU, radius = 100 + Math.sin(t + i) * 15;
      const x = 500 + Math.cos(angle) * radius, y = 370 * GROUND_Y + Math.sin(angle) * radius * .5 - 20 - ((t * 15 + i * 5) % 55);
      c.globalAlpha = alpha * (.4 + noise(i) * .5);
      c.save(); c.translate(x, y); c.rotate(t + i); ellipse(c, 0, 0, 2.4, 1.2, i % 2 ? '#d8ac6d' : '#91ae83'); c.restore();
    }
    c.globalAlpha = 1;
  }

  drawPointer(c, state, t) {
    const p = state.pointer;
    if (!p?.inside) return;
    const x = p.x, y = p.y * GROUND_Y, radius = state.mode === 'direct' ? 20 : state.brushRadius || 35;
    c.save(); c.globalAlpha = p.touch && !p.active && !p.preview ? 0 : 1;
    if (state.mode === 'direct') {
      c.setLineDash([4, 5]); ellipse(c, x, y, radius, radius * GROUND_Y, 'rgba(232,243,217,.12)', '#638b73', 1.8);
      c.setLineDash([]); line(c, x - 4, y, x + 4, y, '#638b73', 1.5); line(c, x, y - 3, x, y + 3, '#638b73', 1.5);
    } else {
      ellipse(c, x, y, radius, radius * GROUND_Y, p.active ? 'rgba(255,249,212,.16)' : 'rgba(255,251,230,.07)', p.active ? '#f9edc0' : 'rgba(116,131,104,.55)', 1.6);
      if (p.active) {
        c.beginPath(); c.ellipse(x, y, radius + 3, radius * GROUND_Y + 3, 0, t * 3, t * 3 + 1.3); c.strokeStyle = '#c5a774'; c.lineWidth = 2.5; c.stroke();
      }
      // Touch gets an offset marker so the finger never covers its feedback.
      if (p.touch && p.active) {
        line(c, x, y - radius * GROUND_Y - 3, x, y - radius * GROUND_Y - 18, 'rgba(115,134,107,.5)', 1.1);
        ellipse(c, x, y - radius * GROUND_Y - 22, 3, 3, '#8aa27e', '#f9f0d4', 1.5);
      }
    }
    c.restore();
  }
}
