// The save contains refundable charge records, never wall-clock timer handles.
export function armBlast(game,x,y,z){
  const state=game.state,world=game.world,record={x,y,z,refund:!game.creative};
  (state.pendingBlasts??=[]).push(record);
  const action={state,record,timer:null};(game.pendingActions??=new Set()).add(action);
  action.timer=setTimeout(()=>{
    if(game.world!==world||game.state!==state||game.screen){cancelAction(game,action);return;}
    removeAction(game,action);game.detonate(x,y,z);
  },1200);
}
function removeAction(game,action){
  clearTimeout(action.timer);game.pendingActions.delete(action);
  const records=action.state.pendingBlasts,index=records?.indexOf(action.record)??-1;if(index>=0)records.splice(index,1);
}
function cancelAction(game,action){
  removeAction(game,action);
  if(action.record.refund)action.state.inv.blast_charge=(action.state.inv.blast_charge||0)+1;
}
export function cancelDelayedActions(game){
  for(const action of game.pendingActions||[])cancelAction(game,action);
}
export function recoverDelayedActions(raw,state){
  const refunds=(Array.isArray(raw.pendingBlasts)?raw.pendingBlasts:[]).slice(0,64).filter(a=>a?.refund===true&&['x','y','z'].every(k=>Number.isFinite(a[k]))).length;
  if(refunds)state.inv.blast_charge=Math.min(999999,(state.inv.blast_charge||0)+refunds);
  state.pendingBlasts=[];
}
