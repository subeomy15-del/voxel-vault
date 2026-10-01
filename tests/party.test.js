import test from 'node:test';
import assert from 'node:assert/strict';
import {ArcadeRound} from '../src/arcade-round.js';
import {PARTY_MODES,partyDash} from '../src/party-rules.js?v=42';
import {ARENAS,courseGeometry} from '../src/parkour-course.js';
const make=id=>{const r=new ArcadeRound(id,{random:()=>.4});r.countdown=0;return r;};
const tick=(r,seconds)=>{for(let i=0;i<seconds*20&&!r.ended;i++)r.update(.05);};
test('all eight party games have mapped arenas and bounded rounds',()=>{
 for(const mode of PARTY_MODES){assert.ok(ARENAS[mode.id]);assert.ok(courseGeometry(ARENAS[mode.id].seed).blocks.size);const r=make(mode.id);tick(r,mode.duration+15);assert.ok(r.ended,mode.id);assert.ok(Array.isArray(r.winners));assert.ok(r.players.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.score)),mode.id);}
});
test('soccer requires ball proximity, kicks with momentum, scores at the right goal, and resets for kickoff',()=>{
 const r=make('block-soccer'),p=r.players[0];assert.equal(r.attack(p,null,{x:0,z:-1}),false);
 p.x=0;p.z=1;assert.equal(r.attack(p,null,{x:0,z:-1}),true);assert.ok(r.ball.vz<0);assert.equal(r.attack(p,null,{x:0,z:-1}),false);
 r.ball.x=0;r.ball.z=-13.49;r.ball.vz=-10;r.update(.05);assert.deepEqual(r.teamScores,[1,0]);assert.equal(r.ball.z,0);assert.equal(r.countdown,2);
 r.teamScores=[5,2];r.end();assert.ok(r.winners.includes(0));assert.ok(r.winners.every(id=>r.players[id].team===0));
});
test('bomb transfers keep their original fuse and block immediate tag-backs',()=>{
 const r=make('bomb-tag'),p=r.players[0],q=r.players[1];r.holder=0;r.fuse=1.5;q.x=p.x+1;q.z=p.z;
 assert.equal(r.attack(p,q),true);assert.equal(r.holder,1);assert.equal(r.fuse,1.5);assert.equal(r.attack(q,p),false);
 r.fuse=.01;r.update(.05);assert.equal(q.alive,false);assert.ok(p.score>=2);assert.notEqual(r.holder,q.id);assert.equal(r.fuse,10);
});
test('rockets travel before exploding, cause outward knockback, and shrinking removes real floor tiles',()=>{
 const r=make('rocket-rumble'),p=r.players[0],q=r.players[1];p.x=0;p.z=0;q.x=0;q.z=-4;for(const bot of r.players.slice(1))bot.bot=false;
 assert.equal(r.attack(p,q,{x:0,z:-1}),true);assert.equal(r.projectiles.length,1);const z=r.projectiles[0].z;r.update(.05);assert.ok(r.projectiles[0].z<z);
 for(const bot of r.players.slice(1))bot.bot=false;
 tick(r,.25);assert.ok(r.blasts.length>0);assert.ok(q.vz<0);assert.equal(q.lastHit,0);
 r.elapsed=20;r.update(.05);assert.equal(r.radius,12);assert.equal(r.solid(14,0),false);assert.equal(r.solid(0,0),true);
});
test('heist points require banking and theft transfers only carried loot',()=>{
 const r=make('coin-heist'),p=r.players[0],q=r.players[1];p.x=r.loot[0].x;p.z=r.loot[0].z;r.update(.05);assert.ok(p.carry>0);assert.equal(p.score,0);
 const count=p.carry;p.x=p.home.x;p.z=p.home.z;r.update(.05);assert.equal(p.score,count);assert.equal(p.carry,0);
 q.x=p.x+1;q.z=p.z;q.carry=4;assert.equal(r.attack(p,q,{x:1,z:0}),true);assert.equal(p.carry,3);assert.equal(q.carry,1);assert.equal(q.score,0);
});
test('meteor warnings give time to escape and a hit respects temporary invulnerability',()=>{
 const r=make('meteor-dodge'),p=r.players[0];r.warnings=[{id:1,x:p.x,z:p.z,radius:4,at:1}];r.nextHazard=99;r.update(.05);assert.equal(p.lives,3);
 r.elapsed=1;r.update(.05);assert.equal(p.lives,2);assert.equal(r.warnings.length,0);
 r.warnings=[{id:2,x:p.x,z:p.z,radius:4,at:1}];r.update(.05);assert.equal(p.lives,2);
});
test('red light allows stillness and jumping in place, catches horizontal movement, and green crossings score',()=>{
 const r=make('redlight-rush'),p=r.players[0];r.elapsed=4.9;p.lastSafe={x:p.x,z:p.z};r.update(.05);assert.equal(p.z,11);
 p.z=8;r.update(.05);assert.equal(p.z,11);assert.ok(r.events.some(e=>e.type==='respawn'&&e.player===0));
 r.elapsed=7;p.z=-12;r.update(.05);assert.equal(p.score,1);assert.equal(p.z,11);
});
test('TNT tiles give a visible grace period before disappearing and airborne players do not crack tiles',()=>{
 const r=make('tnt-run'),p=r.players[0];p.x=0.5;p.z=.5;p.y=15;r.update(.05);assert.equal(r.cracks.has('0,0'),false);
 p.y=13;r.update(.05);assert.equal(r.cracks.has('0,0'),true);assert.equal(r.solid(.5,.5),true);
 p.y=15;tick(r,.7);assert.equal(r.solid(.5,.5),false);
});
test('jumping clears the laser and dash has a cooldown and red-light lockout',()=>{
 const r=make('laser-jump'),p=r.players[0];r.laser=0;p.x=8;p.z=0;p.y=14.5;r.update(.05);assert.equal(p.lives,3);
 r.laser=0;p.y=13;r.update(.05);assert.equal(p.lives,2);
 assert.equal(partyDash(r,p,{x:1,z:0}),true);assert.equal(partyDash(r,p,{x:1,z:0}),false);assert.ok(p.vx>0);
 const red=make('redlight-rush');red.light='RED';assert.equal(partyDash(red,red.players[0],{x:0,z:-1}),false);
});
