import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, serialise, restore } from '../src/game.js';
import { SaveStore } from '../src/storage.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

function progress(count = 400) {
  const data = serialise(createState());
  data.dust = data.dust.map((_, index) => index < count ? 0 : 1);
  data.upgrades = { brush: true, teamwork: true, bloom: true };
  return data;
}

test('JSON-valid but impossible fountain progress cannot bypass restoration requirements', () => {
  const cases = [];
  let data = serialise(createState()); data.restoration = 1; cases.push(data);
  data = progress(122); data.ritual = true; cases.push(data);
  data = progress(122); data.restoration = .5; cases.push(data);
  data = progress(); data.restoration = 1; data.ritual = true; cases.push(data);
  data = progress(); data.restoration = 4; cases.push(data);
  data = progress(); data.ritual = 'false'; cases.push(data);
  data = progress(); data.restoration = '0.5'; cases.push(data);
  for (const impossible of cases) {
    assert.throws(() => restore(JSON.parse(JSON.stringify(impossible))), /fountain|chorus/, 'impossible save must be rejected explicitly');
  }
});

test('valid in-progress and completed restoration save states remain recoverable', () => {
  const live = progress(); live.restoration = .4; live.ritual = true;
  const resumed = restore(live);
  assert.equal(resumed.ritual, true);
  assert.equal(resumed.restoration, .4);
  const complete = progress(); complete.dust.fill(0); complete.restoration = 1;
  assert.equal(restore(complete).completed, true);
  const restoredWithWorkLeft = progress(); restoredWithWorkLeft.restoration = 1;
  assert.equal(restore(restoredWithWorkLeft).completed, false);
});

test('malformed saved assignment coordinates never enter simulation as strings or objects', () => {
  for (const assignment of [{ x: '250', y: '450' }, { x: {}, y: 450 }, { x: 250, y: null }, { x: 500, y: 370 }]) {
    const data = serialise(createState()); data.assignment = assignment;
    assert.equal(restore(data).assignment, null);
  }
});

test('semantically impossible primary fountain data recovers a valid previous checkpoint', () => {
  const memory = new MemoryStorage(), store = new SaveStore(memory);
  const state = createState(); state.elapsed = 17;
  assert.equal(store.save(state), true);
  state.elapsed = 42; assert.equal(store.save(state), true);
  const primary = [...memory.values.keys()].find(key => !key.endsWith('.backup'));
  const impossible = JSON.parse(memory.getItem(primary)); impossible.restoration = 1;
  memory.setItem(primary, JSON.stringify(impossible));
  const recovery = new SaveStore(memory), loaded = recovery.load();
  assert.equal(loaded.elapsed, 17);
  assert.equal(loaded.restoration, 0);
  assert.equal(recovery.recovered, true);
});

test('a stale second session cannot erase newer progress from both primary and backup', () => {
  const memory = new MemoryStorage();
  new SaveStore(memory).save(createState());
  const first = new SaveStore(memory), second = new SaveStore(memory);
  const current = first.load(), stale = second.load();
  const data = serialise(current); data.dust = data.dust.map((node, index) => index < 50 ? 0 : node);
  assert.equal(first.save(restore(data)), true);
  second.save(stale);
  second.save(stale); // A second autosave previously also destroyed the recovery copy.
  assert.ok(new SaveStore(memory).load().cleaned >= 50, 'stale session silently replaced newer progress');
});
