import test from 'node:test';
import assert from 'node:assert/strict';
import {armBlast,cancelDelayedActions,recoverDelayedActions} from '../src/delayed-actions.js?v=36';
test('canceling delayed charges refunds their original inventory once and never changes a replacement world',()=>{
  const state={inv:{blast_charge:0}},g={state,world:{},creative:false,screen:null,detonate(){assert.fail('canceled blast fired');}};
  armBlast(g,1,7,2);assert.equal(state.pendingBlasts.length,1);
  g.state={inv:{}};g.world={};cancelDelayedActions(g);cancelDelayedActions(g);
  assert.equal(state.inv.blast_charge,1);assert.equal(state.pendingBlasts.length,0);assert.deepEqual(g.state.inv,{});assert.equal(g.pendingActions.size,0);
});
test('loading an interrupted fuse refunds paid charges without reviving timed actions',()=>{
  const raw={pendingBlasts:[{x:1,y:7,z:2,refund:true},{x:1,y:7,z:2,refund:false},{refund:true}]},state={inv:{blast_charge:3}};
  recoverDelayedActions(raw,state);assert.equal(state.inv.blast_charge,4);assert.deepEqual(state.pendingBlasts,[]);
  recoverDelayedActions(state,state);assert.equal(state.inv.blast_charge,4);
});
