import {installControlPanels} from '../src/control-panels.js?v=37';
import test from 'node:test';
import assert from 'node:assert/strict';
import {expandedClimate,regionalClimate} from '../src/regional-climate.js?v=37';
import {BIOME_DEFINITIONS} from '../src/biome-registry.js?v=37';
import {freshState,saveState,loadState} from '../src/save.js?v=37';
import {World} from '../src/world.js?v=37';
import {Game} from '../src/game.js?v=37';
import {hotbarIndex,applyLook,clearControls} from '../src/controls.js?v=37';
import {normalizeSettings} from '../src/settings.js?v=37';
import {MOB_VARIATIONS,validVariation,variationColor} from '../src/mob-variations.js?v=37';
import {ENEMIES} from '../src/combat.js?v=37';
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};};
test('all expanded surface biomes generate deterministically and old terrain retains its climate',()=>{
 const found=new Set();
 for(const seed of[7821,42])for(let x=-6000;x<=6000;x+=96)for(let z=-6000;z<=6000;z+=96){const c=expandedClimate(seed,x,z);found.add(c.biome);assert.ok(Number.isFinite(c.h));}
 assert.deepEqual([...found].sort(),Object.keys(BIOME_DEFINITIONS).sort());
 for(const [x,z] of[[1900,730],[-3200,900],[750,2500]]){
  assert.deepEqual(expandedClimate(42,x,z),expandedClimate(42,x,z));
  assert.equal(new World(42,[],9).biome(x,z),regionalClimate(42,x,z).biome);
 }
});
test('nine-slot saves migrate without losing items, all ten slots and terrain versions round-trip',()=>{
 const st=storage(),s=freshState();s.bar=s.bar.slice(0,9);s.selected=8;s.terrain=9;saveState(st,s);
 const migrated=loadState(st);assert.deepEqual(migrated.bar.slice(0,9),s.bar);assert.equal(migrated.bar.length,10);assert.equal(migrated.terrain,9);
 migrated.selected=9;migrated.terrain=10;saveState(st,migrated);assert.equal(loadState(st).selected,9);assert.equal(loadState(st).terrain,10);
 assert.deepEqual(Array.from({length:10},(_,i)=>hotbarIndex('Digit'+((i+1)%10))),Array.from({length:10},(_,i)=>i));assert.equal(hotbarIndex('KeyQ'),-1);
});
test('mob variations are validated and passive appearance survives save/load',()=>{
 for(const [kind,variants]of Object.entries(MOB_VARIATIONS)){assert.ok(ENEMIES[kind],kind);for(const variation of variants)assert.equal(validVariation(kind,variation),variation);}
 assert.equal(validVariation('sheep','invalid'),'default');assert.notEqual(variationColor({kind:'sheep',variation:'blue'},'#fff'),'#fff');
 const st=storage(),s=freshState();s.animals=[{kind:'camel',x:1,y:7,z:1,hp:20,angle:0},{kind:'sheep',variation:'blue',x:2,y:7,z:2,hp:10,angle:0}];saveState(st,s);const loaded=loadState(st);assert.equal(loaded.animals.length,2);assert.equal(loaded.animals[1].variation,'blue');
});
test('look is immediate, pitch bounded, invert persisted and blur clears held inputs',()=>{
 const g={yaw:0,pitch:0,renderer:{settings:{invertY:false}},keys:new Set(['KeyW']),movementInputHeld:new Set(['KeyW']),attackHeld:true};applyLook(g,10,10000);assert.equal(g.yaw,-.032);assert.equal(g.pitch,-1.52);applyLook(g,NaN,2);assert.equal(g.yaw,-.032);
 g.renderer.settings.invertY=true;applyLook(g,0,10);assert.ok(g.pitch> -1.52);clearControls(g);assert.equal(g.keys.size,0);assert.equal(g.movementInputHeld.size,0);assert.equal(g.attackHeld,false);
 const s=normalizeSettings({shirtColor:'#ee2244',skinColor:'bad',invertY:true});assert.equal(s.shirtColor,'#ee2244');assert.equal(s.skinColor,'#d9ae8c');assert.equal(s.invertY,true);
});
test('Q drops remove exactly the requested quantity and cannot change a multiplayer inventory',()=>{
 const g=new Game({setWorld(){},burst(){},stream(){}},{play(){},quiet(){}},storage());g.screen=null;g.state.bar[0]='stone';g.state.selected=0;g.state.inv.stone=8;g.pos={x:.5,y:7,z:10};g.yaw=0;
 assert.equal(g.dropHeld(),true);assert.equal(g.state.inv.stone,7);assert.equal(g.state.drops[0].count,1);
 g.dropHeld(true);assert.equal(g.state.inv.stone,0);assert.equal(g.state.drops[0].count,8);
 g.state.inv.stone=3;g.multiplayer={active:true};assert.equal(g.dropHeld(),false);assert.equal(g.state.inv.stone,3);
});

test('new panels expose the full creature and biome registries and emotes resume play',()=>{
 const g={screen:'explorer',creative:true,state:{elapsed:10},pause(screen){this.screen=screen;}};
 const ui={settings:normalizeSettings(),overlay:{addEventListener(){},innerHTML:''},render(){},action(){},frame:(title,kicker,body)=>title+body,resume(){g.screen=null;}};
 installControlPanels(g,ui,{active:false});ui.render();
 for(const id of Object.keys(ENEMIES).filter(id=>id!=='grazer'))assert.ok(ui.overlay.innerHTML.includes('value="'+id+'"'),id);
 for(const id of Object.keys(BIOME_DEFINITIONS))assert.ok(ui.overlay.innerHTML.includes('visit-biome-'+id),id);
 ui.action('character');assert.ok(ui.overlay.innerHTML.includes('data-setting="skinColor"'));
 ui.action('emote-wave');assert.deepEqual(g.emote,{name:'wave',until:15});assert.equal(g.screen,null);
});
