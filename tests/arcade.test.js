import test from 'node:test';
import assert from 'node:assert/strict';
import {ArcadeRound,ARCADE_MODES,tileColor} from '../src/arcade-round.js';
import {CAMPAIGN,courseGeometry} from '../src/parkour-course.js';
import {World} from '../src/world.js';
const run=(r,seconds)=>{for(let i=0;i<seconds*20&&!r.ended;i++)r.update(.05);};
const random=()=>{let n=872;return()=>((n=Math.imul(n,1664525)+1013904223>>>0)/4294967296);};
test('all arcade rounds have active opponents and finish in bounded time',()=>{
 for(const mode of ARCADE_MODES){const r=new ArcadeRound(mode.id,{random:random()}),before=r.players.slice(1).map(p=>({...p}));run(r,5);assert.ok(r.players.slice(1).some((p,i)=>Math.hypot(p.x-before[i].x,p.z-before[i].z)>.5),mode.id);run(r,100);assert.ok(r.ended,mode.id);}
});
test('AI competes for actual gems and shares their respawn timer with the player',()=>{
 const r=new ArcadeRound('gem-rush',{random:random()});run(r,20);assert.ok(r.players.slice(1).some(p=>p.score>0));assert.ok(r.gems.some(g=>g.ready>0));
 const p=r.players[0],g=r.gems[0];p.x=g.x;p.z=g.z;p.y=13;g.ready=0;const before=p.score;r.update(.05);assert.equal(p.score,before+g.value);r.update(.05);assert.equal(p.score,before+g.value);
});
test('spleef holes eliminate unsupported opponents and cannot be broken at range',()=>{
 const r=new ArcadeRound('spleef',{random:random()});r.countdown=0;const p=r.players[0],q=r.players[1];assert.equal(r.breakTile(100,100,p),false);q.x=p.x+1;q.z=p.z;r.breakTile(q.x,q.z,p);run(r,1.5);assert.equal(q.alive,false);
});
test('color rounds remove only the wrong colors and restore tiles next round',()=>{
 const r=new ArcadeRound('color-drop',{bots:0});r.players.push({...r.players[0],id:1,bot:false});r.countdown=0;r.elapsed=5;r.update(.05);assert.ok(r.removed.size>400);for(const k of r.removed){const[x,z]=k.split(',').map(Number);assert.notEqual(tileColor(x,z),r.color);}r.elapsed=8;r.update(.05);assert.equal(r.removed.size,0);
});
test('combat enforces reach and cooldown, awards kills and respawns combatants',()=>{
 const r=new ArcadeRound('sky-battle');r.countdown=0;const p=r.players[0],q=r.players[1];q.x=100;assert.equal(r.attack(p,q),false);q.x=p.x+1;q.z=p.z;
 for(let i=0;i<4;i++){p.cooldown=0;assert.equal(r.attack(p,q),true);assert.equal(r.attack(p,q),false);}assert.equal(q.alive,false);assert.equal(p.score,1);run(r,2.2);assert.equal(q.alive,true);assert.equal(q.hp,20);
});
test('infection converts players into active hunters and ends when everyone is tagged',()=>{
 const r=new ArcadeRound('infection',{bots:1});r.countdown=0;const [p,q]=r.players;q.x=p.x+1;q.z=p.z;assert.equal(r.attack(q,p),true);assert.equal(p.infected,true);r.update(.05);assert.equal(r.ended,true);
});
test('12 distinct campaign worlds match worker geometry and provide supported checkpoints',()=>{
 assert.equal(CAMPAIGN.length,12);assert.equal(new Set(CAMPAIGN.map(c=>c.seed)).size,12);
 for(const c of CAMPAIGN){const w=new World(c.seed,[],6,'parkour');assert.deepEqual(w.findSpawn(),c.spawn);for(const p of [c.spawn,...c.checkpoints,c.finish])assert.ok(w.solid(Math.floor(p.x),p.y-1,Math.floor(p.z)),c.name);assert.ok(courseGeometry(c.seed).blocks.size>0);}
});

test('human and AI spawn apart so no one can attack before leaving their start',()=>{
 for(const mode of ARCADE_MODES.filter(m=>m.id!=='redlight-rush')){const r=new ArcadeRound(mode.id);for(const p of r.players)for(const q of r.players)if(p!==q)assert.ok(Math.hypot(p.x-q.x,p.z-q.z)>4.5,mode.id);}
});
