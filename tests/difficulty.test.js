import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js?v=34';
import {World} from '../src/world.js?v=34';
import {hash} from '../src/data.js?v=34';
import {tickSurvival} from '../src/survival.js?v=34';
const make=mode=>{const g=new Game({setWorld(){},stream(){},burst(){}},{play(){},quiet(){}},{getItem(){return null;},setItem(){}});g.state.mode=mode;return g;};
test('Adventure increases hostile durability and combat damage but preserves wildlife, hazards and Creative immunity',()=>{
 const hard=make('adventure'),daily=make('daily'),creative=make('creative');
 assert.equal(hard.spawnMob(0,0,'guardian',25).maxHp,252);
 assert.equal(daily.spawnMob(0,0,'guardian',25).maxHp,180);
 assert.equal(hard.spawnMob(0,0,'pig',25).hp,daily.spawnMob(0,0,'pig',25).hp);
 hard.hurt(4,true);daily.hurt(4,true);creative.hurt(4,true);
 assert.equal(hard.state.hp,13.4);assert.equal(daily.state.hp,16);assert.equal(creative.state.hp,20);
 hard.hurtCooldown=0;hard.hurt(4);assert.equal(hard.state.hp,9.4);
});
test('Adventure drains food faster and restores health half as often',()=>{
 const hard=make('adventure'),daily=make('daily');
 for(const g of [hard,daily]){g.sprinting=true;tickSurvival(g,10);}
 assert.equal(hard.state.saturation,4);assert.equal(daily.state.saturation,5);
 for(const g of [hard,daily]){g.sprinting=false;g.state.hp=10;g.state.food=20;g.regenTimer=0;for(let i=0;i<26;i++)tickSurvival(g,.1);}
 assert.equal(hard.state.hp,10);assert.equal(daily.state.hp,11);
});
test('ore sampling across seeds retains every resource with substantially fewer ore blocks',()=>{
 const ores=['coal','iron','gold','diamond'],before=Object.fromEntries(ores.map(k=>[k,0])),after={...before};
 for(const seed of [1,72,7821]){
  const w=new World(seed,[],6);
  for(let x=-72;x<72;x+=3)for(let z=-72;z<72;z+=3)for(const y of [-42,-24,-10]){
   const type=w.get(x,y,z);if(!['stone','granite','limestone','slate','basalt','marble',...ores].includes(type)||y>w.height(x,z)-8)continue;
   const vein=hash(Math.floor(x/3)+Math.floor(y/3)*127,Math.floor(z/3),seed+93),fleck=hash(x+y*117,z-y*43,seed);
   if(fleck<.72){const old=vein<.04&&y<-30?'diamond':vein<.075&&y<-18?'gold':vein<.175?'iron':vein<.235?'coal':null;if(old)before[old]++;}
   if(ores.includes(type))after[type]++;
  }
  w.set(0,-42,0,'diamond_block');assert.equal(w.get(0,-42,0),'diamond_block');
 }
 for(const ore of ores){assert.ok(after[ore]>20,`${ore} remains discoverable`);assert.ok(after[ore]<before[ore]*.7,`${ore} is substantially rarer`);}
 console.log('Ore sample before / after:',JSON.stringify({before,after}));
});
