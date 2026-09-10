import {serialise,restore} from './game.js';
export const SAVE_KEY='dustlings.courtyard.v1';
const KEY=SAVE_KEY, BACKUP=KEY+'.backup';
export class SaveStore{
  constructor(storage){this.storage=storage;this.status='ready';this.recovered=false;this.baseline=undefined;}
  load(){
    let primary=null,backup=null;
    try{primary=this.storage.getItem(KEY);backup=this.storage.getItem(BACKUP);this.baseline=primary;this.recovered=false;}catch{this.status='unavailable';return null;}
    for(const [i,raw] of [primary,backup].entries()){
      if(!raw)continue;
      try{const state=restore(JSON.parse(raw));this.recovered=i===1;this.status=this.recovered?'recovered':'saved';return state;}catch{}
    }
    this.status=primary||backup?'damaged':'ready';return null;
  }
  save(state){
    try{
      const previous=this.storage.getItem(KEY);
      if(this.baseline!==undefined&&previous!==this.baseline){this.status='conflict';return false;}
      if(this.baseline===undefined)this.baseline=previous;
      const next=JSON.stringify({...serialise(state),saveRevision:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`});
      if(previous){try{restore(JSON.parse(previous));this.storage.setItem(BACKUP,previous);}catch{}}
      this.storage.setItem(KEY,next);this.baseline=next;this.status='saved';return true;
    }catch{this.status='unavailable';return false;}
  }
  hasConflict(){try{if(this.baseline!==undefined&&this.storage.getItem(KEY)!==this.baseline){this.status='conflict';return true;}return false;}catch{this.status='unavailable';return false;}}
  clear(){try{if(this.hasConflict())return false;this.storage.removeItem(KEY);this.storage.removeItem(BACKUP);this.baseline=null;this.status='ready';return true;}catch{this.status='unavailable';return false;}}
}
