import test from 'node:test';
import assert from 'node:assert/strict';
import { SaveStore, SAVE_KEY, INTERRUPTED_KEY } from '../src/storage.js';
import { createState, tick, serialise } from '../src/game.js';
class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}
function swept() { const state = createState(); state.pointer.active = true; for (let i=0;i<20;i++) tick(state,.05); state.pointer.active=false; return state; }

test('synchronous checkpoint recovers just-brushed work without changing primary or backup',()=>{
 const memory=new MemoryStorage(),store=new SaveStore(memory);store.load();store.save(createState());
 const primary=memory.getItem(SAVE_KEY),backup=memory.getItem(SAVE_KEY+'.backup'),state=swept();
 assert.equal(store.checkpoint(state),true);assert.equal(memory.getItem(SAVE_KEY),primary);assert.equal(memory.getItem(SAVE_KEY+'.backup'),backup);
 const returning=new SaveStore(memory),loaded=returning.load();assert.ok(Math.abs(loaded.cleaned-state.cleaned)<1e-8);assert.equal(loaded.elapsed,state.elapsed);
 assert.equal(returning.recovered,true);assert.equal(returning.recoverySource,'interrupted');assert.equal(returning.status,'recovered');
 assert.equal(returning.save(loaded),true);assert.equal(memory.getItem(INTERRUPTED_KEY),null);assert.ok(Math.abs(new SaveStore(memory).load().cleaned-state.cleaned)<1e-8);
});

test('checkpoint can recover before the first canonical save',()=>{
 const memory=new MemoryStorage(),store=new SaveStore(memory);store.load();const state=swept();assert.equal(store.checkpoint(state),true);
 assert.equal(memory.getItem(SAVE_KEY),null);assert.ok(Math.abs(new SaveStore(memory).load().cleaned-state.cleaned)<1e-8);
});

test('a completed queued canonical save makes its earlier interruption journal obsolete',()=>{
 const memory=new MemoryStorage(),store=new SaveStore(memory);store.load();store.save(createState());const state=swept();store.checkpoint(state);const oldJournal=memory.getItem(INTERRUPTED_KEY);
 state.elapsed=20;assert.equal(store.save(state),true);assert.equal(memory.getItem(INTERRUPTED_KEY),null);
 memory.setItem(INTERRUPTED_KEY,oldJournal);const returning=new SaveStore(memory);assert.equal(returning.load().elapsed,20);assert.equal(returning.recoverySource,null);
});

test('stale checkpoints cannot change newer primary, backup, or recovery journal',()=>{
 const memory=new MemoryStorage(),a=new SaveStore(memory);a.load();a.save(createState());const b=new SaveStore(memory);b.load();
 const latest=swept();latest.elapsed=40;a.save(latest);latest.elapsed=41;a.checkpoint(latest);const before=[...memory.values];
 assert.equal(b.checkpoint(createState()),false);assert.equal(b.save(createState()),false);assert.equal(b.clear(),false);assert.equal(b.status,'conflict');assert.deepEqual([...memory.values],before);
});

test('a second window sharing the primary revision cannot overwrite a newer journal',()=>{
 const memory=new MemoryStorage(),a=new SaveStore(memory);a.load();a.save(createState());const b=new SaveStore(memory);b.load();
 a.checkpoint(swept());const before=[...memory.values];assert.equal(b.hasConflict(),true);assert.equal(b.checkpoint(createState()),false);assert.equal(b.save(createState()),false);assert.equal(b.clear(),false);assert.deepEqual([...memory.values],before);
 const recovered=b.load();assert.equal(b.hasConflict(),false);recovered.elapsed=8;assert.equal(b.save(recovered),true);assert.equal(a.hasConflict(),true);
});

test('a caller must read an existing valid recovery journal before replacing it',()=>{
 const memory=new MemoryStorage(),a=new SaveStore(memory);a.save(createState());a.checkpoint(swept());const before=[...memory.values],unread=new SaveStore(memory);
 assert.equal(unread.checkpoint(createState()),false);assert.equal(unread.save(createState()),false);assert.deepEqual([...memory.values],before);assert.ok(unread.load().cleaned>0);assert.equal(unread.save(unread.load()),true);
});

test('malformed and semantically invalid journals fall back to readable primary',()=>{
 for(const raw of ['{broken',JSON.stringify({baseline:null,state:serialise(createState())}),JSON.stringify({state:serialise(createState())})]){
  const memory=new MemoryStorage(),store=new SaveStore(memory);const state=createState();state.elapsed=17;store.save(state);memory.setItem(INTERRUPTED_KEY,raw);
  const returning=new SaveStore(memory);assert.equal(returning.load().elapsed,17);assert.equal(returning.recoverySource,null);
 }
 const memory=new MemoryStorage(),store=new SaveStore(memory);store.save(createState());const bad=serialise(createState());bad.dust[0]=-1;memory.setItem(INTERRUPTED_KEY,JSON.stringify({baseline:memory.getItem(SAVE_KEY),state:bad}));assert.equal(new SaveStore(memory).load().cleaned,0);
});

test('reset clears the recovery journal and cannot revive the prior courtyard',()=>{
 const memory=new MemoryStorage(),store=new SaveStore(memory);store.save(createState());store.checkpoint(swept());assert.equal(store.clear(),true);assert.equal(memory.values.size,0);store.save(createState());const loaded=new SaveStore(memory).load();assert.equal(loaded.cleaned,0);assert.equal(loaded.elapsed,0);
});

test('denied checkpoint storage preserves the previous durable save',()=>{
 const memory=new MemoryStorage(),store=new SaveStore(memory);store.save(createState());const before=[...memory.values],set=memory.setItem.bind(memory);memory.setItem=()=>{throw Error('Quota');};
 assert.equal(store.checkpoint(swept()),false);assert.equal(store.status,'unavailable');assert.deepEqual([...memory.values],before);memory.setItem=set;assert.equal(new SaveStore(memory).load().cleaned,0);
});

test('failed cleanup after successful canonical write leaves only an ignored stale journal',()=>{
 const memory=new MemoryStorage(),store=new SaveStore(memory);store.save(createState());const state=swept();store.checkpoint(state);memory.removeItem=()=>{throw Error('Removal denied');};state.elapsed=12;
 assert.equal(store.save(state),true);const returning=new SaveStore(memory);assert.equal(returning.load().elapsed,12);assert.equal(returning.recoverySource,null);
});
