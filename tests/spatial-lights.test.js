import test from 'node:test';
import assert from 'node:assert/strict';
import {SpatialLights} from '../src/spatial-lights.js?v=37';
test('light queries ignore distant edits, include negative chunk edges and update removals',()=>{
 const lights=new SpatialLights();for(let i=0;i<100000;i++)lights.update(`${i},40,1000`,'stone',null);
 lights.update('-1,7,0','torch',null);lights.update('0,7,-1','lantern',null);lights.update('1000,7,1000','torch',null);
 assert.equal(lights.cells.size,3);const found=lights.nearest({x:0,y:7,z:0});assert.equal(found.length,2);assert.equal(lights.visited,2);
 lights.update('-1,7,0',null,'torch');assert.equal(lights.nearest({x:0,y:7,z:0}).length,1);assert.equal(lights.cells.size,2);
});
