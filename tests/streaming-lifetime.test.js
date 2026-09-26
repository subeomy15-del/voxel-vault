import test from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../src/render.js?v=38';
import {World} from '../src/world.js?v=38';
import {freshState,saveState,loadState} from '../src/save.js?v=38';

test('1,000 streamed boundaries bound renderer state and preserve an edited, looted region on return',()=>{
 const world=new World(7821,[],10),state=freshState(),data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 world.set(-15,75,-1,'gold_block');state.opened.push('regression-cache');state.inv.diamond=7;
 let disposed=0;const r={world,chunks:new Map(),queue:[],ready:[],chunkVersions:new Map(),options:{renderDistance:2,ambientOcclusion:false},revision:0,epoch:1,inflight:false,underground:false,center:'',scene:{remove(){}},worker:{postMessage(){}},installChunk({cx,cz}){this.chunks.set(`${cx},${cz}`,{traverse(fn){fn({geometry:{dispose(){disposed++;}}});}});}};
 let maxChunks=0,maxVersions=0,maxQueue=0,maxColumns=0;
 for(let i=0;i<1000;i++){
  const cx=i-500,cz=Math.floor(i/37)-14,pos={x:cx*16+.5,y:76,z:cz*16+.5};
  world.set(cx*16,75,cz*16,'plank');world.prepare(cx,cz);
  // Exercise the actual renderer scheduling/eviction path, with immediate synthetic GPU results.
  for(let step=0;step<30;step++){
   Renderer.prototype.stream.call(r,pos,{x:20,z:0});r.inflight=false;
   const next=r.queue.shift();if(next)r.ready.push({cx:next[0],cz:next[1],revision:r.revision});
  }
  maxChunks=Math.max(maxChunks,r.chunks.size);maxVersions=Math.max(maxVersions,r.chunkVersions.size);maxQueue=Math.max(maxQueue,r.queue.length);maxColumns=Math.max(maxColumns,world.columns.size);
  assert.ok(r.chunks.size<=49&&r.chunkVersions.size<=49&&r.queue.length<=25&&r.ready.length<=2);
 }
 state.edits=[...world.edits];assert.equal(saveState(storage,state),true);const reloaded=loadState(storage),returned=new World(reloaded.seed,reloaded.edits,reloaded.terrain);
 assert.equal(returned.get(-15,75,-1),'gold_block');assert.ok(reloaded.opened.includes('regression-cache'));assert.equal(reloaded.inv.diamond,7);assert.ok(disposed>1000);
 console.log(JSON.stringify({boundaries:1000,maxChunks,maxVersions,maxQueue,maxColumns,disposed,kind:'accelerated scheduler + real generation; not a playthrough'}));
});

test('old epochs, distant jobs and stale edit revisions never activate or release a new job',()=>{
 const r={epoch:3,inflight:true,telemetry:{},streamCenter:{cx:0,cz:0,range:2},options:{ambientOcclusion:false},queue:[],ready:[],chunkVersions:new Map([['0,0',9]])};
 const accept=data=>Renderer.prototype.receiveChunk.call(r,{epoch:3,cx:0,cz:0,revision:9,ambientOcclusion:false,...data});
 accept({epoch:2});assert.equal(r.inflight,true);assert.equal(r.ready.length,0);
 accept({cx:100,ambientOcclusion:true});assert.equal(r.queue.length,0);assert.equal(r.ready.length,0);
 accept({revision:8});assert.equal(r.ready.length,0);
 accept({});assert.equal(r.ready.length,1);assert.equal(r.inflight,false);
});
test('landing readiness requires the actual local neighborhood, not nine unrelated chunks',()=>{
 const r={chunks:new Map(Array.from({length:9},(_,i)=>[`${i+100},100`,{}]))};
 assert.equal(Renderer.prototype.landingReady.call(r,{x:-.1,z:-.1}),false);
 for(let x=-2;x<=0;x++)for(let z=-2;z<=0;z++)r.chunks.set(`${x},${z}`,{});
 assert.equal(Renderer.prototype.landingReady.call(r,{x:-.1,z:-.1}),true);
});
