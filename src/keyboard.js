import { walkable } from './game.js';

const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
const bounded = (value, min, max) => Math.max(min, Math.min(max, value));

/** Keyboard controller with no global event listeners. Root owns event routing. */
export function createKeyboardControls({ canvas, getState, renderer, onMode = () => {}, onAssign = () => {}, onPan = () => {}, onNotice = () => {}, onChange = () => {} }) {
  const held = new Set();
  let enabled = false;
  let brushing = false;
  let cursor = { x: 270, y: 505 };
  let lastHintId = null;

  function focused() { return canvas?.ownerDocument?.activeElement === canvas; }
  function changed() { onChange({ ...cursor, brushing, enabled }); }
  function applyCursor() {
    const state = getState();
    state.pointer = { ...state.pointer, ...cursor, inside: true, touch: false, keyboard: true, active: brushing && state.mode === 'brush', preview: state.mode === 'direct' };
  }
  function activate() {
    if (!enabled) {
      const state = getState();
      const point = state.pointer || state.hintTarget || cursor;
      cursor = { x: bounded(Number.isFinite(point.x) ? point.x : 270, 113, 887), y: bounded(Number.isFinite(point.y) ? point.y : 505, 158, 657) };
      enabled = true;
    }
    applyCursor();
  }
  function keepVisible() {
    if (typeof renderer?.worldToScreen !== 'function') return;
    const width = renderer.width || canvas.clientWidth;
    const height = renderer.height || canvas.clientHeight;
    if (!width || !height) return;
    const point = renderer.worldToScreen(cursor.x, cursor.y);
    const top = Math.min(height / 3, (renderer.insets?.top || 25) + 18);
    const bottom = Math.max(top + 40, height - (renderer.insets?.bottom || 25) - 18);
    const x = bounded(point.x, 30, Math.max(31, width - 30));
    const y = bounded(point.y, top, bottom);
    const scale = Math.max(.1, Number(renderer.scale) || 1);
    if (Math.abs(point.x - x) > .5 || Math.abs(point.y - y) > .5) onPan((point.x - x) / scale, (point.y - y) / (scale * .72));
  }
  function move(dx, dy, pixels) {
    const scale = Math.max(.1, Number(renderer?.scale) || 1);
    cursor.x = bounded(cursor.x + dx * pixels / scale, 113, 887);
    cursor.y = bounded(cursor.y + dy * pixels / (scale * .72), 158, 657);
    applyCursor();
    keepVisible();
  }
  function aimAtDust() {
    activate();
    const state = getState();
    const remaining = state.dust.filter(d => d.amount > .00001);
    if (!remaining.length) { onNotice('Every dust patch is clear.'); return; }
    const radius = state.brushRadius || 44;
    const near = (a, b) => Math.hypot(a.x - cursor.x, a.y - cursor.y) - Math.hypot(b.x - cursor.x, b.y - cursor.y) || a.id - b.id;
    // An explicit Next moves to a fresh patch beyond the current brush when possible.
    const outside = remaining.filter(d => d.id !== lastHintId && Math.hypot(d.x - cursor.x, d.y - cursor.y) > radius * 1.05);
    const target = (outside.length ? outside : remaining.filter(d => d.id !== lastHintId).length ? remaining.filter(d => d.id !== lastHintId) : remaining).sort(near)[0];
    cursor = { x: target.x, y: target.y }; lastHintId = target.id;
    applyCursor();
    keepVisible();
    const horizontal = cursor.x < 390 ? 'left' : cursor.x > 610 ? 'right' : 'middle';
    const vertical = cursor.y < 320 ? 'upper' : cursor.y > 480 ? 'lower' : 'central';
    onNotice(`${remaining.length} dust patches remain. Aiming at the ${vertical} ${horizontal} courtyard. ${state.mode === 'direct' ? 'Press Enter to send the crew.' : brushing ? 'Your brush is sweeping here. Space stops it.' : 'Press Space to sweep here.'}`);
    changed();
  }

  function handleKeyDown(event) {
    if (!focused() || event.altKey || event.ctrlKey || event.metaKey) return false;
    const key = event.key;
    if (ARROWS[key]) {
      const [dx, dy] = ARROWS[key];
      if (event.shiftKey) { held.delete(key); onPan(dx * 42, dy * 42); return true; }
      activate();
      if (!held.has(key)) { held.add(key); move(dx, dy, 7); changed(); }
      return true;
    }
    if (key === ' ' || key === 'Spacebar' || event.code === 'Space') {
      if (event.repeat) return true;
      if (getState().completed || getState().ritual) { onNotice(getState().completed ? 'The courtyard is restored. Enjoy your little place.' : 'Your crew is singing. Brushing can wait a moment.'); return true; }
      // onMode may call stop(), so switch first, then activate the keyboard pointer.
      const wasBrushing = brushing;
      if (getState().mode !== 'brush' || !wasBrushing) onMode('brush');
      activate();
      if (!wasBrushing && !walkable(cursor.x, cursor.y)) { brushing = false; applyCursor(); onNotice('The fountain blocks this spot. Press N to find remaining dust.'); return true; }
      brushing = !wasBrushing;
      applyCursor();
      onNotice(brushing ? 'Sweeping. Move with the arrow keys, or press N for another patch. Space stops your brush.' : 'Brush resting. Space starts another sweep.');
      changed();
      return true;
    }
    if (key.toLowerCase() === 'n') { if (!event.repeat) aimAtDust(); return true; }
    if (key === 'Enter' && getState().mode === 'direct') {
      if (!event.repeat) { activate(); onAssign(cursor.x, cursor.y); changed(); }
      return true;
    }
    return false;
  }

  function handleKeyUp(event) {
    if (ARROWS[event.key]) { const used = held.delete(event.key); return used || focused(); }
    return false;
  }

  function stop() {
    held.clear(); brushing = false;
    const state = getState();
    if (enabled || state.pointer?.keyboard) {
      state.pointer.active = false; state.pointer.preview = false; state.pointer.inside = false; state.pointer.keyboard = false;
    }
    enabled = false;
  }

  function update(dt) {
    if (!enabled) return;
    if (!focused()) { stop(); return; }
    const state = getState();
    if (state.completed || state.ritual) brushing = false;
    let dx = Number(held.has('ArrowRight')) - Number(held.has('ArrowLeft'));
    let dy = Number(held.has('ArrowDown')) - Number(held.has('ArrowUp'));
    const length = Math.hypot(dx, dy);
    if (length) { dx /= length; dy /= length; move(dx, dy, 135 * bounded(Number.isFinite(dt) ? dt : 0, 0, .05)); }
    else applyCursor();
  }

  return { handleKeyDown, handleKeyUp, update, stop };
}
