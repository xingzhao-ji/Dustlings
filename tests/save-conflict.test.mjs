import test from 'node:test';
import assert from 'node:assert/strict';
import {SaveStore,SAVE_KEY} from '../src/storage.js';
import {createState} from '../src/game.js';
class MemoryStorage{values=new Map();getItem(k){return this.values.get(k)??null;}setItem(k,v){this.values.set(k,String(v));}removeItem(k){this.values.delete(k);}}
test('stale windows cannot replace primary or backup progress on repeated autosaves',()=>{
  const memory=new MemoryStorage(),a=new SaveStore(memory),b=new SaveStore(memory);a.load();b.load();
  const newest=createState();newest.elapsed=50;a.save(newest);newest.elapsed=60;a.save(newest);
  const primary=memory.getItem(SAVE_KEY),backup=memory.getItem(SAVE_KEY+'.backup');
  for(let i=0;i<3;i++)assert.equal(b.save(createState()),false);
  assert.equal(b.status,'conflict');assert.equal(memory.getItem(SAVE_KEY),primary);assert.equal(memory.getItem(SAVE_KEY+'.backup'),backup);
});
test('stale restart cannot erase another window and loading the latest resolves conflict',()=>{
  const memory=new MemoryStorage(),a=new SaveStore(memory),b=new SaveStore(memory);a.load();b.load();
  const newest=createState();newest.elapsed=50;a.save(newest);assert.equal(b.clear(),false);assert.equal(b.hasConflict(),true);
  const latest=b.load();assert.equal(latest.elapsed,50);assert.equal(b.hasConflict(),false);latest.elapsed=55;assert.equal(b.save(latest),true);assert.equal(a.hasConflict(),true);
});
test('a reset in another window is also a conflicting revision',()=>{
  const memory=new MemoryStorage(),a=new SaveStore(memory);a.save(createState());const b=new SaveStore(memory);b.load();a.clear();
  assert.equal(b.save(createState()),false);assert.equal(memory.getItem(SAVE_KEY),null);
});
