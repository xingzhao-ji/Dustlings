import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createState, tick, buyUpgrade, assignCrew, releaseCrew, beginRitual,
  moveCreature, walkable, FOUNTAIN, UPGRADES, serialise, restore,
} from '../src/game.js';

function close(actual, expected, tolerance = 1e-7) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

// Controlled saved-progress fixture, not a pacing or human-play result.
function progressed(cleaned = 140) {
  const data = serialise(createState());
  data.dust = data.dust.map((_, i) => i < cleaned ? 0 : 1);
  return restore(data);
}

function step(state, seconds) {
  for (let i = 0; i < Math.ceil(seconds / .1); i++) tick(state, .1);
}

function checkConservation(state) {
  const remaining = state.dust.reduce((sum, node) => sum + node.amount, 0);
  close(state.cleaned + remaining, state.totalDust);
  close(state.stats.brushed + state.stats.assisted, state.cleaned);
  assert.ok(state.dust.every(node => Number.isFinite(node.amount) && node.amount >= 0 && node.amount <= node.initial));
  const spent = UPGRADES.reduce((sum, upgrade) => sum + (state.upgrades[upgrade.id] ? upgrade.cost : 0), 0);
  close(state.motes + spent, state.earned);
  assert.equal(Number.isInteger(state.motes), true);
  assert.ok(state.creatures.length <= 50);
}

test('opening brush forms a helper locally within 30 simulation seconds', () => {
  const state = createState();
  state.pointer = { ...state.pointer, ...state.hintTarget, active: true, inside: true };
  const { x, y } = state.pointer;
  for (let i = 0; i < 300 && !state.creatures.length; i++) tick(state, .1);
  assert.ok(state.creatures.length > 0);
  assert.ok(state.firstHelperAt > 0 && state.firstHelperAt <= 30);
  assert.ok(state.cleaned > 0);
  const birth = state.events.find(event => event.name === 'birth' && event.first);
  assert.ok(birth, 'first formation has a presentation event');
  assert.ok(Math.hypot(birth.x - x, birth.y - y) < state.brushRadius + 12, 'helper forms at the cleaned patch');
  assert.equal(state.hintTarget, null);
  checkConservation(state);
});

test('cleaning, autonomous assistance, and purchases conserve courtyard resources', () => {
  const state = createState();
  state.pointer.active = true;
  // A scripted brush follows remaining dust; this measures invariants, not enjoyment/pacing.
  for (let frame = 0; frame < 1800; frame++) {
    const target = state.dust.find(node => node.amount > .05);
    if (target) Object.assign(state.pointer, { x: target.x, y: target.y });
    tick(state, .1);
    if (frame % 10 === 0) {
      buyUpgrade(state, 'brush');
      buyUpgrade(state, 'teamwork');
      checkConservation(state);
    }
    state.events.length = 0;
  }
  assert.ok(state.stats.brushed > 0);
  assert.ok(state.stats.assisted > 0, 'helpers really remove dust');
  assert.equal(state.upgrades.brush, true);
  assert.equal(state.upgrades.teamwork, true);
  checkConservation(state);
});

test('upgrade choices charge once, reject unavailable choices, and change capability', () => {
  const empty = createState();
  assert.equal(buyUpgrade(empty, 'brush'), false);
  assert.equal(buyUpgrade(empty, 'unknown'), false);
  assert.equal(empty.motes, 0);

  const state = progressed();
  const initialMotes = state.motes;
  const initialRadius = state.brushRadius;
  assert.equal(buyUpgrade(state, 'bloom'), false, 'chorus respects prerequisite tree');
  assert.equal(state.motes, initialMotes);
  assert.equal(buyUpgrade(state, 'brush'), true);
  assert.ok(state.brushRadius > initialRadius);
  assert.equal(state.motes, initialMotes - UPGRADES.find(upgrade => upgrade.id === 'brush').cost);
  const afterBrush = state.motes;
  assert.equal(buyUpgrade(state, 'brush'), false);
  assert.equal(state.motes, afterBrush);
  assert.equal(buyUpgrade(state, 'teamwork'), true);
  tick(state, .1);
  assert.equal(state.creatures[1].target, state.creatures[0].target, 'paired helpers choose shared work');
  assert.equal(buyUpgrade(state, 'bloom'), true);
  assert.equal(beginRitual(state), false, 'buying chorus cannot skip required cleaning');
  assert.equal(state.motes, initialMotes - UPGRADES.reduce((sum, upgrade) => sum + upgrade.cost, 0));
  assert.equal(state.stats.upgrades.length, 3);
});

test('teamwork increases actual crew cleaning in an identical controlled work scene', () => {
  function scene(upgraded) {
    const state = progressed();
    if (upgraded) assert.equal(buyUpgrade(state, 'teamwork'), true);
    const node = state.dust.find(dust => dust.amount > 0 && dust.x < 400);
    state.creatures = state.creatures.slice(0, 2);
    for (const creature of state.creatures) {
      creature.x = node.x;
      creature.y = node.y + 7;
      creature.target = node.id;
    }
    tick(state, .1);
    return state.stats.assisted;
  }
  const basic = scene(false), paired = scene(true);
  assert.ok(basic > 0);
  assert.ok(paired > basic * 1.5, `${paired} paired work should meaningfully exceed ${basic}`);
});

test('blocked destinations preserve the last valid crew assignment', () => {
  assert.equal(assignCrew(createState(), 250, 450), false, 'no invisible workforce before birth');
  const state = progressed(21);
  assert.equal(assignCrew(state, 250, 450), true);
  const original = { ...state.assignment };
  for (const [x, y] of [[500, 370], [0, 400], [920, 400], [250, 700]]) {
    assert.equal(assignCrew(state, x, y), false);
    assert.deepEqual(state.assignment, original);
  }
  assert.equal(state.stats.assignments, 1);
  assert.equal(state.events.filter(event => event.name === 'blocked').length, 4);
  releaseCrew(state);
  assert.equal(state.assignment, null);
  assert.ok(state.creatures.every(creature => creature.target === null));
});

test('helpers traverse around the fountain and reach destinations on its opposite sides', () => {
  for (const [x, y, tx, ty] of [[250, 370, 750, 370], [750, 370, 250, 370], [500, 180, 500, 630], [700, 500, 300, 240]]) {
    const creature = { x, y };
    for (let frame = 0; frame < 600; frame++) {
      moveCreature(creature, tx, ty, .1);
      assert.ok(Number.isFinite(creature.x) && Number.isFinite(creature.y));
      assert.ok(walkable(creature.x, creature.y));
      assert.ok(Math.hypot(creature.x - FOUNTAIN.x, creature.y - FOUNTAIN.y) >= FOUNTAIN.r + 8, 'body clearance from fountain');
      if (Math.hypot(creature.x - tx, creature.y - ty) < 2) break;
    }
    assert.ok(Math.hypot(creature.x - tx, creature.y - ty) < 2, `failed route ${x},${y} → ${tx},${ty}`);
  }
});

test('a live chorus survives save/restore and can finish the landmark', () => {
  const state = progressed(Math.ceil(createState().totalDust * .8));
  for (const upgrade of UPGRADES) assert.equal(buyUpgrade(state, upgrade.id), true);
  assert.equal(beginRitual(state), true);
  assert.equal(assignCrew(state, 250, 450), false, 'chorus is not interrupted by an assignment');
  step(state, 24);
  assert.ok(state.restoration > 0 && state.restoration < 1);
  const loaded = restore(JSON.parse(JSON.stringify(serialise(state))));
  assert.equal(loaded.ritual, true);
  close(loaded.restoration, state.restoration);
  close(loaded.cleaned, state.cleaned);
  assert.deepEqual(loaded.upgrades, state.upgrades);
  assert.equal(loaded.creatures.length, state.creatures.length);
  assert.equal(loaded.pointer.active, false, 'returning does not leave a brush pressed');
  assert.ok(loaded.creatures.every(creature => walkable(creature.x, creature.y)));
  step(loaded, 80);
  assert.equal(loaded.restoration, 1);
  assert.equal(loaded.ritual, false);
  assert.ok(loaded.events.some(event => event.name === 'fountainRestored'));
});

test('helpers clear tiny remnants and complete without pixel hunting', () => {
  const data = serialise(createState());
  data.dust.fill(0);
  data.dust[0] = .3;
  data.dust[data.dust.length - 1] = .2;
  data.upgrades = { brush: true, teamwork: true, bloom: true };
  data.restoration = 1;
  const state = restore(data);
  step(state, 8);
  assert.equal(state.completed, true);
  assert.ok(state.dust.every(node => node.amount === 0));
  close(state.cleaned, state.totalDust);
  assert.ok(state.events.some(event => event.name === 'complete'));
  step(state, 2);
  assert.equal(state.events.filter(event => event.name === 'complete').length, 1, 'ending fires once');
});

test('large or negative frame deltas do not advance unbounded simulation time', () => {
  const state = createState();
  tick(state, 30);
  close(state.elapsed, .1);
  tick(state, -10);
  close(state.elapsed, .1);
});

test('invalid saved progress is rejected and currency derives from actual cleaned dust', () => {
  const data = serialise(progressed(100));
  data.motes = 999999;
  assert.equal(restore(data).motes, 100);
  assert.throws(() => restore({ ...data, version: -1 }), /unsupported/);
  assert.throws(() => restore({ ...data, dust: [0] }), /damaged/);
  const corrupt = structuredClone(data);
  corrupt.dust[0] = NaN;
  assert.throws(() => restore(corrupt), /damaged/);
  assert.throws(() => restore({ ...data, upgrades: { bloom: true } }), /incomplete/);
});
