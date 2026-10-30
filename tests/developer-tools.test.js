import test from 'node:test';
import assert from 'node:assert/strict';
import { developerSpeed, developerFlag, DEVELOPER_CODE } from '../src/developer-tools.js';
import { Game } from '../src/game.js';

const game = () => ({state:{mode:'adventure'},developer:{speed:5,god:true,flight:true,mining:true}});
test('developer speed is bounded and cheats remain active across all modes', () => {
  const g=game();
  assert.equal(developerSpeed(g),5);
  g.developer.speed=Infinity; assert.equal(developerSpeed(g),10);
  g.developer.speed=-5; assert.equal(developerSpeed(g),1);
  for (const mode of ['adventure','creative','daily','ender','oneblock','multiplayer','parkour','arcade','bedwars','manhunt']) {
    const g=game();g.state.mode=mode;
    if(mode==='multiplayer')g.multiplayer={room:{}};
    if(mode==='parkour')g.state.mode='parkour';
    if(mode==='arcade')g.arcade={active:true};
    assert.equal(developerSpeed(g),5);
    assert.equal(developerFlag(g,'god'),true);
    assert.equal(developerFlag(g,'flight'),true);
  }
});
test('god mode intercepts damage before health changes', () => {
  const g=game();g.state.hp=20;
  Game.prototype.hurt.call(g,100);
  assert.equal(g.state.hp,20);
  assert.match(DEVELOPER_CODE,/^\d{20}$/);
});
