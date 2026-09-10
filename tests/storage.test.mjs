import test from 'node:test';
import assert from 'node:assert/strict';
import { SaveStore } from '../src/storage.js';
import { createState, tick } from '../src/game.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

test('save and load preserve active progress and assignment', () => {
  const memory = new MemoryStorage();
  const store = new SaveStore(memory);
  assert.equal(store.load(), null);
  assert.equal(store.status, 'ready');
  const state = createState();
  state.pointer.active = true;
  for (let i = 0; i < 120; i++) tick(state, .1);
  state.assignment = { x: 250, y: 450 };
  assert.equal(store.save(state), true);
  const loaded = new SaveStore(memory).load();
  assert.ok(Math.abs(loaded.cleaned - state.cleaned) < 1e-7);
  assert.equal(loaded.creatures.length, state.creatures.length);
  assert.deepEqual(loaded.assignment, state.assignment);
  assert.equal(loaded.pointer.active, false);
});

test('corrupt primary recovers the previous valid checkpoint from backup', () => {
  const memory = new MemoryStorage();
  const store = new SaveStore(memory);
  const state = createState();
  state.elapsed = 17;
  assert.equal(store.save(state), true);
  state.elapsed = 42;
  assert.equal(store.save(state), true);
  const primaryKey = [...memory.values.keys()].find(key => !key.endsWith('.backup'));
  memory.setItem(primaryKey, '{unfinished write');
  const recovering = new SaveStore(memory);
  const loaded = recovering.load();
  assert.ok(loaded);
  assert.equal(loaded.elapsed, 17);
  assert.equal(recovering.recovered, true);
  assert.equal(recovering.status, 'recovered');
  assert.equal(recovering.save(loaded), true);
  assert.equal(new SaveStore(memory).load().elapsed, 17, 'recovered checkpoint can be saved again');
});

test('semantically corrupt primary also falls back to valid backup', () => {
  const memory = new MemoryStorage();
  const store = new SaveStore(memory);
  const state = createState();
  store.save(state);
  state.elapsed = 8;
  store.save(state);
  const primaryKey = [...memory.values.keys()].find(key => !key.endsWith('.backup'));
  const damaged = JSON.parse(memory.getItem(primaryKey));
  damaged.dust[0] = -1;
  memory.setItem(primaryKey, JSON.stringify(damaged));
  const recovering = new SaveStore(memory);
  assert.equal(recovering.load().elapsed, 0);
  assert.equal(recovering.status, 'recovered');
});

test('fully damaged saves are reported without throwing or silently overwriting data', () => {
  const memory = new MemoryStorage();
  const store = new SaveStore(memory);
  store.save(createState());
  store.save(createState());
  for (const key of memory.values.keys()) memory.setItem(key, 'broken');
  assert.equal(store.load(), null);
  assert.equal(store.status, 'damaged');
  assert.ok([...memory.values.values()].every(value => value === 'broken'));
});

test('denied storage is graceful for load, save, and clear', () => {
  const denied = () => { throw new Error('Storage access denied'); };
  const store = new SaveStore({ getItem: denied, setItem: denied, removeItem: denied });
  assert.equal(store.load(), null);
  assert.equal(store.status, 'unavailable');
  assert.equal(store.save(createState()), false);
  assert.equal(store.status, 'unavailable');
  assert.equal(store.clear(), false);
  assert.equal(store.status, 'unavailable');
});

test('quota failure preserves the last successfully saved progress', () => {
  const memory = new MemoryStorage();
  const store = new SaveStore(memory);
  const state = createState();
  state.elapsed = 17;
  assert.equal(store.save(state), true);
  const normalSet = memory.setItem.bind(memory);
  memory.setItem = () => { throw new Error('Quota exceeded'); };
  state.elapsed = 42;
  assert.equal(store.save(state), false);
  assert.equal(store.status, 'unavailable');
  memory.setItem = normalSet;
  assert.equal(new SaveStore(memory).load().elapsed, 17);
});

test('clearing a save also clears its recovery backup', () => {
  const memory = new MemoryStorage();
  const store = new SaveStore(memory);
  store.save(createState());
  store.save(createState());
  assert.equal(memory.values.size, 2);
  assert.equal(store.clear(), true);
  assert.equal(memory.values.size, 0);
  assert.equal(new SaveStore(memory).load(), null);
});
