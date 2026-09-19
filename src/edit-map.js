// Map-compatible edits retain explicit air; dirty entries feed incremental saves.
export class EditMap extends Map {
  constructor(entries=[]){super();this.revision=0;this.pending=new Map();for(const[k,v]of entries)super.set(k,v);}
  set(key,value){if(this.has(key)&&this.get(key)===value)return this;super.set(key,value);this.pending.set(key,{value,revision:++this.revision});return this;}
  delete(key){if(!super.delete(key))return false;this.pending.set(key,{deleted:true,revision:++this.revision});return true;}
  clear(){for(const key of this.keys())this.delete(key);}
  acknowledge(revision){for(const[key,entry]of this.pending)if(entry.revision<=revision)this.pending.delete(key);}
}
