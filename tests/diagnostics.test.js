import test from 'node:test';
import assert from 'node:assert/strict';
import {Diagnostics} from '../src/diagnostics.js?v=31';
test('frame percentiles exclude background gaps and remain bounded',()=>{
  const d=new Diagnostics(100);for(let i=1;i<=100;i++)d.record(i/1000);assert.equal(d.percentile(),95);
  for(const n of[0,-1,NaN,Infinity,1])d.record(n);assert.equal(d.count,100);
  for(let i=0;i<1000;i++)d.record(.016);assert.equal(d.percentile(),16);assert.equal(d.frames.length,100);d.dispose();
});
