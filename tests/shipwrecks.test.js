import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/world.js';
import {Game} from '../src/game.js';
import {wreckAnchor,wreckLayout,installWreck,registerWreck} from '../src/shipwrecks.js';
import {freshState,saveState,loadState} from '../src/save.js';
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};};
function setup(){const g=new Game({setWorld(){},burst(){},stream(){}},{play(){},quiet(){}},storage());g.state=freshState(7821);g.state.terrain=10;g.state.pos={x:0,y:20,z:0};g.loadWorld();g.screen=null;return g;}
function locate(g){for(let x=-20;x<20;x++)for(let z=-20;z<20;z++){const s=wreckAnchor(g.world,x,z);if(s&&installWreck(g,s))return s;}throw Error('No reachable wreck');}
test('old worlds receive real flooded wreck interiors with recoverable loot and persistent edits',()=>{
 const g=setup(),site=locate(g),layout=wreckLayout(g.world,site);assert.ok(layout.blocks.size>200);assert.equal(g.state.terrain,10);assert.ok(g.world.chests.some(c=>c.id===site.id));
 const c=layout.chest;g.pos={x:c.x+.5,y:c.y,z:c.z-1};g.target={...c,type:'treasure_chest'};const before=g.state.inv.gold_ingot||0;g.interact();assert.equal(g.state.inv.gold_ingot,before+2);assert.ok(g.state.opened.includes(site.id));
 const s=storage();g.state.edits=[...g.world.edits];saveState(s,g.state);const loaded=loadState(s);assert.deepEqual(loaded.exploration.wrecks,g.state.exploration.wrecks);g.state=loaded;g.loadWorld();g.screen=null;registerWreck(g,site);assert.equal(g.world.get(c.x,c.y,c.z),'chest');assert.equal(installWreck(g,site),false);g.pos={x:c.x+.5,y:c.y,z:c.z-1};g.target={...c,type:'chest'};g.interact();assert.equal(g.state.inv.gold_ingot,before+2);
 const rotation=site.rotation,at=(x,y,z)=>rotation?g.world.get(site.x+z,site.y+y,site.z-x):g.world.get(site.x+x,site.y+y,site.z+z);
 assert.equal(at(0,1,0),'water');assert.equal(at(3,1,-2),'water');assert.equal(at(0,3,0),'water');assert.ok(at(0,0,0));
});
test('wreck installation rejects a player-edited footprint without modifying any blocks',()=>{
 const g=setup(),site=locate(g),w=new World(7821,[],10);g.world=w;g.state.exploration.wrecks=[];w.set(site.x+10,60,site.z,'gold_block');const before=[...w.edits];assert.equal(installWreck(g,site),false);assert.deepEqual([...w.edits],before);assert.equal(g.state.exploration.wrecks.length,0);
});
test('wreck anchors and layouts are deterministic and can span negative chunk boundaries',()=>{
 const g=setup(),site=locate(g),rx=Number(site.id.split(':')[2]),rz=Number(site.id.split(':')[3]);assert.deepEqual(wreckAnchor(new World(7821,[],10),rx,rz),site);const a=wreckLayout(g.world,site),b=wreckLayout(g.world,site);assert.deepEqual(a,b);assert.ok(new Set([...a.blocks.keys()].map(k=>{const[x,,z]=k.split(',').map(Number);return `${Math.floor(x/16)},${Math.floor(z/16)}`;})).size>1);
});
