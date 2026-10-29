import test from 'node:test';
import assert from 'node:assert/strict';
import { developerSpeed, developerFlag, DEVELOPER_CODE } from '../src/developer-tools.js';
import { Game } from '../src/game.js';

const game = () => ({state:{mode:'adventure'},developer:{speed:5,god:true,flight:true,mining:true}});
test('developer speed is bounded and all cheats stop in multiplayer or scored modes', () => {
  const g=game();
  assert.equal(developerSpeed(g),5);
  g.developer.speed=Infinity; assert.equal(developerSpeed(g),10);
  g.developer.speed=-5; assert.equal(developerSpeed(g),1);
  for (const mode of ['multiplayer','parkour','arcade']) {
    const g=game();
    if(mode==='multiplayer')g.multiplayer={room:{}};
    if(mode==='parkour')g.state.mode='parkour';
    if(mode==='arcade')g.arcade={active:true};
    assert.equal(developerSpeed(g),1);
    assert.equal(developerFlag(g,'god'),false);
    assert.equal(developerFlag(g,'flight'),false);
  }
});
test('god mode intercepts damage before health changes', () => {
  const g=game();g.state.hp=20;
  Game.prototype.hurt.call(g,100);
  assert.equal(g.state.hp,20);
  assert.match(DEVELOPER_CODE,/^\d{20}$/);
});
