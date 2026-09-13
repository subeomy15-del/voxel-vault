import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js?v=26';
import {ENEMIES} from '../src/combat.js?v=26';
const make=()=>new Game({setWorld(){},burst(){},stream(){}},{play(){},quiet(){}},{getItem:()=>null,setItem(){}});
test('new realm mobs have distinct roles and can spawn',()=>{
 for(const kind of ['enderling','void_archer','frost_howler'])assert.ok(ENEMIES[kind]);
 const g=make();g.start();for(const kind of ['enderling','void_archer','frost_howler']){const m=g.spawnMob(3,3,kind,6);assert.equal(m.kind,kind);assert.equal(m.hp,ENEMIES[kind].hp);}
});
