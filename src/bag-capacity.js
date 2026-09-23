export const BAG_SLOTS = 36;
export const STACK_SIZE = 999;
// Kept as an alias for older UI/imports; capacity is measured in occupied stacks now.
export const BAG_CAPACITY = BAG_SLOTS;
export function bagCount(inv){return Object.values(inv).reduce((n,v)=>n+(Number.isFinite(v)&&v>0?Math.ceil(v/STACK_SIZE):0),0);}
export function bagRoom(inv,item=''){
  const used=bagCount(inv),empty=Math.max(0,BAG_SLOTS-used);
  const existing=item&&Number.isFinite(inv[item])?STACK_SIZE-(inv[item]%STACK_SIZE||STACK_SIZE):0;
  return Math.max(0,existing+empty*STACK_SIZE);
}
