import test from 'node:test';
import assert from 'node:assert/strict';
import {TOWER_PROFILE_KEY,TOWER_TROPHIES,TOWER_MASTER_TITLE,readTowerProfile,awardTowerSummit,towerMedal} from '../src/tower-rewards.js?v=43';

const courses = [
  {id:'tower-prism',crystalReward:120,medalTimes:{gold:150,silver:240,bronze:360}},
  {id:'tower-aurora',crystalReward:180,medalTimes:{gold:180,silver:270,bronze:420}},
  {id:'tower-inferno',crystalReward:260,medalTimes:{gold:210,silver:330,bronze:480}},
];
function memoryStorage(value) {
  const values = new Map(value === undefined ? [] : [[TOWER_PROFILE_KEY,value]]);
  return {values,getItem:key => values.get(key) ?? null,setItem:(key,value) => values.set(key,value)};
}

test('a first summit awards a crown, crystals, title, and saved personal records',() => {
  const storage = memoryStorage();
  const result = awardTowerSummit(storage,courses[0],{time:140,falls:0});
  assert.equal(result.reward,120);
  assert.equal(result.medal,'gold');
  assert.equal(result.first,true);
  assert.equal(result.best,true);
  assert.equal(result.storageFailed,false);
  assert.deepEqual(result.profile.trophies,['tower-prism']);
  assert.deepEqual(result.profile.titles,[TOWER_TROPHIES['tower-prism'].title]);
  assert.deepEqual(result.record,{completions:1,bestTime:140,leastFalls:0,medal:'gold'});
  assert.deepEqual(readTowerProfile(storage),result.profile);
  assert.deepEqual([...storage.values.keys()],[TOWER_PROFILE_KEY]);
});

test('repeat summits earn modest crystals without duplicating collection rewards',() => {
  const storage = memoryStorage();
  awardTowerSummit(storage,courses[0],{time:140,falls:0});
  const result = awardTowerSummit(storage,courses[0],{time:180,falls:2});
  assert.equal(result.reward,20);
  assert.equal(result.first,false);
  assert.equal(result.best,false);
  assert.equal(result.medal,'silver');
  assert.equal(result.profile.crystals,140);
  assert.equal(result.profile.trophies.length,1);
  assert.deepEqual(result.record,{completions:2,bestTime:140,leastFalls:0,medal:'gold'});
});

test('worlds may be completed in any order and all three crowns unlock Tower Legend',() => {
  const storage = memoryStorage();
  for(const course of [...courses].reverse()) awardTowerSummit(storage,course,{time:900,falls:10});
  const profile = readTowerProfile(storage);
  assert.equal(profile.crystals,560);
  assert.deepEqual(profile.trophies,courses.map(course => course.id));
  assert.equal(profile.titles.at(-1),TOWER_MASTER_TITLE);
  assert.equal(profile.titles.length,4);
  assert.equal(new Set(profile.titles).size,4);
});

test('medals reward fast clean runs while every valid summit receives a medal',() => {
  assert.equal(towerMedal(courses[0],150,0),'gold');
  assert.equal(towerMedal(courses[0],151,0),'silver');
  assert.equal(towerMedal(courses[0],100,1),'silver');
  assert.equal(towerMedal(courses[0],240,3),'silver');
  assert.equal(towerMedal(courses[0],241,0),'bronze');
  assert.equal(towerMedal(courses[0],100,4),'bronze');
  assert.equal(towerMedal(courses[0],900,10),'bronze');
  assert.equal(towerMedal(courses[0],Infinity,0),null);
  assert.equal(towerMedal(courses[0],120,-1),null);
});

test('time, falls, and medal records improve independently without losing earlier records',() => {
  const storage = memoryStorage();
  awardTowerSummit(storage,courses[0],{time:300,falls:2});
  let result = awardTowerSummit(storage,courses[0],{time:200,falls:4});
  assert.equal(result.timeBest,true);
  assert.equal(result.fallsBest,false);
  assert.deepEqual(result.record,{completions:2,bestTime:200,leastFalls:2,medal:'bronze'});
  result = awardTowerSummit(storage,courses[0],{time:230,falls:0});
  assert.equal(result.timeBest,false);
  assert.equal(result.fallsBest,true);
  assert.equal(result.best,true);
  assert.deepEqual(result.record,{completions:3,bestTime:200,leastFalls:0,medal:'silver'});
});

test('malformed profiles cannot add unknown worlds, markup titles, or unsafe records',() => {
  const value = '{"crystals":-99,"trophies":["tower-prism","__proto__"],"titles":["<img onerror=alert(1)>"],"worlds":{"tower-prism":{"completions":2,"bestTime":170,"leastFalls":1,"medal":"gold"},"tower-aurora":{"completions":1,"bestTime":"100","leastFalls":0,"medal":"gold"},"__proto__":{"polluted":true},"other-world":{"completions":9,"bestTime":1,"leastFalls":0,"medal":"gold"}}}';
  const profile = readTowerProfile(memoryStorage(value));
  assert.equal(profile.crystals,0);
  assert.deepEqual(Object.keys(profile.worlds),['tower-prism']);
  assert.deepEqual(profile.trophies,['tower-prism']);
  assert.deepEqual(profile.titles,['Prism Pioneer']);
  assert.equal({}.polluted,undefined);
  const malformedMedal = readTowerProfile(memoryStorage('{"worlds":{"tower-prism":{"completions":1,"bestTime":90,"leastFalls":0,"medal":{"toString":null}}}}'));
  assert.equal(malformedMedal.worlds['tower-prism'].medal,'bronze');
  for(const raw of ['not-json','null','[]','false','0','{"worlds":{"tower-prism":{"completions":1,"bestTime":0,"leastFalls":-1}}}']) {
    assert.equal(readTowerProfile(memoryStorage(raw)).trophies.length,0);
  }
});

test('storage errors report an unsaved reward without crashing or overwriting an unread profile',() => {
  let writes = 0;
  const readFailure = {getItem(){throw new Error('blocked');},setItem(){writes++;}};
  const first = awardTowerSummit(readFailure,courses[0],{time:100,falls:0});
  assert.equal(first.storageFailed,true);
  assert.equal(first.reward,120);
  assert.equal(writes,0);
  const writeFailure = {getItem(){return null;},setItem(){throw new Error('quota');}};
  const second = awardTowerSummit(writeFailure,courses[1],{time:100,falls:0});
  assert.equal(second.storageFailed,true);
  assert.equal(second.profile.crystals,180);
  assert.equal(readTowerProfile(readFailure).crystals,0);
  assert.equal(awardTowerSummit(null,courses[0],{time:100,falls:0}).storageFailed,true);
});

test('invalid course IDs or run statistics cannot mint rewards or write a profile',() => {
  const storage = memoryStorage();
  for(const [course,stats] of [
    [{id:'__proto__'},{time:100,falls:0}],
    [{id:'unknown'},{time:100,falls:0}],
    [{id:{toString:null}},{time:100,falls:0}],
    [courses[0],{time:NaN,falls:0}],
    [courses[0],{time:-1,falls:0}],
    [courses[0],{time:100,falls:0.5}],
    [courses[0],null],
  ]) {
    const result = awardTowerSummit(storage,course,stats);
    assert.equal(result.invalid,true);
    assert.equal(result.reward,0);
  }
  assert.equal(storage.values.size,0);
});
