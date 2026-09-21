export const BAG_CAPACITY = 1024;
export function bagCount(inv){return Object.values(inv).reduce((n,v)=>n+(Number.isFinite(v)&&v>0?v:0),0);}
export function bagRoom(inv){return Math.max(0,BAG_CAPACITY-bagCount(inv));}
