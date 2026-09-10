import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, moveCreature, walkable, serialise, restore, buyUpgrade, beginRitual, tick, UPGRADES } from '../src/game.js';

test('all courtyard dust sites admit every crew work offset from four distant starting points', t => {
  const dust = createState().dust;
  const starts = [[500, 630], [250, 200], [750, 200], [750, 630]];
  let routes = 0, minimumClearance = Infinity, longestSeconds = 0;
  const failures = [];
  for (const [x, y] of starts) for (const node of dust) for (const offset of [-7, 0, 7]) {
    routes++;
    const creature = { x, y }, tx = node.x + offset, ty = node.y + 7;
    let arrived = false;
    for (let frame = 0; frame < 1500; frame++) {
      moveCreature(creature, tx, ty, .05);
      const radius = Math.hypot(creature.x - 500, creature.y - 370);
      minimumClearance = Math.min(minimumClearance, radius);
      assert.ok(walkable(creature.x, creature.y), `route to node ${node.id} left the playable surface`);
      assert.ok(radius >= 95.99, `route to node ${node.id} clipped the creature clearance circle`);
      if (Math.hypot(creature.x - tx, creature.y - ty) < 17) {
        arrived = true;
        longestSeconds = Math.max(longestSeconds, (frame + 1) * .05);
        break;
      }
    }
    if (!arrived) failures.push({ id: node.id, offset, start: [x, y], end: [creature.x, creature.y] });
  }
  assert.deepEqual(failures, []);
  t.diagnostic(JSON.stringify({ routes, dustSites: dust.length, minimumClearance, longestSeconds, kind: 'deterministic simulation; not FPS or human pacing' }));
});

test('every edge dust site is itself a legal manual brushing location', () => {
  const state = createState();
  const edges = state.dust.filter(node => node.x < 160 || node.x > 840 || node.y < 200 || node.y > 620);
  assert.ok(edges.length > 0);
  for (const node of edges) {
    assert.ok(walkable(node.x, node.y));
    const scene = createState();
    scene.pointer = { ...scene.pointer, x: node.x, y: node.y, active: true };
    tick(scene, .1);
    assert.ok(scene.dust[node.id].amount < 1, `edge dust ${node.id} received no brushing`);
  }
});

test('all 50 helpers actually reach their chorus positions before the landmark finishes', t => {
  const data = serialise(createState());
  data.dust = data.dust.map((_, i) => i < 400 ? 0 : 1);
  const state = restore(data);
  for (const upgrade of UPGRADES) assert.equal(buyUpgrade(state, upgrade.id), true);
  // Exercise gathering from scattered, distant positions, not a prearranged ring.
  const corners = [[130, 175], [870, 175], [870, 640], [130, 640]];
  state.creatures.forEach((creature, index) => {
    const [x, y] = corners[index % corners.length];
    creature.x = x; creature.y = y;
  });
  assert.equal(state.creatures.length, 50);
  assert.equal(beginRitual(state), true);
  let allArrivedAt = null;
  for (let frame = 0; frame < 1400 && state.ritual; frame++) {
    tick(state, .05);
    assert.ok(state.creatures.every(creature => walkable(creature.x, creature.y)));
    const allArrived = state.creatures.every(creature => Math.hypot(creature.x - creature.tx, creature.y - creature.ty) < 6);
    if (allArrived && allArrivedAt === null) allArrivedAt = state.elapsed;
  }
  assert.notEqual(allArrivedAt, null, 'landmark completed before the full crew ever reached its positions');
  assert.equal(state.restoration, 1);
  assert.equal(state.ritual, false);
  assert.ok(allArrivedAt < state.elapsed);
  t.diagnostic(JSON.stringify({ allArrivedAt, landmarkFinishedAt: state.elapsed, kind: 'controlled 50-helper simulation' }));
});
