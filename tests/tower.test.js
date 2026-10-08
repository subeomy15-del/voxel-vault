import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js?v=43';
import { Parkour } from '../src/parkour.js?v=43';
import { TOWER_WORLDS, CAMPAIGN, COURSES, courseGeometry } from '../src/parkour-course.js?v=43';
import { TOWER_PROFILE_KEY, readTowerProfile } from '../src/tower-rewards.js?v=43';

function harness(){
  const storage={data:new Map(),getItem(k){return this.data.get(k)||null;},setItem(k,v){this.data.set(k,v);}};
  const game=new Game({settings:{particles:'off'},setWorld(){},stream(){},burst(){}},{play(){},quiet(){}},storage);
  return {game,p:new Parkour(game),storage};
}
function visit(game,p,point){game.pos={x:point.x,y:point.y,z:point.z};game.grounded=true;game.velocity=game.vx=game.vz=0;game.frameElapsed=.05;p.update(.05);}

test('tower worlds extend the course registry without replacing the 12-level campaign',()=>{
  assert.equal(CAMPAIGN.length,12);assert.equal(TOWER_WORLDS.length,3);
  for(const world of TOWER_WORLDS){
    assert.equal(COURSES[world.id],world);assert.ok(world.tower);assert.equal(world.stages.length,8);
    assert.equal(new Set(world.stages.map(s=>s.kind)).size,8);
    assert.ok(world.finish.y>world.spawn.y+40);assert.equal(courseGeometry(world.seed),courseGeometry(world.seed));
  }
});
test('each tower requires every floor, awards the summit once, and restores the solo save',()=>{
  const {game,p,storage}=harness();game.state.inv.diamond=7;game.save(true);const solo=structuredClone(game.state);
  for(const world of TOWER_WORLDS){
    assert.equal(p.start(world.id),true);assert.equal(p.towerRuntime.course,world);
    visit(game,p,world.finish);assert.equal(p.timer.finished,false,'cannot skip floors');
    for(const cp of world.checkpoints.slice(1))visit(game,p,cp);
    if(!p.timer.finished)visit(game,p,world.finish);
    assert.equal(p.timer.finished,true,world.id);assert.equal(game.screen,'parkour-results');
    assert.equal(p.summitReward.reward,world.crystalReward);assert.equal(p.summitReward.first,true);
    const saved=storage.getItem(TOWER_PROFILE_KEY);p.finish();assert.equal(storage.getItem(TOWER_PROFILE_KEY),saved,'no duplicate award');
    p.leave();assert.deepEqual(game.state,solo);assert.equal(p.towerRuntime.course,null);
  }
  const profile=readTowerProfile(storage);assert.equal(profile.trophies.length,3);assert.ok(profile.titles.includes('Tower Legend'));
});
test('falling below the current tower floor retries promptly and pause freezes obstacle time',()=>{
  const {game,p}=harness();const world=TOWER_WORLDS[0];p.start(world.id);
  visit(game,p,world.checkpoints[1]);assert.equal(p.checkpoint,1);
  const clock=p.towerRuntime.time;game.screen='pause';p.update(2);assert.equal(p.towerRuntime.time,clock);game.screen=null;
  game.pos.y=world.checkpoints[1].y-5;p.update(.05);assert.equal(p.falls,1);assert.ok(p.respawnTime>0);
  p.update(.2);assert.equal(game.pos.y,world.checkpoints[1].y);p.update(.1);
  assert.equal(p.checkpoint,1);assert.equal(p.respawnTime,0);
});
test('switching between tower and ordinary parkour removes dynamic collision wrappers',()=>{
  const {game,p}=harness();p.start(TOWER_WORLDS[0].id);const world=game.world,original=p.towerRuntime.originalIntersects;
  assert.notEqual(world.intersects,original);p.start(CAMPAIGN[0].id);
  assert.equal(world.intersects,original);assert.equal(p.towerRuntime.course,null);assert.equal(p.course,CAMPAIGN[0]);
});
