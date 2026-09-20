import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js?v=34';
import {journeyStage,journeyMarkup} from '../src/journey.js?v=34';
const storage=()=>({data:new Map(),getItem(k){return this.data.get(k)||null;},setItem(k,v){this.data.set(k,v);}});
const make=s=>new Game({setWorld(){},stream(){},burst(){}},{play(){},quiet(){}},s||storage());
test('chapters follow preparation, remain complete after spending items and survive reload',()=>{
 const g=make();g.start();assert.equal(journeyStage(g),0);
 g.add('birch',6);g.updateJourney();assert.equal(g.state.journeyStage,1);
 g.state.inv.birch=0;assert.equal(journeyStage(g),1);
 g.world.set(100,65,100,'bench');g.updateJourney();assert.equal(g.state.journeyStage,2);
 g.add('iron_pickaxe');g.updateJourney();assert.equal(g.state.journeyStage,3);
 const loaded=make(g.storage);assert.equal(loaded.state.journeyStage,3);
});
test('realm progression guides the fortress and dragon before the homecoming',()=>{
 const g=make();g.start();g.travel('nether');g.updateJourney();assert.equal(g.state.journeyStage,4);
 assert.equal(g.travel('ender'),false);g.state.fortressCleared=true;g.updateJourney();assert.equal(g.state.journeyStage,5);
 g.travel('ender');g.updateJourney();assert.equal(g.state.journeyStage,6);
 g.state.dragon.defeated=true;g.updateJourney();assert.equal(g.state.journeyStage,7);
 g.travel('nether');g.updateJourney();assert.equal(g.state.journeyStage,7);
 g.travel('overworld');g.updateJourney();assert.equal(g.state.journeyStage,8);
 assert.match(journeyMarkup(g.state),/JOURNEY COMPLETE/);
});
test('creative mode has building guidance and does not earn adventure chapters',()=>{
 const g=make();g.start('creative');g.updateJourney();assert.equal(g.state.journeyStage||0,0);assert.match(journeyMarkup(g.state,true),/CREATIVE STUDIO/);
});
