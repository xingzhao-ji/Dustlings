import { serialise, restore } from './game.js';
export const SAVE_KEY = 'dustlings.courtyard.v1';
export const INTERRUPTED_KEY = SAVE_KEY + '.interrupted';
const BACKUP = SAVE_KEY + '.backup';

function interruptedState(raw, baseline) {
  if (!raw) return null;
  try {
    const entry = JSON.parse(raw);
    if (!entry || Array.isArray(entry) || !Object.hasOwn(entry, 'baseline') || entry.baseline !== baseline) return null;
    return restore(entry.state);
  } catch { return null; }
}

export class SaveStore {
  constructor(storage) {
    this.storage = storage; this.status = 'ready'; this.recovered = false;
    this.recoverySource = null; this.baseline = undefined; this.journalBaseline = undefined;
  }
  load() {
    let primary, backup, journal;
    try {
      primary = this.storage.getItem(SAVE_KEY); backup = this.storage.getItem(BACKUP); journal = this.storage.getItem(INTERRUPTED_KEY);
      this.baseline = primary; this.journalBaseline = journal; this.recovered = false; this.recoverySource = null;
    } catch { this.status = 'unavailable'; return null; }
    const interrupted = interruptedState(journal, primary);
    if (interrupted) { this.recovered = true; this.recoverySource = 'interrupted'; this.status = 'recovered'; return interrupted; }
    for (const [index, raw] of [primary, backup].entries()) {
      if (!raw) continue;
      try {
        const state = restore(JSON.parse(raw)); this.recovered = index === 1;
        this.recoverySource = this.recovered ? 'backup' : null; this.status = this.recovered ? 'recovered' : 'saved'; return state;
      } catch {}
    }
    this.status = primary || backup ? 'damaged' : 'ready'; return null;
  }
  _current() {
    const primary = this.storage.getItem(SAVE_KEY), journal = this.storage.getItem(INTERRUPTED_KEY);
    if (this.baseline !== undefined && primary !== this.baseline) { this.status = 'conflict'; return null; }
    if (this.journalBaseline === undefined && interruptedState(journal, primary)) { this.status = 'conflict'; return null; }
    // Two windows may share a primary revision before either commits. Preserve
    // any valid recovery entry written since this window last read the journal.
    if (this.journalBaseline !== undefined && journal !== this.journalBaseline && interruptedState(journal, primary)) { this.status = 'conflict'; return null; }
    if (this.baseline === undefined) this.baseline = primary;
    if (this.journalBaseline === undefined) this.journalBaseline = journal;
    return { primary, journal };
  }
  /** Synchronous teardown journal; never writes the canonical save or backup. */
  checkpoint(state) {
    try {
      const current = this._current(); if (!current) return false;
      const raw = JSON.stringify({ baseline: current.primary, state: serialise(state) });
      this.storage.setItem(INTERRUPTED_KEY, raw); this.journalBaseline = raw; this.status = 'saved'; return true;
    } catch { this.status = 'unavailable'; return false; }
  }
  /** Root calls canonical save/reset under its cross-window Web Lock. */
  save(state) {
    try {
      const current = this._current(); if (!current) return false;
      const next = JSON.stringify({ ...serialise(state), saveRevision: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}` });
      if (current.primary) { try { restore(JSON.parse(current.primary)); this.storage.setItem(BACKUP, current.primary); } catch {} }
      this.storage.setItem(SAVE_KEY, next); this.baseline = next;
      // A leftover entry becomes ineligible after this successful commit, even
      // when journal removal is denied. Do not erase a changed entry blindly.
      try {
        const journal = this.storage.getItem(INTERRUPTED_KEY);
        if (journal === current.journal) { this.storage.removeItem(INTERRUPTED_KEY); this.journalBaseline = null; }
        else this.journalBaseline = journal;
      } catch {}
      this.status = 'saved'; return true;
    } catch { this.status = 'unavailable'; return false; }
  }
  hasConflict() {
    try { return this._current() === null; }
    catch { this.status = 'unavailable'; return false; }
  }
  clear() {
    try {
      if (!this._current()) return false;
      this.storage.removeItem(SAVE_KEY); this.storage.removeItem(BACKUP); this.storage.removeItem(INTERRUPTED_KEY);
      this.baseline = null; this.journalBaseline = null; this.recovered = false; this.recoverySource = null; this.status = 'ready'; return true;
    } catch { this.status = 'unavailable'; return false; }
  }
}
