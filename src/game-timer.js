export function formatRunTime(seconds){
  if(!Number.isFinite(seconds)||seconds<0)return '—';
  const centiseconds=Math.floor(seconds*100);
  return `${Math.floor(centiseconds/6000)}:${String(Math.floor(centiseconds/100)%60).padStart(2,'0')}.${String(centiseconds%100).padStart(2,'0')}`;
}
export class GameTimer {
  constructor(){this.reset();}
  reset(){this.elapsed=0;this.running=false;this.finished=false;this.splits=[];}
  start(){if(!this.finished)this.running=true;}
  update(dt){if(this.running&&Number.isFinite(dt)&&dt>0)this.elapsed+=dt;}
  split(){if(!this.running)return null;this.splits.push(this.elapsed);return this.elapsed;}
  finish(){if(this.finished)return this.elapsed;this.running=false;this.finished=true;return this.elapsed;}
}
