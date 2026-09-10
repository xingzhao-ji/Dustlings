import {serialise,restore} from './game.js';
const KEY='dustlings.courtyard.v1', BACKUP=KEY+'.backup';
export class SaveStore{
  constructor(storage){this.storage=storage;this.status='ready';this.recovered=false;}
  load(){
    let primary=null,backup=null;
    try{primary=this.storage.getItem(KEY);backup=this.storage.getItem(BACKUP);}catch{this.status='unavailable';return null;}
    for(const [i,raw] of [primary,backup].entries()){
      if(!raw)continue;
      try{const state=restore(JSON.parse(raw));this.recovered=i===1;this.status=this.recovered?'recovered':'saved';return state;}catch{}
    }
    this.status=primary||backup?'damaged':'ready';return null;
  }
  save(state){
    try{
      const previous=this.storage.getItem(KEY);
      if(previous){try{restore(JSON.parse(previous));this.storage.setItem(BACKUP,previous);}catch{}}
      this.storage.setItem(KEY,JSON.stringify(serialise(state)));this.status='saved';return true;
    }catch{this.status='unavailable';return false;}
  }
  clear(){try{this.storage.removeItem(KEY);this.storage.removeItem(BACKUP);this.status='ready';return true;}catch{this.status='unavailable';return false;}}
}
