import test from 'node:test';
import assert from 'node:assert/strict';
import {initialQuality,AutoQuality} from '../src/auto-quality.js?v=37';
test('Auto starts phones, memory-limited devices and very large high-DPI views safely',()=>{
 assert.equal(initialQuality({touch:true,memory:8,cores:8}),'low');assert.equal(initialQuality({memory:2}),'low');assert.equal(initialQuality({cores:2}),'low');
 assert.equal(initialQuality({width:3840,height:2160,dpr:2}),'low');assert.equal(initialQuality({memory:8,cores:8,width:1920,height:1080,dpr:1}),'medium');
});

test('Auto reduces sustained overload and resists oscillation and background pauses',()=>{
 const q=new AutoQuality({memory:8,cores:8});for(let i=0;i<140;i++)q.record(.04);assert.equal(q.level,'low');
 for(let i=0;i<700;i++)q.record(1/60);assert.equal(q.level,'low');q.record(10);assert.equal(q.level,'low');
 for(let i=0;i<2100;i++)q.record(1/60);assert.ok(['medium','high'].includes(q.level));
 const phone=new AutoQuality({touch:true});for(let i=0;i<4000;i++)phone.record(1/60);assert.equal(phone.level,'low');
});
